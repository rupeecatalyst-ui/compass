/**
 * Marketing Campaign durability — persistence, organization isolation, demo idempotency.
 * Live bulk send must remain disabled. Does not migrate production.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

assert.ok(existsSync(join(root, "prisma/migrations/20260901080000_co_marketing_campaign_durability/migration.sql")));
const migration = read("prisma/migrations/20260901080000_co_marketing_campaign_durability/migration.sql");
assert.match(migration, /CREATE TABLE "enterprise_marketing_campaigns"/);
assert.match(migration, /emc_org_demo_uidx/);
assert.doesNotMatch(migration, /\bDROP\b/i);
assert.doesNotMatch(migration, /\bTRUNCATE\b/i);
assert.doesNotMatch(migration, /RENAME COLUMN/i);

const store = read("server/services/enterprise-marketing-engine/campaign-store.ts");
assert.match(store, /isEnterprisePersistencePrisma/);
assert.match(store, /ensureProductOwnerDemoCampaign/);
assert.match(store, /enterpriseMarketingCampaign/);
assert.match(store, /MARKETING_PO_DEMO_KEY/);

const service = read("server/services/enterprise-marketing-engine/campaign.service.ts");
assert.match(service, /ORGANIZATION_REQUIRED/);
assert.doesNotMatch(service, /return \(actorOrg \?\? ""\)\.trim\(\) \|\| "default"/);

const campaignsApi = read("src/app/api/admin/marketing/campaigns/route.ts");
assert.match(campaignsApi, /resolveMarketingOrganizationId/);
assert.doesNotMatch(campaignsApi, /organizationId: "default"/);

const safety = read("src/constants/enterprise-marketing-engine/safety.ts");
assert.match(safety, /ENTERPRISE_MARKETING_EXECUTION_ENABLED = false/);

const demo = read("src/constants/enterprise-marketing-engine/demo-campaign.ts");
assert.match(demo, /Rupee Catalyst Product Owner Demo Campaign/);
assert.match(demo, /DEMONSTRATION \/ TESTING CAMPAIGN/);

const schema = read("prisma/schema.prisma");
assert.match(schema, /model EnterpriseMarketingCampaign /);
assert.match(schema, /demoKey/);

console.log("OK: static Marketing durability gates");

const prismaMode = (process.env.ENTERPRISE_PERSISTENCE_MODE ?? "").trim().toLowerCase() === "prisma";
if (!prismaMode || !process.env.DATABASE_URL) {
  console.log("SKIP runtime: set ENTERPRISE_PERSISTENCE_MODE=prisma and DATABASE_URL for isolated DB proof");
  process.exit(0);
}

const { PrismaClient } = await import("@prisma/client");
const {
  ensureProductOwnerDemoCampaign,
  marketingCampaignStore,
} = await import("../server/services/enterprise-marketing-engine/campaign-store.ts");
const { MARKETING_PO_DEMO_KEY, MARKETING_PO_DEMO_NAME } = await import(
  "../src/constants/enterprise-marketing-engine/demo-campaign.ts"
);

const prisma = new PrismaClient();
const suffix = `${Date.now()}`;
const orgA = await prisma.organization.create({
  data: { slug: `mkt-durability-a-${suffix}`, name: `MKT Durability A ${suffix}` },
});
const orgB = await prisma.organization.create({
  data: { slug: `mkt-durability-b-${suffix}`, name: `MKT Durability B ${suffix}` },
});

try {
  const first = await ensureProductOwnerDemoCampaign(orgA.id);
  const second = await ensureProductOwnerDemoCampaign(orgA.id);
  assert.equal(first.id, second.id, "demo campaign must be idempotent per organization");
  assert.equal(first.name, MARKETING_PO_DEMO_NAME);
  assert.equal(first.status, "DRAFT");
  assert.equal(first.schedulePlaceholder?.enabled, false);

  const listedA = await marketingCampaignStore.list(orgA.id);
  const demosA = listedA.filter((c) => c.name === MARKETING_PO_DEMO_NAME);
  assert.equal(demosA.length, 1, "exactly one demo campaign for org A");

  const listedB = await marketingCampaignStore.list(orgB.id);
  assert.equal(
    listedB.some((c) => c.id === first.id),
    false,
    "org B must not see org A demo campaign",
  );
  const demosB = listedB.filter((c) => c.name === MARKETING_PO_DEMO_NAME);
  assert.equal(demosB.length, 1);
  assert.notEqual(demosB[0].id, first.id);

  const created = await marketingCampaignStore.create({
    organizationId: orgA.id,
    name: `Operator campaign ${suffix}`,
    createdByUserId: "verify:marketing-durability",
  });
  const rows = await prisma.enterpriseMarketingCampaign.findMany({
    where: { organizationId: orgA.id },
  });
  assert.ok(rows.some((r) => r.id === created.campaign.id), "operator campaign persisted in PostgreSQL");
  assert.ok(rows.some((r) => r.demoKey === MARKETING_PO_DEMO_KEY), "demo_key persisted");

  const otherOrgRows = await prisma.enterpriseMarketingCampaign.findMany({
    where: { organizationId: orgB.id, id: created.campaign.id },
  });
  assert.equal(otherOrgRows.length, 0, "operator campaign is organization-scoped");

  console.log("OK: prisma persistence, restart-independent rows, org isolation, demo idempotency");
  console.log(`DEMO_CAMPAIGN_ID_ORG_A=${first.id}`);
} finally {
  await prisma.enterpriseMarketingCampaignVersion.deleteMany({
    where: { organizationId: { in: [orgA.id, orgB.id] } },
  });
  await prisma.enterpriseMarketingCampaign.deleteMany({
    where: { organizationId: { in: [orgA.id, orgB.id] } },
  });
  await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  await prisma.$disconnect();
}
