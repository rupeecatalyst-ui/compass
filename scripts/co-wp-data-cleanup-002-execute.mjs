/**
 * CO-WP-DATA-CLEANUP-002 — Soft-archive confirmed ACCESS certification test business data.
 *
 * Product Owner authorized. Uses EXACT IDs from CO-WP-DATA-CLEANUP-001 inventory.
 * Soft-delete only (isDeleted). No truncate / reset / partner-ID bulk delete.
 * Does NOT delete PartnerEntitlementAudit rows.
 * Does NOT deactivate cert users/partners (review only).
 * Does NOT change application code.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

if (!process.env.DATABASE_URL) {
  console.error("STOP: DATABASE_URL missing");
  process.exit(2);
}

const prisma = new PrismaClient();

const REASON = "CO-WP-DATA-CLEANUP-002: soft-archive ACCESS certification test fixture";
const ACTOR = "co-wp-data-cleanup-002";

/** Exact audited Opportunity IDs from CLEANUP-001 (accepted by PO). */
const TARGET_OPP_IDS = [
  "cmsljz1ep000bweekeln9ikg7",
  "cmsljz25h000dweekzqxd1223",
  "cmsljz2vh000fweek0rzpd2qj",
  "cmsljz3l8000hweeklhv65sg4",
  "cmslkuflz0001wez4el74xaym",
  "cmslkugod0003wez48oa4pt5x",
  "cmslkuhgs0005wez48r5c7xbs",
  "cmslkuib70007wez493u9c0uf",
  "cmslm0svo0001wedsvmh3chmz",
  "cmslm0tlg0003wedsm35w17xy",
  "cmslm0u8z0005wedsrp8vcvph",
  "cmslm0uwe0007wedstm3wsuct",
  "cmslmi70n0001wem8pdysew0w",
  "cmslmi7tr0003wem8cwf3jo32",
  "cmslmi8ha0005wem8vr0r2up1",
  "cmslmi9ca0007wem8wwx4zgig",
  "cmslmw6tw0001wedstfh9lyit",
  "cmslmw7h50003wedsia9d68u6",
  "cmslmw84w0005wedsr5mf7sde",
  "cmslmw8rd0007wedsfl10u7j2",
];

/** Exact audited Deal IDs from CLEANUP-001. */
const TARGET_DEAL_IDS = [
  "cmsljz4jm000jweekoky7s9p0",
  "cmsljz5wv000lweek9wghsq92",
  "cmslkujir0009wez4pmtj0zn4",
  "cmslkuksr000bwez41a1l3ost",
  "cmslm0vud0009wedsqzpr6qaw",
  "cmslm0wta000bwedsjbqstus1",
  "cmslmiagj0009wem8x5w1av2q",
  "cmslmiblg000bwem8jtx8ub42",
  "cmslmw9oj0009wedsy9l1hwgs",
  "cmslmwam6000bwedswbic0i8x",
];

const CERT_PARTNER_IDS = [
  "cmsljyws50005weeka0js9u4t",
  "cmsljyzhu0009weekfeq2rsv9",
];

const CERT_LABELS = [
  "Cert A Referral",
  "Cert A Override Edit",
  "Cert A ViewOnly",
  "Cert B Solo",
];
const CERT_CUSTOMERS = CERT_LABELS.map((l) => `${l} Customer`);

function sortedEq(a, b) {
  const aa = [...a].sort();
  const bb = [...b].sort();
  if (aa.length !== bb.length) return false;
  return aa.every((v, i) => v === bb[i]);
}

function fingerprint(rows) {
  const payload = rows
    .map((r) => `${r.id}|${r.updatedAt?.toISOString?.() || r.updatedAt}|${r.isDeleted}`)
    .sort()
    .join("\n");
  return createHash("sha256").update(payload).digest("hex");
}

