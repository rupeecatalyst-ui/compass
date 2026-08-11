/**
 * CO-UBL-PRIORITY-001 — Persist Unsecured Business Loan lender priorities (17).
 * Priority only — never mutates lender identity, codes, mapping, activation, or programs.
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();
const PRODUCT_FAMILY = "BUSINESS_LOAN_UNSECURED";
const ACTOR = "co-ubl-priority-001-po";

/**
 * Exact PO order with resolved live lender codes.
 * "Tata Capital Finance" → live record Tata Capital (TATA_CAPITAL) — no new lender created.
 */
const PRIORITY = [
  { rank: 1, requestedName: "Axis Bank", code: "AXIS" },
  { rank: 2, requestedName: "Bajaj Finance", code: "BAJAJ_FINANCE" },
  { rank: 3, requestedName: "Clix Capital", code: "CLIX_CAPITAL" },
  { rank: 4, requestedName: "Credit Saison India", code: "CREDIT_SAISON" },
  { rank: 5, requestedName: "DCB Bank", code: "DCB" },
  { rank: 6, requestedName: "Deutsche Bank", code: "DEUTSCHE_BANK" },
  { rank: 7, requestedName: "Edelweiss Finance", code: "EDELWEISS" },
  { rank: 8, requestedName: "SMFG India Credit", code: "SMFG_INDIA" },
  { rank: 9, requestedName: "HDFC Bank", code: "HDFC" },
  { rank: 10, requestedName: "HDB Financial Services", code: "HDB_FINANCIAL" },
  { rank: 11, requestedName: "ICICI Bank", code: "ICICI" },
  { rank: 12, requestedName: "Tata Capital Finance", code: "TATA_CAPITAL" },
  { rank: 13, requestedName: "Standard Chartered Bank", code: "STANDARD_CHARTERED" },
  { rank: 14, requestedName: "Yes Bank", code: "YES" },
  { rank: 15, requestedName: "L&T Finance", code: "LT_FINANCE" },
  { rank: 16, requestedName: "IDFC FIRST Bank", code: "IDFC_FIRST" },
  { rank: 17, requestedName: "FlexiLoans", code: "FLEXILOANS" },
];

function isUbl(code) {
  const raw = String(code ?? "");
  const u = raw.toUpperCase().replace(/-/g, "_");
  if (u === "BUSINESS_LOAN_SECURED" || u === "WORKING_CAPITAL_SECURED") return false;
  return (
    u === "BUSINESS_LOAN_UNSECURED" ||
    u === "BL_STD" ||
    u === "UNSECURED_BUSINESS_LOAN" ||
    raw === "BUSINESS-LOAN" ||
    u === "BUSINESS_LOAN"
  );
}

function supports(ps) {
  return Array.isArray(ps) && ps.some(isUbl);
}

function matrixFingerprint(lenders) {
  const rows = lenders
    .map(
      (l) =>
        `${l.id}|${l.code}|${JSON.stringify(l.productsSupported ?? null)}|${l.enabled}|${l.status}`,
    )
    .sort();
  return createHash("sha256").update(rows.join("\n")).digest("hex");
}

async function resolveOrg() {
  return (
    (await prisma.organization.findUnique({
      where: { slug: "rupee-catalyst" },
      select: { id: true },
    })) ||
    (await prisma.organization.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })) ||
    (await prisma.organization.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }))
  );
}

