/**
 * CO-P0-001 / CO-P0-002 — Enterprise Deal Registry integrity CRUD against Postgres.
 * Validates create → read → update → soft-delete → restore → cleanup against enterprise_deals.
 *
 * Usage: npm run verify:deal-registry:crud
 *        (loads .env.local via package.json --env-file)
 *
 * Exit 0 = all steps passed. Exit 1 = failure (prints step + error).
 * Does not print secrets. Leaves no permanent deal when CLEANUP=1 (default).
 *
 * Scope: local / pilot DB only. Never run against Production customer data.
 */
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();
const CLEANUP = process.env.CLEANUP !== "0";

function assert(step, cond, detail) {
  if (!cond) {
    const err = new Error(`FAIL at ${step}: ${typeof detail === "string" ? detail : JSON.stringify(detail) || "assertion failed"}`);
    err.step = step;
    throw err;
  }
  console.log(JSON.stringify({ step, ok: true, ...(detail !== undefined ? { detail } : {}) }));
}

async function dbVerify(step, dealId, expect) {
  const row = await prisma.enterpriseDeal.findUnique({ where: { id: dealId } });
  const payload = {
    step: `${step}_db_verify`,
    ok: true,
    found: Boolean(row),
    isDeleted: row?.isDeleted ?? null,
    archived: row?.archived ?? null,
    requestedAmount: row ? Number(row.requestedAmount) : null,
    priority: row?.priority ?? null,
    dealNumber: row?.dealNumber ?? null,
  };
  if (expect.mustExist && !row) {
    const err = new Error(`FAIL at ${step}_db_verify: row missing`);
    err.step = `${step}_db_verify`;
    throw err;
  }
  if (expect.mustNotExist && row) {
    const err = new Error(`FAIL at ${step}_db_verify: row still present after cleanup`);
    err.step = `${step}_db_verify`;
    throw err;
  }
  if (expect.isDeleted !== undefined && row && row.isDeleted !== expect.isDeleted) {
    const err = new Error(`FAIL at ${step}_db_verify: isDeleted=${row.isDeleted}`);
    err.step = `${step}_db_verify`;
    throw err;
  }
  if (expect.archived !== undefined && row && row.archived !== expect.archived) {
    const err = new Error(`FAIL at ${step}_db_verify: archived=${row.archived}`);
    err.step = `${step}_db_verify`;
    throw err;
  }
  if (expect.requestedAmount !== undefined && row && Number(row.requestedAmount) !== expect.requestedAmount) {
    const err = new Error(`FAIL at ${step}_db_verify: amount=${row.requestedAmount}`);
    err.step = `${step}_db_verify`;
    throw err;
  }
  console.log(JSON.stringify(payload));
  return row;
}

async function resolveOrgId() {
  const org =
    (await prisma.organization.findFirst({
      where: { slug: "rupee-catalyst", isActive: true },
    })) ??
    (await prisma.organization.findFirst({ where: { isActive: true } }));
  if (!org) {
    const err = new Error("FAIL at resolve_org: no active organization");
    err.step = "resolve_org";
    throw err;
  }
  assert("resolve_org", true, { organizationId: org.id, slug: org.slug ?? null });
  return org.id;
}

