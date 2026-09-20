import assert from "node:assert/strict";

const APPROVED_DATABASE = "catalyst_one_local_uat";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function assertLocalDatasource(name) {
  const raw = process.env[name];
  if (!raw) {
    if (name === "DATABASE_URL") throw new Error(`${name} is required.`);
    return;
  }
  const parsed = new URL(raw);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  assert(LOOPBACK_HOSTS.has(parsed.hostname), `${name} must use a loopback host.`);
  assert.equal(database, APPROVED_DATABASE, `${name} must select the approved local UAT database.`);
}

assertLocalDatasource("DATABASE_URL");
assertLocalDatasource("DIRECT_URL");
assert.notEqual(process.env.PRISMA_MIGRATE_DEPLOY_ON_BUILD, "true");
assert.notEqual(process.env.PRISMA_MIGRATE_DEPLOY_ON_BUILD, "1");
process.env.ENTERPRISE_PERSISTENCE_MODE = "prisma";

const [{ prisma }, consolidation, organizationRepo, serviceModule, tokenModule, routeModule] = await Promise.all([
  import("../server/lib/prisma.ts"),
  import("../server/repositories/lender-registry/lender-consolidation.repository.ts"),
  import("../server/repositories/ecm/organization.repository.ts"),
  import("../server/services/lender-registry/lender-registry.service.ts"),
  import("../server/services/token.service.ts"),
  import("../src/app/api/lender-registry/lenders/merge/route.ts"),
]);

const { previewLenderMerge, executeLenderMerge } = consolidation;
const { lenderRegistryService } = serviceModule;
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const actor = `local-merge-test-${runId}`;
const ids = { organizations: [], categories: [], lenders: [], contacts: [], opportunities: [], deals: [], priorities: [] };
const result = {};

function passed(name) { result[name] = "PASS"; }
async function expectRejected(action, pattern) {
  await assert.rejects(action, pattern);
}

async function createLender(organizationId, categoryId, label) {
  const lender = await prisma.enterpriseLender.create({
    data: {
      organizationId,
      categoryId,
      code: `TEST-${runId}-${ids.lenders.length}`,
      label,
      institutionCategory: "bank",
      lifecycleStatus: "active",
      operationalStatus: "active",
      status: "active",
      enabled: true,
      createdBy: actor,
      modifiedBy: actor,
    },
  });
  ids.lenders.push(lender.id);
  return lender;
}

async function cleanup() {
  // Every predicate is limited to IDs created in this run.
  if (ids.lenders.length) {
    await prisma.enterpriseRegistryAuditEntry.deleteMany({ where: { entityId: { in: ids.lenders } } });
  }
  if (ids.contacts.length) await prisma.enterpriseLenderContact.deleteMany({ where: { id: { in: ids.contacts } } });
  if (ids.priorities.length) await prisma.enterpriseProductLenderPriority.deleteMany({ where: { id: { in: ids.priorities } } });
  if (ids.deals.length) await prisma.enterpriseDeal.deleteMany({ where: { id: { in: ids.deals } } });
  if (ids.opportunities.length) await prisma.enterpriseOpportunity.deleteMany({ where: { id: { in: ids.opportunities } } });
  if (ids.lenders.length) await prisma.enterpriseLender.deleteMany({ where: { id: { in: ids.lenders } } });
  if (ids.categories.length) await prisma.enterpriseLenderCategory.deleteMany({ where: { id: { in: ids.categories } } });
  if (ids.organizations.length) await prisma.organization.deleteMany({ where: { id: { in: ids.organizations } } });
}

