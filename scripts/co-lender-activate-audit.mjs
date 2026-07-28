/**
 * Audit / activate operational lenders in Enterprise Lender Registry.
 *
 * Usage:
 *   node --env-file=.env.local scripts/co-lender-activate-audit.mjs
 *   node --env-file=.env.local scripts/co-lender-activate-audit.mjs --apply
 */
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const ACTOR = "system-co-lender-activate-ops";

/** Leave inactive: discontinued / test / archived / not yet onboarded. */
function shouldRemainInactive(row) {
  if (row.isDeleted) return { skip: true, reason: "deleted" };
  if (row.lifecycleStatus === "retired") return { skip: true, reason: "retired" };
  if (row.lifecycleStatus === "suspended") return { skip: true, reason: "suspended" };
  if (row.status === "archived") return { skip: true, reason: "archived_status" };

  const hay = [
    row.code,
    row.label,
    row.displayName,
    row.shortName,
    row.legalName,
    ...(Array.isArray(row.aliases) ? row.aliases : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(test|demo|uat|sample|training|dummy|placeholder)\b/.test(hay)) {
    return { skip: true, reason: "test_or_demo" };
  }
  if (/\b(discontinued|archived|retired|decommissioned)\b/.test(hay)) {
    return { skip: true, reason: "discontinued_label" };
  }
  if (/^bf[_-]/.test((row.code || "").trim().toLowerCase())) {
    return { skip: true, reason: "provisional_bf" };
  }
  if (/^lnd[-_]p2a[-_]/.test((row.code || "").trim().toLowerCase())) {
    return { skip: true, reason: "phase2a_test_fixture" };
  }
  if (row.lifecycleStatus === "onboarding" || row.lifecycleStatus === "draft") {
    // Still activate if they look like real catalog lenders (seed-imported drafts).
    // Explicit "not yet onboarded" only when lifecycle is onboarding AND label says so,
    // or operationalStatus restricted with no other active signals — treated as activate
    // for operational inventory unless marked otherwise above.
  }
  return { skip: false };
}

function isPickerEligible(row) {
  return (
    !row.isDeleted &&
    row.status === "active" &&
    row.enabled === true &&
    row.lifecycleStatus === "active" &&
    (!row.operationalStatus || row.operationalStatus === "active")
  );
}

const prisma = new PrismaClient();

try {
  const all = await prisma.enterpriseLender.findMany({
    where: {},
    select: {
      id: true,
      code: true,
      label: true,
      displayName: true,
      shortName: true,
      legalName: true,
      aliases: true,
      status: true,
      enabled: true,
      lifecycleStatus: true,
      operationalStatus: true,
      isDeleted: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });

  const summary = {
    total: all.length,
    deleted: all.filter((r) => r.isDeleted).length,
    byStatus: {},
    byLife: {},
    byOps: {},
    byEnabled: { true: 0, false: 0 },
    pickerEligibleBefore: 0,
  };

  for (const r of all) {
    if (r.isDeleted) continue;
    summary.byStatus[r.status] = (summary.byStatus[r.status] || 0) + 1;
    summary.byLife[r.lifecycleStatus] = (summary.byLife[r.lifecycleStatus] || 0) + 1;
    summary.byOps[r.operationalStatus] = (summary.byOps[r.operationalStatus] || 0) + 1;
    summary.byEnabled[r.enabled ? "true" : "false"] += 1;
    if (isPickerEligible(r)) summary.pickerEligibleBefore += 1;
  }

  const toActivate = [];
  const remainInactive = [];
  const alreadyActive = [];

  for (const r of all) {
    if (r.isDeleted) {
      remainInactive.push({ ...r, reason: "deleted" });
      continue;
    }
    const decision = shouldRemainInactive(r);
    if (decision.skip) {
      remainInactive.push({ ...r, reason: decision.reason });
      continue;
    }
    if (isPickerEligible(r)) {
      alreadyActive.push(r);
      continue;
    }
    toActivate.push(r);
  }

  console.log(
    JSON.stringify(
      {
        apply: APPLY,
        summary,
        alreadyActive: alreadyActive.length,
        toActivate: toActivate.length,
        remainInactive: remainInactive.length,
        remainInactiveBreakdown: remainInactive.reduce((acc, r) => {
          acc[r.reason] = (acc[r.reason] || 0) + 1;
          return acc;
        }, {}),
        toActivateSample: toActivate.slice(0, 30).map((r) => ({
          code: r.code,
          label: r.label,
          status: r.status,
          enabled: r.enabled,
          lifecycleStatus: r.lifecycleStatus,
          operationalStatus: r.operationalStatus,
        })),
        remainInactiveSample: remainInactive.slice(0, 30).map((r) => ({
          code: r.code,
          label: r.label,
          reason: r.reason,
          status: r.status,
          lifecycleStatus: r.lifecycleStatus,
        })),
      },
      null,
      2,
    ),
  );

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to activate.");
    process.exit(0);
  }

  let activated = 0;
  for (const r of toActivate) {
    await prisma.enterpriseLender.update({
      where: { id: r.id },
      data: {
        status: "active",
        enabled: true,
        lifecycleStatus: "active",
        operationalStatus: "active",
        modifiedBy: ACTOR,
        // Do not touch code, label, metadata, products, programmes.
      },
    });
    activated += 1;
  }

  const pickerEligibleAfter = await prisma.enterpriseLender.count({
    where: {
      isDeleted: false,
      status: "active",
      enabled: true,
      lifecycleStatus: "active",
      OR: [{ operationalStatus: "active" }, { operationalStatus: null }],
    },
  });

  console.log(
    JSON.stringify(
      {
        activated,
        alreadyActive: alreadyActive.length,
        remainInactive: remainInactive.filter((r) => !r.isDeleted).length,
        pickerEligibleAfter,
        operationalInventory: alreadyActive.length + activated,
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