async function main() {
  const org = await resolveOrg();
  if (!org) throw new Error("No organization found");
  const organizationId = org.id;

  const products = await prisma.enterpriseProduct.findMany({
    where: { isDeleted: false },
    select: { id: true, code: true, label: true, status: true, enabled: true },
  });
  const ublProduct =
    products.find((p) => p.code === "BUSINESS_LOAN_UNSECURED") ||
    products.find((p) => isUbl(p.code));
  if (!ublProduct) throw new Error("Canonical Unsecured Business Loan Product Master not found");

  const beforeLenders = await prisma.enterpriseLender.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      code: true,
      label: true,
      enabled: true,
      status: true,
      productsSupported: true,
      classification: true,
      institutionCategory: true,
    },
  });
  const beforeCount = beforeLenders.length;
  const beforeFp = matrixFingerprint(beforeLenders);
  const beforeEnabledTrue = beforeLenders.filter((l) => l.enabled === true).length;
  const beforeUbl = beforeLenders.filter(
    (l) => l.enabled !== false && supports(l.productsSupported),
  );
  const byCode = new Map(beforeLenders.map((l) => [l.code, l]));

  const items = [];
  const notMapped = [];
  const identityNotes = [];

  for (const row of PRIORITY) {
    const lender = byCode.get(row.code);
    if (!lender) {
      notMapped.push({
        requestedRank: row.rank,
        requestedName: row.requestedName,
        lenderCode: row.code,
        reason: "NO_LIVE_LENDER_RECORD",
      });
      throw new Error(`Missing lender code: ${row.code}`);
    }
    if (!supports(lender.productsSupported)) {
      notMapped.push({
        requestedRank: row.rank,
        requestedName: row.requestedName,
        lenderCode: row.code,
        lenderId: lender.id,
        reason: "Priority Pending — Product Not Currently Mapped",
      });
      continue;
    }
    if (lender.enabled === false) throw new Error(`Lender ${row.code} is disabled`);

    if (row.requestedName === "Tata Capital Finance" && lender.label !== "Tata Capital Finance") {
      identityNotes.push({
        requestedName: row.requestedName,
        resolvedInstitutionName: lender.label,
        lenderCode: lender.code,
        lenderId: lender.id,
        note: "Live registry label is Tata Capital (not Tata Capital Finance). Used existing canonical record; no new lender created.",
      });
    }

    items.push({
      priorityRank: items.length + 1,
      requestedRank: row.rank,
      requestedName: row.requestedName,
      lenderId: lender.id,
      lenderCode: lender.code,
      institutionName: lender.label,
      institutionType: lender.classification || lender.institutionCategory || "Not Specified",
      status: lender.status,
      enabled: lender.enabled,
      ublMapped: true,
    });
  }

  if (items.length !== 17) {
    throw new Error(
      `Expected 17 UBL-mapped priorities to persist, got ${items.length}. Not mapped: ${JSON.stringify(notMapped)}`,
    );
  }
  if (new Set(items.map((i) => i.lenderId)).size !== 17) {
    throw new Error("Duplicate priority lender IDs");
  }

  await prisma.$transaction(async (tx) => {
    await tx.enterpriseProductLenderPriority.deleteMany({
      where: { organizationId, productFamily: PRODUCT_FAMILY },
    });
    await tx.enterpriseProductLenderPriority.createMany({
      data: items.map((n) => ({
        organizationId,
        productFamily: PRODUCT_FAMILY,
        lenderId: n.lenderId,
        priorityRank: n.priorityRank,
        createdBy: ACTOR,
        modifiedBy: ACTOR,
      })),
    });
  });

  const afterLenders = await prisma.enterpriseLender.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      code: true,
      label: true,
      enabled: true,
      status: true,
      productsSupported: true,
    },
  });
  const afterUbl = afterLenders.filter(
    (l) => l.enabled !== false && supports(l.productsSupported),
  );
  const afterFp = matrixFingerprint(afterLenders);
  const afterEnabledTrue = afterLenders.filter((l) => l.enabled === true).length;

  const saved = await prisma.enterpriseProductLenderPriority.findMany({
    where: { organizationId, productFamily: PRODUCT_FAMILY },
    orderBy: { priorityRank: "asc" },
    include: {
      lender: {
        select: {
          id: true,
          code: true,
          label: true,
          status: true,
          enabled: true,
          classification: true,
          institutionCategory: true,
          productsSupported: true,
        },
      },
    },
  });

  const report = {
    sprint: "CO-UBL-PRIORITY-001",
    principle:
      "UBL PRIORITY = RANKING ONLY · PRIORITY ≠ ELIGIBILITY · PRIORITY ≠ MAPPING · PRIORITY ≠ WHITELIST",
    productMaster: {
      productId: ublProduct.id,
      productCode: ublProduct.code,
      productLabel: ublProduct.label,
    },
    productFamily: PRODUCT_FAMILY,
    before: {
      totalLenders: beforeCount,
      ublEligible: beforeUbl.length,
      enabledTrue: beforeEnabledTrue,
      matrixFingerprint: beforeFp,
    },
    after: {
      totalLenders: afterLenders.length,
      ublEligible: afterUbl.length,
      enabledTrue: afterEnabledTrue,
      matrixFingerprint: afterFp,
    },
    integrity: {
      lenderCountUnchanged: beforeCount === afterLenders.length,
      ublEligibleUnchanged: beforeUbl.length === afterUbl.length,
      enabledUnchanged: beforeEnabledTrue === afterEnabledTrue,
      matrixUnchanged: beforeFp === afterFp,
      priorityCount: saved.length,
      priorityUnique: new Set(saved.map((s) => s.lenderId)).size === saved.length,
      allPriorityUblMapped: saved.every((s) => supports(s.lender.productsSupported)),
      noNewLenders: true,
      noDeletedLenders: true,
      noEligibilityCreated: true,
      noProgramsModified: true,
    },
    priorityTable: saved.map((s, idx) => ({
      priority: s.priorityRank,
      requestedName: PRIORITY[idx]?.requestedName,
      institution: s.lender.label,
      lenderId: s.lenderId,
      lenderCode: s.lender.code,
      institutionType: s.lender.classification || s.lender.institutionCategory || "Not Specified",
      ublMapped: supports(s.lender.productsSupported) ? "Yes" : "No",
      status: s.lender.status,
      enabled: s.lender.enabled,
      active:
        s.lender.enabled !== false && String(s.lender.status).toLowerCase() !== "inactive",
    })),
    remainingEligibleCount: afterUbl.length - saved.length,
    notMapped,
    identityNotes,
  };

  const dir = resolve(process.cwd(), "docs/co-ubl-priority-001");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, "CO-UBL-PRIORITY-001-APPLY-RESULT.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  console.log(JSON.stringify(report, null, 2));

  if (!report.integrity.lenderCountUnchanged) throw new Error("Lender count changed");
  if (!report.integrity.ublEligibleUnchanged) throw new Error("UBL eligible count changed");
  if (!report.integrity.matrixUnchanged) throw new Error("Matrix fingerprint changed");
  if (report.integrity.priorityCount !== 17) throw new Error("Expected 17 priorities");
  if (!report.integrity.priorityUnique) throw new Error("Duplicate priorities");
  if (!report.integrity.allPriorityUblMapped) {
    throw new Error("A priority lender is not UBL mapped");
  }
  const codes = report.priorityTable.map((r) => r.lenderCode);
  const expected = PRIORITY.map((p) => p.code);
  if (codes.join(",") !== expected.join(",")) {
    throw new Error(`Priority order mismatch: ${codes.join(",")}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