async function main() {
  const now = new Date();
  const report = {
    sprint: "CO-WP-DATA-CLEANUP-002",
    generatedAt: now.toISOString(),
    mode: "SOFT_ARCHIVE_AUTHORIZED",
    mutations: [],
    exceptions: [],
    stopped: false,
  };

  // ─── 1. PRE-CLEANUP SAFETY CHECK ─────────────────────────────────────
  const liveOpps = await prisma.enterpriseOpportunity.findMany({
    where: { id: { in: TARGET_OPP_IDS } },
    select: {
      id: true,
      opportunityNumber: true,
      primaryContactName: true,
      productLabel: true,
      sourceWealthPartnerId: true,
      snapshot: true,
      isDeleted: true,
      archived: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const liveDeals = await prisma.enterpriseDeal.findMany({
    where: { id: { in: TARGET_DEAL_IDS } },
    select: {
      id: true,
      dealNumber: true,
      opportunityId: true,
      productLabel: true,
      isDeleted: true,
      archived: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const liveOppIds = liveOpps.map((o) => o.id);
  const liveDealIds = liveDeals.map((d) => d.id);

  if (!sortedEq(liveOppIds, TARGET_OPP_IDS)) {
    report.stopped = true;
    report.exceptions.push({
      code: "OPP_ID_MISMATCH",
      expected: TARGET_OPP_IDS,
      found: liveOppIds,
      missing: TARGET_OPP_IDS.filter((id) => !liveOppIds.includes(id)),
      unexpected: liveOppIds.filter((id) => !TARGET_OPP_IDS.includes(id)),
    });
    await finish(report, 3);
    return;
  }

  if (!sortedEq(liveDealIds, TARGET_DEAL_IDS)) {
    report.stopped = true;
    report.exceptions.push({
      code: "DEAL_ID_MISMATCH",
      expected: TARGET_DEAL_IDS,
      found: liveDealIds,
      missing: TARGET_DEAL_IDS.filter((id) => !liveDealIds.includes(id)),
      unexpected: liveDealIds.filter((id) => !TARGET_DEAL_IDS.includes(id)),
    });
    await finish(report, 3);
    return;
  }

  // Already soft-deleted? Still OK if fingerprints match — skip re-write or re-apply reason.
  const alreadyDeletedOpps = liveOpps.filter((o) => o.isDeleted);
  const alreadyDeletedDeals = liveDeals.filter((d) => d.isDeleted);

  for (const o of liveOpps) {
    const snapCert = o.snapshot && typeof o.snapshot === "object" ? o.snapshot.cert : null;
    const okName = CERT_CUSTOMERS.includes(o.primaryContactName || "");
    const okLabel = CERT_LABELS.includes(o.productLabel || "");
    const okPartner = CERT_PARTNER_IDS.includes(o.sourceWealthPartnerId || "");
    const okSnap = snapCert === "CO-WP-ACCESS-002";
    if (!(okName && okLabel && okPartner && okSnap)) {
      report.stopped = true;
      report.exceptions.push({
        code: "FINGERPRINT_FAIL",
        opportunityId: o.id,
        primaryContactName: o.primaryContactName,
        productLabel: o.productLabel,
        sourceWealthPartnerId: o.sourceWealthPartnerId,
        snapshotCert: snapCert,
      });
    }
  }
  if (report.stopped) {
    await finish(report, 3);
    return;
  }

  for (const d of liveDeals) {
    if (!TARGET_OPP_IDS.includes(d.opportunityId || "")) {
      report.stopped = true;
      report.exceptions.push({
        code: "DEAL_OPP_LINK_FAIL",
        dealId: d.id,
        opportunityId: d.opportunityId,
      });
    }
    if (!["Cert Deal A", "Cert Deal B"].includes(d.productLabel || "")) {
      report.stopped = true;
      report.exceptions.push({
        code: "DEAL_LABEL_FAIL",
        dealId: d.id,
        productLabel: d.productLabel,
      });
    }
  }
  if (report.stopped) {
    await finish(report, 3);
    return;
  }

  const beforeOppActive = await prisma.enterpriseOpportunity.count({
    where: { isDeleted: false },
  });
  const beforeDealActive = await prisma.enterpriseDeal.count({
    where: { isDeleted: false },
  });
  const beforeEntitlementAudits = await prisma.partnerEntitlementAudit.count();

  // Genuine opportunities fingerprint (all active not in target set)
  const genuineBefore = await prisma.enterpriseOpportunity.findMany({
    where: { isDeleted: false, id: { notIn: TARGET_OPP_IDS } },
    select: { id: true, updatedAt: true, isDeleted: true, opportunityNumber: true },
    orderBy: { id: "asc" },
  });
  const genuineDealBefore = await prisma.enterpriseDeal.findMany({
    where: { isDeleted: false, id: { notIn: TARGET_DEAL_IDS } },
    select: { id: true, updatedAt: true, isDeleted: true, dealNumber: true },
    orderBy: { id: "asc" },
  });
  const genuineOppFpBefore = fingerprint(genuineBefore);
  const genuineDealFpBefore = fingerprint(genuineDealBefore);

  report.A_targetIdsBeforeCleanup = {
    opportunities: liveOpps.map((o) => ({
      id: o.id,
      opportunityNumber: o.opportunityNumber,
      customer: o.primaryContactName,
      product: o.productLabel,
      sourceWealthPartnerId: o.sourceWealthPartnerId,
      isDeleted: o.isDeleted,
    })),
    deals: liveDeals.map((d) => ({
      id: d.id,
      dealNumber: d.dealNumber,
      opportunityId: d.opportunityId,
      productLabel: d.productLabel,
      isDeleted: d.isDeleted,
    })),
    alreadySoftDeletedOpps: alreadyDeletedOpps.map((o) => o.id),
    alreadySoftDeletedDeals: alreadyDeletedDeals.map((d) => d.id),
  };

  // ─── 2. DEPENDENCY RE-CHECK ──────────────────────────────────────────
  const notes = await prisma.enterpriseBusinessNote.findMany({
    where: {
      isDeleted: false,
      OR: [
        { opportunityId: { in: TARGET_OPP_IDS } },
        { entityId: { in: TARGET_OPP_IDS } },
        { dealId: { in: TARGET_DEAL_IDS } },
      ],
    },
    select: {
      id: true,
      opportunityId: true,
      dealId: true,
      entityId: true,
      entityKind: true,
      category: true,
      createdAt: true,
    },
  });

  const documents = await prisma.enterpriseTransactionDocument.findMany({
    where: { opportunityId: { in: TARGET_OPP_IDS } },
    select: {
      id: true,
      opportunityId: true,
      displayName: true,
      originalFilename: true,
      status: true,
      createdAt: true,
    },
  });

  // Deal-scoped children (soft-delete deal is enough for registry; log counts)
  const dealChildCounts = {};
  for (const model of [
    "enterpriseDealTask",
    "enterpriseDealActivity",
    "enterpriseDealNote",
    "enterpriseDealTimelineEvent",
    "enterpriseDealParticipant",
    "enterpriseDealDocumentLink",
  ]) {
    try {
      dealChildCounts[model] = await prisma[model].count({
        where: { dealId: { in: TARGET_DEAL_IDS }, isDeleted: false },
      });
    } catch {
      try {
        dealChildCounts[model] = await prisma[model].count({
          where: { dealId: { in: TARGET_DEAL_IDS } },
        });
      } catch {
        dealChildCounts[model] = "n/a";
      }
    }
  }

  report.D_dependentRecordsFound = {
    businessNotes: notes,
    documents,
    dealChildCounts,
  };

  // ─── 3. CLEANUP ORDER ────────────────────────────────────────────────
  const softMeta = {
    isDeleted: true,
    deletedAt: now,
    deletedBy: ACTOR,
    deletionReason: REASON,
  };

  // STEP 1 — Business Notes
  const noteIds = notes.map((n) => n.id);
  let notesArchived = 0;
  if (noteIds.length) {
    const r = await prisma.enterpriseBusinessNote.updateMany({
      where: { id: { in: noteIds }, isDeleted: false },
      data: softMeta,
    });
    notesArchived = r.count;
    report.mutations.push({ step: 1, entity: "EnterpriseBusinessNote", count: r.count, ids: noteIds });
  } else {
    report.mutations.push({ step: 1, entity: "EnterpriseBusinessNote", count: 0, ids: [] });
  }

  // STEP 2 — Documents (none expected; if present, soft-status only — no isDeleted column)
  let docsHandled = [];
  if (documents.length) {
    for (const doc of documents) {
      const updated = await prisma.enterpriseTransactionDocument.update({
        where: { id: doc.id },
        data: { status: "archived_cert_cleanup" },
        select: { id: true, opportunityId: true, status: true },
      });
      docsHandled.push(updated);
    }
    report.mutations.push({
      step: 2,
      entity: "EnterpriseTransactionDocument",
      count: docsHandled.length,
      ids: docsHandled.map((d) => d.id),
      note: "No isDeleted column — status set to archived_cert_cleanup",
    });
  } else {
    report.mutations.push({
      step: 2,
      entity: "EnterpriseTransactionDocument",
      count: 0,
      ids: [],
      note: "None found",
    });
  }

  // Soft-delete active deal children that support isDeleted (avoid orphaned open work)
  for (const model of ["enterpriseDealTask", "enterpriseDealActivity", "enterpriseDealNote"]) {
    try {
      const r = await prisma[model].updateMany({
        where: { dealId: { in: TARGET_DEAL_IDS }, isDeleted: false },
        data: softMeta,
      });
      if (r.count) {
        report.mutations.push({ step: "3-pre", entity: model, count: r.count });
      }
    } catch {
      /* model may lack fields */
    }
  }

  // STEP 3 — Deals
  const dealsUpdate = await prisma.enterpriseDeal.updateMany({
    where: { id: { in: TARGET_DEAL_IDS }, isDeleted: false },
    data: {
      ...softMeta,
      archived: true,
      archivedAt: now,
      archivedBy: ACTOR,
    },
  });
  report.mutations.push({
    step: 3,
    entity: "EnterpriseDeal",
    count: dealsUpdate.count,
    ids: TARGET_DEAL_IDS,
  });

  // STEP 4 — Opportunities
  const oppsUpdate = await prisma.enterpriseOpportunity.updateMany({
    where: { id: { in: TARGET_OPP_IDS }, isDeleted: false },
    data: {
      ...softMeta,
      archived: true,
      archivedAt: now,
      archivedBy: ACTOR,
    },
  });
  report.mutations.push({
    step: 4,
    entity: "EnterpriseOpportunity",
    count: oppsUpdate.count,
    ids: TARGET_OPP_IDS,
  });

  // ─── 5. PRESERVE ENTITLEMENT AUDITS ──────────────────────────────────
  const afterEntitlementAudits = await prisma.partnerEntitlementAudit.count();
  report.E_auditRecordsPreserved = {
    before: beforeEntitlementAudits,
    after: afterEntitlementAudits,
    delta: afterEntitlementAudits - beforeEntitlementAudits,
    deleted: false,
  };
  if (afterEntitlementAudits < beforeEntitlementAudits) {
    report.exceptions.push({
      code: "ENTITLEMENT_AUDIT_COUNT_DROPPED",
      before: beforeEntitlementAudits,
      after: afterEntitlementAudits,
    });
  }

  // ─── 6. USER / PARTNER REVIEW (no mutation) ──────────────────────────
  const partners = await prisma.enterpriseWealthPartner.findMany({
    where: { id: { in: CERT_PARTNER_IDS } },
    select: {
      id: true,
      code: true,
      displayName: true,
      email: true,
      isDeleted: true,
      lifecycleStatus: true,
      operationalStatus: true,
      contactId: true,
    },
  });
  const remainingOppsOnCertPartners = await prisma.enterpriseOpportunity.findMany({
    where: {
      isDeleted: false,
      sourceWealthPartnerId: { in: CERT_PARTNER_IDS },
    },
    select: {
      id: true,
      opportunityNumber: true,
      primaryContactName: true,
      productLabel: true,
      sourceWealthPartnerId: true,
    },
  });
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: [
          "wp-access-cert-a@rupeecatalyst.com",
          "wp-access-cert-b@rupeecatalyst.com",
          "wp-access-cert-admin@rupeecatalyst.com",
        ],
      },
    },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      firstName: true,
      lastName: true,
    },
  });

  report.F_userPartnerReview = {
    partners,
    users,
    remainingActiveOpportunitiesOwnedByCertPartners: remainingOppsOnCertPartners,
    genuineBusinessDataOnCertPartners: remainingOppsOnCertPartners.length > 0,
    recommendation:
      remainingOppsOnCertPartners.length === 0
        ? "No active Opportunities remain on WPACERTA/B. Partners/users may be deactivated or retained for future regression — PO decision required. NOT mutated by this sprint."
        : "Active Opportunities still reference cert partners — investigate before any partner deactivation.",
    actionTaken: "NONE — awaiting Product Owner decision",
  };

  // ─── 8. POST-CLEANUP VERIFICATION ────────────────────────────────────
  const afterOppActive = await prisma.enterpriseOpportunity.count({
    where: { isDeleted: false },
  });
  const afterDealActive = await prisma.enterpriseDeal.count({
    where: { isDeleted: false },
  });
  const targetOppsStillActive = await prisma.enterpriseOpportunity.count({
    where: { id: { in: TARGET_OPP_IDS }, isDeleted: false },
  });
  const targetDealsStillActive = await prisma.enterpriseDeal.count({
    where: { id: { in: TARGET_DEAL_IDS }, isDeleted: false },
  });
  const certFingerprintStillActive = await prisma.enterpriseOpportunity.count({
    where: {
      isDeleted: false,
      primaryContactName: { in: CERT_CUSTOMERS },
      productLabel: { in: CERT_LABELS },
    },
  });

  const genuineAfter = await prisma.enterpriseOpportunity.findMany({
    where: { isDeleted: false, id: { notIn: TARGET_OPP_IDS } },
    select: { id: true, updatedAt: true, isDeleted: true, opportunityNumber: true },
    orderBy: { id: "asc" },
  });
  const genuineDealAfter = await prisma.enterpriseDeal.findMany({
    where: { isDeleted: false, id: { notIn: TARGET_DEAL_IDS } },
    select: { id: true, updatedAt: true, isDeleted: true, dealNumber: true },
    orderBy: { id: "asc" },
  });
  const genuineOppFpAfter = fingerprint(genuineAfter);
  const genuineDealFpAfter = fingerprint(genuineDealAfter);

  // Targets should now be soft-deleted
  const archivedOpps = await prisma.enterpriseOpportunity.findMany({
    where: { id: { in: TARGET_OPP_IDS } },
    select: { id: true, isDeleted: true, archived: true, deletionReason: true },
  });
  const archivedDeals = await prisma.enterpriseDeal.findMany({
    where: { id: { in: TARGET_DEAL_IDS } },
    select: { id: true, isDeleted: true, archived: true, deletionReason: true },
  });

  report.B_recordsActuallyRemovedArchived = {
    businessNotes: notesArchived,
    documents: docsHandled.length,
    deals: dealsUpdate.count,
    opportunities: oppsUpdate.count,
    opportunityIds: TARGET_OPP_IDS,
    dealIds: TARGET_DEAL_IDS,
    noteIds,
    documentIds: docsHandled.map((d) => d.id),
  };

  report.C_recordsPreserved = {
    genuineOpportunityIds: genuineAfter.map((g) => g.id),
    genuineOpportunityCount: genuineAfter.length,
    genuineDealIds: genuineDealAfter.map((g) => g.id),
    genuineDealCount: genuineDealAfter.length,
    partnerEntitlementAudits: afterEntitlementAudits,
    certUsersAndPartners: "unchanged (review only)",
  };

  report.G_beforeAfterCounts = {
    opportunitiesActive: { before: beforeOppActive, after: afterOppActive, expectedAfter: 16 },
    dealsActive: {
      before: beforeDealActive,
      after: afterDealActive,
      expectedDelta: -10,
    },
    targetOppsStillActive,
    targetDealsStillActive,
    certFingerprintStillActive,
  };

  report.H_integrityVerification = {
    targetOppsAllSoftDeleted: archivedOpps.every((o) => o.isDeleted),
    targetDealsAllSoftDeleted: archivedDeals.every((d) => d.isDeleted),
    archivedOpportunitySample: archivedOpps.slice(0, 3),
    archivedDealSample: archivedDeals.slice(0, 3),
    opportunityRegistryHealthy: afterOppActive === 16 && targetOppsStillActive === 0,
    dealRegistryHealthy: targetDealsStillActive === 0,
  };

  report.I_genuineDataProtection = {
    genuineOpportunityCountBefore: genuineBefore.length,
    genuineOpportunityCountAfter: genuineAfter.length,
    genuineOpportunityFingerprintMatch: genuineOppFpBefore === genuineOppFpAfter,
    genuineDealFingerprintMatch: genuineDealFpBefore === genuineDealFpAfter,
    genuineOpportunityIdsUnchanged: sortedEq(
      genuineBefore.map((g) => g.id),
      genuineAfter.map((g) => g.id),
    ),
    entitlementAuditsNotDecreased: afterEntitlementAudits >= beforeEntitlementAudits,
  };

  if (afterOppActive !== 16) {
    report.exceptions.push({
      code: "OPP_COUNT_UNEXPECTED",
      afterOppActive,
      expected: 16,
    });
  }
  if (targetOppsStillActive !== 0 || targetDealsStillActive !== 0) {
    report.exceptions.push({
      code: "TARGETS_STILL_ACTIVE",
      targetOppsStillActive,
      targetDealsStillActive,
    });
  }
  if (genuineOppFpBefore !== genuineOppFpAfter) {
    report.exceptions.push({ code: "GENUINE_OPP_FINGERPRINT_CHANGED" });
  }
  if (genuineDealFpBefore !== genuineDealFpAfter) {
    report.exceptions.push({ code: "GENUINE_DEAL_FINGERPRINT_CHANGED" });
  }

  report.J_exceptions = report.exceptions;
  report.status =
    report.exceptions.length === 0
      ? "SUCCESS"
      : "COMPLETED_WITH_EXCEPTIONS";

  await finish(report, report.exceptions.length ? 1 : 0);
}

async function finish(report, code) {
  const outDir = path.join(root, "docs/co-wp-data-cleanup-002");
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "CO-WP-DATA-CLEANUP-002-EXECUTION-INVENTORY.json");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  console.log(
    JSON.stringify(
      {
        status: report.status || (report.stopped ? "STOPPED" : "UNKNOWN"),
        stopped: report.stopped,
        exceptions: report.exceptions?.length || 0,
        G: report.G_beforeAfterCounts,
        I: report.I_genuineDataProtection,
        F_action: report.F_userPartnerReview?.actionTaken,
        jsonPath,
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
  process.exit(code);
}

main().catch(async (e) => {
  console.error("CLEANUP_FAILED", e);
  await prisma.$disconnect();
  process.exit(1);
});
