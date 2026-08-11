/**
 * CO-WP-DATA-CLEANUP-001 — Read-only certification test-data reconciliation audit.
 * NEVER deletes, archives, truncates, or updates rows.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Minimal dotenv loader — never logs secret values. */
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
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
  console.error("AUDIT_SKIPPED: DATABASE_URL not configured — cannot query live registry");
  process.exit(2);
}

const prisma = new PrismaClient();

const CERT_LABELS = [
  "Cert A Referral",
  "Cert A Override Edit",
  "Cert A ViewOnly",
  "Cert B Solo",
];
const CERT_CUSTOMER_NAMES = CERT_LABELS.map((l) => `${l} Customer`);
const CERT_PARTNER_CODES = ["WPACERTA", "WPACERTB"];
const CERT_PARTNER_EMAILS = [
  "wp-access-cert-a@rupeecatalyst.com",
  "wp-access-cert-b@rupeecatalyst.com",
];
const CERT_MOBILE = "90000000001";
const CERT_SNAPSHOT_MARKER = "CO-WP-ACCESS-002";

/** IDs captured in committed BAT evidence JSON (strong evidence). */
function loadEvidenceIds() {
  const dir = path.join(root, "docs/co-wp-access-002");
  const files = [
    "CO-WP-ACCESS-002-BAT-EVIDENCE.json",
    "CO-WP-ACCESS-003-POST-DEPLOY-BAT-EVIDENCE.json",
    "CO-WP-ACCESS-004-POST-DEPLOY-BAT-EVIDENCE.json",
  ];
  const oppIds = new Set();
  const dealIds = new Set();
  const partnerIds = new Set();
  for (const f of files) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) continue;
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    const ev = j.evidence || j;
    for (const id of Object.values(ev.opportunities || {})) {
      if (id) oppIds.add(String(id));
    }
    for (const id of Object.values(ev.deals || {})) {
      if (id) dealIds.add(String(id));
    }
    for (const side of Object.values(ev.partners || {})) {
      if (side?.id) partnerIds.add(String(side.id));
    }
  }
  return { oppIds, dealIds, partnerIds };
}

function classifyOpp(row, ctx) {
  const evidence = [];
  let score = 0;

  if (ctx.evidenceOppIds.has(row.id)) {
    evidence.push("Listed in committed ACCESS BAT evidence JSON");
    score += 100;
  }
  if (CERT_CUSTOMER_NAMES.includes(row.primaryContactName || "")) {
    evidence.push(`primaryContactName matches fixture pattern "${row.primaryContactName}"`);
    score += 40;
  }
  if (CERT_LABELS.includes(row.productLabel || "")) {
    evidence.push(`productLabel matches certify label "${row.productLabel}"`);
    score += 40;
  }
  if (row.primaryContactMobile === CERT_MOBILE) {
    evidence.push(`primaryContactMobile=${CERT_MOBILE} (certify fixture constant)`);
    score += 15;
  }
  if (ctx.certPartnerIds.has(row.sourceWealthPartnerId || "")) {
    evidence.push(
      `sourceWealthPartnerId=${row.sourceWealthPartnerId} is WPACERTA/B cert partner`,
    );
    score += 30;
  }
  let snapCert = null;
  try {
    const snap = row.snapshot;
    if (snap && typeof snap === "object" && snap.cert === CERT_SNAPSHOT_MARKER) {
      snapCert = snap.cert;
      evidence.push(`snapshot.cert=${CERT_SNAPSHOT_MARKER} (written by co-wp-access-002-certify.mjs)`);
      score += 50;
    }
  } catch {
    /* ignore */
  }
  if (row.sourceCode === "wealth_partner" && score >= 40) {
    evidence.push("sourceCode=wealth_partner (consistent with certify create)");
  }

  if (score >= 80 || (snapCert && CERT_CUSTOMER_NAMES.includes(row.primaryContactName || ""))) {
    return { classification: "CERTIFICATION_TEST_DATA", confidence: "high", evidence, score };
  }
  if (score >= 40) {
    return {
      classification: "UNKNOWN / REQUIRES_REVIEW",
      confidence: "medium",
      evidence: [
        ...evidence,
        "Partial fingerprint — do not delete without PO review (could be reused naming)",
      ],
      score,
    };
  }
  if (ctx.certPartnerIds.has(row.sourceWealthPartnerId || "") && !evidence.length) {
    return {
      classification: "UNKNOWN / REQUIRES_REVIEW",
      confidence: "low",
      evidence: [
        `Owned by cert partner ${row.sourceWealthPartnerId} but missing name/label/snapshot markers`,
      ],
      score: 10,
    };
  }
  return {
    classification: "GENUINE_BUSINESS_DATA",
    confidence: "default",
    evidence: evidence.length
      ? evidence
      : ["No ACCESS certify fixture fingerprints matched"],
    score,
  };
}

