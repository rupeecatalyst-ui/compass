/**
 * CO-PRODUCT-PRIORITY-004 — Persist LAP + Commercial Purchase priorities.
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
const ACTOR = "co-product-priority-004-po";

/** Dense PO order for LAP — only codes that are live LAP-mapped (Jio excluded). */
const LAP_PRIORITY_CODES = [
  "STANDARD_CHARTERED",
  "SARASWAT",
  "HDFC",
  "INDUSIND",
  // Jio Financial Services — NOT CURRENTLY PRODUCT-MAPPED — PRIORITY NOT PERSISTED
  "KOTAK",
  "AXIS",
  "YES",
  "FEDERAL",
  "PIRAMAL_FINANCE",
  "DEUTSCHE_BANK",
  "BAJAJ_FINANCE",
  "ADITYA_BIRLA_FINANCE",
];

const PO_CANDIDATES = [
  { rank: 1, name: "Standard Chartered Bank", code: "STANDARD_CHARTERED" },
  { rank: 2, name: "Saraswat Cooperative Bank", code: "SARASWAT" },
  { rank: 3, name: "HDFC Bank", code: "HDFC" },
  { rank: 4, name: "IndusInd Bank", code: "INDUSIND" },
  { rank: 5, name: "Jio Financial Services", code: "LND000001" },
  { rank: 6, name: "Kotak Mahindra Bank", code: "KOTAK" },
  { rank: 7, name: "Axis Bank", code: "AXIS" },
  { rank: 8, name: "Yes Bank", code: "YES" },
  { rank: 9, name: "Federal Bank", code: "FEDERAL" },
  { rank: 10, name: "Piramal Finance", code: "PIRAMAL_FINANCE" },
  { rank: 11, name: "Deutsche Bank", code: "DEUTSCHE_BANK" },
  { rank: 12, name: "Bajaj Finance", code: "BAJAJ_FINANCE" },
  { rank: 13, name: "Aditya Birla Finance", code: "ADITYA_BIRLA_FINANCE" },
];

function isLap(code) {
  const u = String(code || "")
    .toUpperCase()
    .replace(/-/g, "_");
  if (u.includes("HOME_LOAN") || u === "HL" || u === "HL_STD") return false;
  return u === "LAP" || u === "LAP_STD" || u === "LOAN_AGAINST_PROPERTY";
}

function isCommPurchase(code) {
  const u = String(code || "")
    .toUpperCase()
    .replace(/-/g, "_");
  return (
    u === "COMM_PURCHASE" ||
    u === "COMMERCIAL_PURCHASE" ||
    u === "CP_STD"
  );
}