try {
  const organizationId = await organizationRepo.resolvePilotOrganizationId();
  const category = await prisma.enterpriseLenderCategory.create({
    data: { organizationId, code: `TEST-CAT-${runId}`, label: "TEST LENDER CATEGORY", status: "active", createdBy: actor, modifiedBy: actor },
  });
  ids.categories.push(category.id);

  const canonical = await createLender(organizationId, category.id, "TEST LENDER CANONICAL");
  const duplicate = await createLender(organizationId, category.id, "TEST LENDER DUPLICATE");
  const contact = await prisma.enterpriseLenderContact.create({
    data: { organizationId, lenderId: duplicate.id, name: "TEST LENDER CONTACT", createdBy: actor, modifiedBy: actor },
  });
  ids.contacts.push(contact.id);
  const opportunity = await prisma.enterpriseOpportunity.create({
    data: {
      organizationId, opportunityNumber: `TEST-OPP-${runId}`, productFamily: "lending",
      requirementStage: "test", stageEnteredAt: new Date(), createdBy: actor,
    },
  });
  ids.opportunities.push(opportunity.id);
  const deal = await prisma.enterpriseDeal.create({
    data: {
      organizationId, dealNumber: `TEST-DEAL-${runId}`, opportunityId: opportunity.id,
      lenderId: duplicate.id, productFamily: "lending", grossStage: "test",
      stageEnteredAt: new Date(), createdBy: actor,
    },
  });
  ids.deals.push(deal.id);

  const beforePreview = await prisma.enterpriseLender.findMany({
    where: { id: { in: [canonical.id, duplicate.id] } },
    select: { id: true, updatedAt: true, status: true, enabled: true, versionNumber: true }, orderBy: { id: "asc" },
  });
  const preview = await previewLenderMerge(organizationId, duplicate.id, canonical.id);
  assert.equal(preview.source.id, duplicate.id);
  assert.equal(preview.target.id, canonical.id);
  assert.equal(preview.source.counts.deals, 1);
  assert.equal(preview.source.counts.linkedOpportunities, 1);
  assert.equal(preview.source.counts.contacts, 1);
  assert.deepEqual(await prisma.enterpriseLender.findMany({
    where: { id: { in: [canonical.id, duplicate.id] } },
    select: { id: true, updatedAt: true, status: true, enabled: true, versionNumber: true }, orderBy: { id: "asc" },
  }), beforePreview);
  passed("mergePreview");

  const merged = await executeLenderMerge({ organizationId, sourceId: duplicate.id, targetId: canonical.id, actorUserId: actor, reason: "Synthetic local UAT transaction test" });
  assert.equal(merged.sourceRetired, true);
  assert.equal((await prisma.enterpriseLenderContact.findUniqueOrThrow({ where: { id: contact.id } })).lenderId, canonical.id);
  const persistedDeal = await prisma.enterpriseDeal.findUniqueOrThrow({ where: { id: deal.id } });
  assert.equal(persistedDeal.lenderId, canonical.id);
  assert.equal(persistedDeal.opportunityId, opportunity.id);
  assert(await prisma.enterpriseOpportunity.findUnique({ where: { id: opportunity.id } }));
  const retired = await prisma.enterpriseLender.findUniqueOrThrow({ where: { id: duplicate.id } });
  assert.equal(retired.lifecycleStatus, "retired");
  assert.equal(retired.operationalStatus, "inactive");
  assert.equal(retired.enabled, false);
  passed("dependencyRepoint"); passed("dealPreservation"); passed("opportunityLinkage");

  const collisionSource = await createLender(organizationId, category.id, "TEST LENDER COLLISION SOURCE");
  const collisionTarget = await createLender(organizationId, category.id, "TEST LENDER COLLISION TARGET");
  for (const [lenderId, rank] of [[collisionSource.id, 1], [collisionTarget.id, 2]]) {
    const row = await prisma.enterpriseProductLenderPriority.create({ data: { organizationId, productFamily: `TEST-${runId}`, lenderId, priorityRank: rank, createdBy: actor, modifiedBy: actor } });
    ids.priorities.push(row.id);
  }
  const collisionBefore = await prisma.enterpriseLender.findMany({ where: { id: { in: [collisionSource.id, collisionTarget.id] } }, orderBy: { id: "asc" } });
  await expectRejected(() => executeLenderMerge({ organizationId, sourceId: collisionSource.id, targetId: collisionTarget.id, actorUserId: actor, reason: "collision test" }), /blocked/i);
  assert.deepEqual(await prisma.enterpriseLender.findMany({ where: { id: { in: [collisionSource.id, collisionTarget.id] } }, orderBy: { id: "asc" } }), collisionBefore);
  assert.equal(await prisma.enterpriseProductLenderPriority.count({ where: { id: { in: ids.priorities } } }), 2);
  passed("collision");

  const rollbackSource = await createLender(organizationId, category.id, "TEST LENDER ROLLBACK SOURCE");
  const rollbackTarget = await createLender(organizationId, category.id, "TEST LENDER ROLLBACK TARGET");
  const rollbackContact = await prisma.enterpriseLenderContact.create({ data: { organizationId, lenderId: rollbackSource.id, name: "TEST ROLLBACK CONTACT", createdBy: actor, modifiedBy: actor } });
  ids.contacts.push(rollbackContact.id);
  await expectRejected(() => prisma.$transaction(async (tx) => {
    await tx.enterpriseLenderContact.updateMany({ where: { organizationId, lenderId: rollbackSource.id }, data: { lenderId: rollbackTarget.id } });
    throw new Error("controlled local UAT rollback");
  }), /controlled local UAT rollback/);
  assert.equal((await prisma.enterpriseLenderContact.findUniqueOrThrow({ where: { id: rollbackContact.id } })).lenderId, rollbackSource.id);
  passed("atomicRollback");

  await expectRejected(() => previewLenderMerge(organizationId, canonical.id, canonical.id), /different/i);
  passed("sourceEqualsTarget");

  const otherOrg = await prisma.organization.create({ data: { slug: `test-merge-${runId}`, name: "TEST MERGE ORGANIZATION" } });
  ids.organizations.push(otherOrg.id);
  const otherCategory = await prisma.enterpriseLenderCategory.create({ data: { organizationId: otherOrg.id, code: `TEST-CAT-${runId}`, label: "TEST OTHER CATEGORY", createdBy: actor, modifiedBy: actor } });
  ids.categories.push(otherCategory.id);
  const otherLender = await createLender(otherOrg.id, otherCategory.id, "TEST LENDER OTHER ORGANIZATION");
  await expectRejected(() => previewLenderMerge(organizationId, canonical.id, otherLender.id), /authorized organization/i);
  passed("crossOrganization");

  const token = tokenModule.signAccessToken({ userId: actor, email: "merge-test@catalyst-uat.invalid", role: "EMPLOYEE" });
  const authResponse = await routeModule.POST(new Request("http://localhost/api/lender-registry/lenders/merge", {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ sourceLenderId: canonical.id, targetLenderId: rollbackTarget.id, execute: false }),
  }));
  assert.equal(authResponse.status, 403);
  passed("authorization");

  const deleteBlocked = await createLender(organizationId, category.id, "TEST LENDER DELETE BLOCKED");
  const deleteContact = await prisma.enterpriseLenderContact.create({ data: { organizationId, lenderId: deleteBlocked.id, name: "TEST DELETE CONTACT", createdBy: actor, modifiedBy: actor } });
  ids.contacts.push(deleteContact.id);
  await expectRejected(() => lenderRegistryService.softDeleteLender(deleteBlocked.id, actor, "test", "Local UAT"), /Merge it into a canonical lender/i);
  assert.equal((await prisma.enterpriseLender.findUniqueOrThrow({ where: { id: deleteBlocked.id } })).isDeleted, false);
  passed("deleteSafety");

  console.log("LOCAL_UAT_DATABASE_SAFETY=PASS");
  for (const [name, status] of Object.entries(result)) console.log(`${name}=${status}`);
} finally {
  await cleanup();
  const remaining = await prisma.enterpriseLender.count({ where: { id: { in: ids.lenders } } });
  assert.equal(remaining, 0, "Synthetic lender cleanup was incomplete.");
  console.log("syntheticCleanup=PASS");
  await prisma.$disconnect();
}