async function main() {
  const organizationId = await resolveOrgId();
  const suffix = crypto.randomBytes(4).toString("hex");
  const legacyLoanFileId = `p0-integrity-${suffix}`;
  const dealNumber = `P0-${Date.now().toString(36).toUpperCase()}`;

  // CREATE
  const created = await prisma.enterpriseDeal.create({
    data: {
      organizationId,
      dealNumber,
      legacyLoanFileId,
      productFamily: "lending",
      productLabel: "Home Loan",
      primaryContactName: "P0 Integrity Borrower",
      primaryContactMobile: "9999999999",
      requestedAmount: 2500000,
      grossStage: "lead",
      subStage: "new",
      stageEnteredAt: new Date(),
      lifecycleStatus: "active",
      operationalStatus: "on_track",
      priority: "medium",
      relationshipManagerName: "Integrity Runner",
      createdBy: "co-p0-002-phase2",
      updatedBy: "co-p0-002-phase2",
    },
  });
  assert("create", Boolean(created.id), { dealNumber: created.dealNumber, id: created.id });
  await dbVerify("create", created.id, {
    mustExist: true,
    isDeleted: false,
    archived: false,
    requestedAmount: 2500000,
  });

  // READ
  const byId = await prisma.enterpriseDeal.findUnique({ where: { id: created.id } });
  assert("read_by_id", byId?.id === created.id, byId?.dealNumber);
  const byLegacy = await prisma.enterpriseDeal.findFirst({
    where: { organizationId, legacyLoanFileId },
  });
  assert("read_by_legacy", byLegacy?.id === created.id);
  await dbVerify("read", created.id, { mustExist: true, isDeleted: false });

  // UPDATE
  const updated = await prisma.enterpriseDeal.update({
    where: { id: created.id },
    data: {
      requestedAmount: 2750000,
      priority: "high",
      updatedBy: "co-p0-002-update",
      rowVersion: { increment: 1 },
    },
  });
  assert(
    "update",
    Number(updated.requestedAmount) === 2750000 && updated.priority === "high",
    `amount=${updated.requestedAmount}`,
  );
  await dbVerify("update", created.id, {
    mustExist: true,
    requestedAmount: 2750000,
  });

  // Soft DELETE
  const deleted = await prisma.enterpriseDeal.update({
    where: { id: created.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: "co-p0-002",
      archived: true,
      updatedBy: "co-p0-002-delete",
    },
  });
  assert("soft_delete", deleted.isDeleted === true && deleted.archived === true);

  const activeCount = await prisma.enterpriseDeal.count({
    where: { id: created.id, isDeleted: false, archived: false },
  });
  assert("soft_delete_not_in_active", activeCount === 0);
  await dbVerify("soft_delete", created.id, {
    mustExist: true,
    isDeleted: true,
    archived: true,
  });

  // RESTORE
  const restored = await prisma.enterpriseDeal.update({
    where: { id: created.id },
    data: {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      archived: false,
      updatedBy: "co-p0-002-restore",
    },
  });
  assert("restore", restored.isDeleted === false && restored.archived === false);
  await dbVerify("restore", created.id, {
    mustExist: true,
    isDeleted: false,
    archived: false,
  });

  // Registry list shape (My Deals port filters)
  const listed = await prisma.enterpriseDeal.findMany({
    where: {
      organizationId,
      productFamily: "lending",
      isDeleted: false,
      archived: false,
    },
    take: 100,
    orderBy: { updatedAt: "desc" },
  });
  assert(
    "registry_list_contains",
    listed.some((d) => d.id === created.id),
    `listed=${listed.length}`,
  );

  if (CLEANUP) {
    await prisma.enterpriseDeal.delete({ where: { id: created.id } });
    assert("cleanup_hard_delete", true, { id: created.id });
    await dbVerify("cleanup", created.id, { mustNotExist: true });
  } else {
    console.log(JSON.stringify({ step: "cleanup_skipped", dealId: created.id, dealNumber }));
  }

  const finalActive = await prisma.enterpriseDeal.count({
    where: { isDeleted: false, archived: false },
  });

  console.log(
    JSON.stringify({
      ok: true,
      incident: "CO-P0-002",
      phase: "2_local_crud",
      environment: "local_pilot",
      message: "Enterprise Deal CRUD verified against Postgres enterprise_deals",
      cleanup: CLEANUP ? "hard_delete" : "retained",
      finalActiveDealCount: finalActive,
    }),
  );
}

main()
  .catch((e) => {
    console.error(JSON.stringify({ ok: false, step: e.step || "unknown", error: e.message }));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