function supports(ps, pred) {
  return Array.isArray(ps) && ps.some(pred);
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
  const lapProduct =
    products.find((p) => p.code === "LAP") ||
    products.find((p) => isLap(p.code));
  const cpProduct =
    products.find((p) => p.code === "COMM_PURCHASE") ||
    products.find((p) => isCommPurchase(p.code));
  if (!lapProduct) throw new Error("Canonical LAP Product Master not found");
  if (!cpProduct) throw new Error("Canonical Commercial Purchase Product Master not found");

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
  const lapEligible = beforeLenders.filter(
    (l) => l.enabled !== false && supports(l.productsSupported, isLap),
  );
  const cpEligible = beforeLenders.filter(
    (l) => l.enabled !== false && supports(l.productsSupported, isCommPurchase),
  );
  const byCode = new Map(beforeLenders.map((l) => [l.code, l]));

  const identityTable = PO_CANDIDATES.map((c) => {
    const lender = byCode.get(c.code);
    if (!lender) {
      return {
        requestedRank: c.rank,
        requestedName: c.name,
        status: "NO_LIVE_LENDER_RECORD",
        lenderId: null,
        lenderCode: c.code,
        lapMapped: false,
        commercialPurchaseMapped: false,
      };
    }
    const lapMapped = supports(lender.productsSupported, isLap);
    const commercialPurchaseMapped = supports(lender.productsSupported, isCommPurchase);
    return {
      requestedRank: c.rank,
      requestedName: c.name,
      institutionName: lender.label,
      lenderId: lender.id,
      lenderCode: lender.code,
      institutionType: lender.classification || lender.institutionCategory || "Not Specified",
      activeStatus: lender.enabled !== false && String(lender.status).toLowerCase() !== "inactive",
      enabled: lender.enabled,
      status: lender.status,
      lapMapped,
      commercialPurchaseMapped,
      productsSupported: lender.productsSupported,
    };
  });

  // --- LAP apply ---
  const lapItems = [];
  const lapNotMapped = [];
  for (const c of PO_CANDIDATES) {
    const lender = byCode.get(c.code);
    if (!lender || !supports(lender.productsSupported, isLap)) {
      lapNotMapped.push({
        requestedRank: c.rank,
        requestedName: c.name,
        lenderCode: c.code,
        lenderId: lender?.id ?? null,
        reason: "NOT CURRENTLY PRODUCT-MAPPED — PRIORITY NOT PERSISTED",
      });
      continue;
    }
    if (lender.enabled === false) {
      throw new Error(`LAP priority lender ${c.code} is disabled`);
    }
    lapItems.push({
      priorityRank: lapItems.length + 1,
      lenderId: lender.id,
      lenderCode: lender.code,
      institutionName: lender.label,
      requestedRank: c.rank,
      requestedName: c.name,
    });
  }

  if (lapItems.map((i) => i.lenderCode).join(",") !== LAP_PRIORITY_CODES.join(",")) {
    throw new Error(
      `LAP priority set mismatch. Expected ${LAP_PRIORITY_CODES.join(",")} got ${lapItems
        .map((i) => i.lenderCode)
        .join(",")}`,
    );
  }

  // --- Commercial Purchase apply ---
  const cpItems = [];
  const cpNotMapped = [];
  for (const c of PO_CANDIDATES) {
    const lender = byCode.get(c.code);
    if (!lender || !supports(lender.productsSupported, isCommPurchase)) {
      cpNotMapped.push({
        requestedRank: c.rank,
        requestedName: c.name,
        lenderCode: c.code,
        lenderId: lender?.id ?? null,
        reason: "NOT CURRENTLY PRODUCT-MAPPED — PRIORITY NOT PERSISTED",
        note: "Priority pending until Product–Lender mapping exists",
      });
      continue;
    }
    cpItems.push({
      priorityRank: cpItems.length + 1,
      lenderId: lender.id,
      lenderCode: lender.code,
      institutionName: lender.label,
      requestedRank: c.rank,
      requestedName: c.name,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.enterpriseProductLenderPriority.deleteMany({
      where: { organizationId, productFamily: "LAP" },
    });
    await tx.enterpriseProductLenderPriority.createMany({
      data: lapItems.map((n) => ({
        organizationId,
        productFamily: "LAP",
        lenderId: n.lenderId,
        priorityRank: n.priorityRank,
        createdBy: ACTOR,
        modifiedBy: ACTOR,
      })),
    });

    await tx.enterpriseProductLenderPriority.deleteMany({
      where: { organizationId, productFamily: "COMM_PURCHASE" },
    });
    if (cpItems.length > 0) {
      await tx.enterpriseProductLenderPriority.createMany({
        data: cpItems.map((n) => ({
          organizationId,
          productFamily: "COMM_PURCHASE",
          lenderId: n.lenderId,
          priorityRank: n.priorityRank,
          createdBy: ACTOR,
          modifiedBy: ACTOR,
        })),
      });
    }
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
  const afterFp = matrixFingerprint(afterLenders);
  const afterEnabledTrue = afterLenders.filter((l) => l.enabled === true).length;
  const afterLap = afterLenders.filter(
    (l) => l.enabled !== false && supports(l.productsSupported, isLap),
  );
  const afterCp = afterLenders.filter(
    (l) => l.enabled !== false && supports(l.productsSupported, isCommPurchase),
  );

  const lapSaved = await prisma.enterpriseProductLenderPriority.findMany({
    where: { organizationId, productFamily: "LAP" },
    orderBy: { priorityRank: "asc" },
    include: {
      lender: { select: { id: true, code: true, label: true, status: true, enabled: true } },
    },
  });
  const cpSaved = await prisma.enterpriseProductLenderPriority.findMany({
    where: { organizationId, productFamily: "COMM_PURCHASE" },
    orderBy: { priorityRank: "asc" },
    include: {
      lender: { select: { id: true, code: true, label: true, status: true, enabled: true } },
    },
  });

  const report = {
    sprint: "CO-PRODUCT-PRIORITY-004",
    principle: "PRIORITY = ORDER · PRIORITY ≠ ELIGIBILITY · PRIORITY ≠ MAPPING · PRIORITY ≠ WHITELIST",
    identityValidation: identityTable,
    sectionA_LAP: {
      productId: lapProduct.id,
      productCode: lapProduct.code,
      productLabel: lapProduct.label,
      totalLapEligible: afterLap.length,
      priorityAssigned: lapSaved.length,
      priorityCandidatesNotMapped: lapNotMapped,
      priorityTable: lapSaved.map((s) => ({
        priority: s.priorityRank,
        institution: s.lender.label,
        lenderId: s.lenderId,
        lenderCode: s.lender.code,
        status: s.lender.status,
        enabled: s.lender.enabled,
      })),
      remainingEligibleCount: afterLap.length - lapSaved.length,
      persistenceResult: "OK",
    },
    sectionB_CommercialPurchase: {
      productId: cpProduct.id,
      productCode: cpProduct.code,
      productLabel: cpProduct.label,
      totalCommercialPurchaseEligible: afterCp.length,
      priorityAssigned: cpSaved.length,
      priorityCandidatesNotMapped: cpNotMapped,
      priorityTable: cpSaved.map((s) => ({
        priority: s.priorityRank,
        institution: s.lender.label,
        lenderId: s.lenderId,
        lenderCode: s.lender.code,
        status: s.lender.status,
        enabled: s.lender.enabled,
      })),
      remainingEligibleCount: afterCp.length - cpSaved.length,
      onlyEligibleLender: cpEligible.map((l) => ({
        lenderId: l.id,
        lenderCode: l.code,
        institutionName: l.label,
        note: "Remains under OTHER COMMERCIAL PURCHASE LENDERS (not in PO priority list)",
      })),
      persistenceResult: cpItems.length === 0 ? "OK_EMPTY_NO_MAPPED_CANDIDATES" : "OK",
    },
    integrity: {
      lenderCountUnchanged: beforeCount === afterLenders.length,
      lapEligibleUnchanged: lapEligible.length === afterLap.length,
      commercialPurchaseEligibleUnchanged: cpEligible.length === afterCp.length,
      enabledUnchanged: beforeEnabledTrue === afterEnabledTrue,
      matrixUnchanged: beforeFp === afterFp,
      lapPriorityUnique:
        new Set(lapSaved.map((s) => s.lenderId)).size === lapSaved.length,
      cpPriorityUnique: new Set(cpSaved.map((s) => s.lenderId)).size === cpSaved.length,
      noNewLenders: true,
      noDeletedLenders: true,
      noEligibilityCreated: true,
      before: {
        totalLenders: beforeCount,
        lapEligible: lapEligible.length,
        commercialPurchaseEligible: cpEligible.length,
        enabledTrue: beforeEnabledTrue,
        matrixFingerprint: beforeFp,
      },
      after: {
        totalLenders: afterLenders.length,
        lapEligible: afterLap.length,
        commercialPurchaseEligible: afterCp.length,
        enabledTrue: afterEnabledTrue,
        matrixFingerprint: afterFp,
      },
    },
  };

  const dir = resolve(process.cwd(), "docs/co-product-priority-004");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, "CO-PRODUCT-PRIORITY-004-APPLY-RESULT.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  console.log(JSON.stringify(report, null, 2));

  if (!report.integrity.lenderCountUnchanged) throw new Error("Lender count changed");
  if (!report.integrity.lapEligibleUnchanged) throw new Error("LAP eligible count changed");
  if (!report.integrity.commercialPurchaseEligibleUnchanged) {
    throw new Error("Commercial Purchase eligible count changed");
  }
  if (!report.integrity.matrixUnchanged) throw new Error("Matrix fingerprint changed");
  if (report.sectionA_LAP.priorityAssigned !== 12) {
    throw new Error(`Expected 12 LAP priorities, got ${report.sectionA_LAP.priorityAssigned}`);
  }
  if (report.sectionB_CommercialPurchase.priorityAssigned !== 0) {
    throw new Error(
      `Expected 0 Commercial Purchase priorities, got ${report.sectionB_CommercialPurchase.priorityAssigned}`,
    );
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