async function main() {
  const evidencePack = loadEvidenceIds();

  const certPartners = await prisma.enterpriseWealthPartner.findMany({
    where: {
      OR: [
        { code: { in: CERT_PARTNER_CODES } },
        { id: { in: [...evidencePack.partnerIds] } },
        { email: { in: CERT_PARTNER_EMAILS } },
      ],
    },
    select: {
      id: true,
      code: true,
      displayName: true,
      email: true,
      organizationId: true,
      contactId: true,
    },
  });
  const certPartnerIds = new Set(certPartners.map((p) => p.id));
  for (const id of evidencePack.partnerIds) certPartnerIds.add(id);

  const totalOpps = await prisma.enterpriseOpportunity.count({
    where: { isDeleted: false },
  });

  // Candidates: strong markers OR evidence IDs OR owned by cert partners
  const candidates = await prisma.enterpriseOpportunity.findMany({
    where: {
      isDeleted: false,
      OR: [
        { id: { in: [...evidencePack.oppIds] } },
        { primaryContactName: { in: CERT_CUSTOMER_NAMES } },
        { productLabel: { in: CERT_LABELS } },
        { sourceWealthPartnerId: { in: [...certPartnerIds] } },
        {
          snapshot: {
            path: ["cert"],
            equals: CERT_SNAPSHOT_MARKER,
          },
        },
      ],
    },
    select: {
      id: true,
      opportunityNumber: true,
      primaryContactId: true,
      primaryContactName: true,
      primaryContactMobile: true,
      productLabel: true,
      productId: true,
      sourceCode: true,
      sourceWealthPartnerId: true,
      lifecycleStatus: true,
      requirementStage: true,
      snapshot: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      organizationId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const ctx = {
    evidenceOppIds: evidencePack.oppIds,
    certPartnerIds,
  };

  const classified = [];
  for (const row of candidates) {
    const cls = classifyOpp(row, ctx);

    const deals = await prisma.enterpriseDeal.findMany({
      where: { opportunityId: row.id, isDeleted: false },
      select: {
        id: true,
        dealNumber: true,
        productLabel: true,
        grossStage: true,
        lenderId: true,
        createdAt: true,
      },
    });

    const documents = await prisma.enterpriseTransactionDocument.findMany({
      where: { opportunityId: row.id },
      select: {
        id: true,
        displayName: true,
        originalFilename: true,
        uploadSource: true,
        createdAt: true,
      },
      take: 50,
    });

    const notes = await prisma.enterpriseBusinessNote.findMany({
      where: {
        isDeleted: false,
        OR: [{ opportunityId: row.id }, { entityId: row.id }],
      },
      select: {
        id: true,
        category: true,
        entityKind: true,
        createdAt: true,
        createdByUserId: true,
      },
      take: 50,
    });

    classified.push({
      opportunityId: row.id,
      opportunityNumber: row.opportunityNumber,
      customer: row.primaryContactName,
      customerId: row.primaryContactId,
      product: row.productLabel,
      source: row.sourceCode,
      sourceWealthPartnerId: row.sourceWealthPartnerId,
      createdAt: row.createdAt?.toISOString?.() || row.createdAt,
      createdBy: row.createdBy,
      relatedDeals: deals,
      relatedDocuments: documents,
      relatedActivitiesNotes: notes,
      evidenceOfTestOrigin: cls.evidence,
      classification: cls.classification,
      confidence: cls.confidence,
      recommendedAction:
        cls.classification === "CERTIFICATION_TEST_DATA"
          ? "CANDIDATE for soft-archive/delete AFTER PO approval (children first)"
          : cls.classification === "UNKNOWN / REQUIRES_REVIEW"
            ? "HOLD — Product Owner review before any action"
            : "PRESERVE — do not include in cleanup",
    });
  }

  // Also scan ALL opps for counts of genuine vs unknown among non-candidates
  const allOppIds = await prisma.enterpriseOpportunity.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      primaryContactName: true,
      productLabel: true,
      sourceWealthPartnerId: true,
      snapshot: true,
      primaryContactMobile: true,
    },
  });

  let certCount = 0;
  let genuineCount = 0;
  let unknownCount = 0;
  const byClass = {
    CERTIFICATION_TEST_DATA: [],
    GENUINE_BUSINESS_DATA: [],
    "UNKNOWN / REQUIRES_REVIEW": [],
  };

  const classifiedIds = new Set(classified.map((c) => c.opportunityId));
  for (const c of classified) {
    byClass[c.classification].push(c);
    if (c.classification === "CERTIFICATION_TEST_DATA") certCount += 1;
    else if (c.classification === "GENUINE_BUSINESS_DATA") genuineCount += 1;
    else unknownCount += 1;
  }
  for (const row of allOppIds) {
    if (classifiedIds.has(row.id)) continue;
    const cls = classifyOpp(row, ctx);
    if (cls.classification === "CERTIFICATION_TEST_DATA") {
      certCount += 1;
      byClass.CERTIFICATION_TEST_DATA.push({
        opportunityId: row.id,
        customer: row.primaryContactName,
        product: row.productLabel,
        evidenceOfTestOrigin: cls.evidence,
        classification: cls.classification,
        note: "Matched full-scan fingerprint but missed candidate OR filter — include in cleanup list",
      });
    } else if (cls.classification === "UNKNOWN / REQUIRES_REVIEW") {
      unknownCount += 1;
      byClass["UNKNOWN / REQUIRES_REVIEW"].push({
        opportunityId: row.id,
        customer: row.primaryContactName,
        product: row.productLabel,
        evidenceOfTestOrigin: cls.evidence,
        classification: cls.classification,
      });
    } else {
      genuineCount += 1;
    }
  }

  // Related fixture entities
  const certDeals = await prisma.enterpriseDeal.findMany({
    where: {
      isDeleted: false,
      OR: [
        { id: { in: [...evidencePack.dealIds] } },
        { productLabel: { in: ["Cert Deal A", "Cert Deal B"] } },
        { opportunityId: { in: byClass.CERTIFICATION_TEST_DATA.map((o) => o.opportunityId) } },
      ],
    },
    select: {
      id: true,
      dealNumber: true,
      opportunityId: true,
      productLabel: true,
      createdAt: true,
    },
  });

  const entitlementAudit = await prisma.partnerEntitlementAudit.findMany({
    where: {
      OR: [
        { wealthPartnerId: { in: [...certPartnerIds] } },
        { reason: { contains: "Certification" } },
        { reason: { contains: "CO-WP-ACCESS" } },
        { actorLabel: { contains: "CO-WP-ACCESS" } },
      ],
    },
    select: {
      id: true,
      wealthPartnerId: true,
      changeType: true,
      targetKind: true,
      targetId: true,
      reason: true,
      actorLabel: true,
      createdAt: true,
    },
    take: 200,
    orderBy: { createdAt: "desc" },
  });

  const certUsers = await prisma.user.findMany({
    where: {
      email: {
        in: [
          ...CERT_PARTNER_EMAILS,
          "wp-access-cert-admin@rupeecatalyst.com",
        ],
      },
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
  });

  const report = {
    sprint: "CO-WP-DATA-CLEANUP-001",
    generatedAt: new Date().toISOString(),
    mode: "READ_ONLY_AUDIT",
    mutations: "NONE",
    fixtureFingerprint: {
      script: "scripts/co-wp-access-002-certify.mjs",
      customerNames: CERT_CUSTOMER_NAMES,
      productLabels: CERT_LABELS,
      mobile: CERT_MOBILE,
      snapshotCert: CERT_SNAPSHOT_MARKER,
      partnerCodes: CERT_PARTNER_CODES,
      partnerEmails: CERT_PARTNER_EMAILS,
      evidencePartnerIds: [...evidencePack.partnerIds],
      evidenceOpportunityIds: [...evidencePack.oppIds],
      evidenceDealIds: [...evidencePack.dealIds],
    },
    counts: {
      A_totalOpportunities: totalOpps,
      B_probableCertificationTestOpportunities: certCount,
      C_genuineOpportunities: genuineCount,
      D_unknownRequiresReview: unknownCount,
    },
    certPartners,
    certUsers,
    candidateCleanupList: byClass.CERTIFICATION_TEST_DATA,
    unknownList: byClass["UNKNOWN / REQUIRES_REVIEW"],
    relatedTestDependencies: {
      deals: certDeals,
      entitlementAuditSample: entitlementAudit.slice(0, 50),
      entitlementAuditCount: entitlementAudit.length,
      note:
        "Documents/Activities listed per opportunity in candidateCleanupList.relatedDocuments / relatedActivitiesNotes",
    },
    recommendedSafeCleanupSequence: [
      "1. PO approve this audit report and candidate list",
      "2. Soft-archive or delete Business Notes / activities linked only to cert opportunity IDs",
      "3. Soft-archive or delete EnterpriseTransactionDocument rows linked only to cert opportunity IDs",
      "4. Soft-archive or delete EnterpriseDeal rows linked only to cert opportunity IDs (or evidence deal IDs)",
      "5. Soft-archive or delete EnterpriseOpportunity cert rows (snapshot.cert + name/label fingerprints)",
      "6. Review Partner entitlement overrides/profiles for WPACERTA/B — retain templates; optionally reset cert partner profiles",
      "7. Optionally deactivate cert users (wp-access-cert-*) — do NOT touch admin@compass.com",
      "8. Optionally archive WPACERTA/B wealth partner rows AFTER confirming no genuine opps remain on those partner IDs",
      "9. Re-run read-only audit to confirm residual = 0 cert fingerprints",
      "10. NEVER run production-reset or truncate as part of this cleanup",
    ],
    detailedCandidates: classified,
  };

  const outDir = path.join(root, "docs/co-wp-data-cleanup-001");
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "CO-WP-DATA-CLEANUP-001-AUDIT-INVENTORY.json");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify({ counts: report.counts, jsonPath, candidates: classified.length }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("AUDIT_FAILED", e);
  await prisma.$disconnect();
  process.exit(1);
});
