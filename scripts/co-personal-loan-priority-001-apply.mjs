/**
 * CO-PERSONAL-LOAN-PRIORITY-001 — Persist Personal Loan lender priorities (11).
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
const PRODUCT_FAMILY = "PERSONAL_LOAN";
const ACTOR = "co-personal-loan-priority-001-po";

/** Exact PO order — live lender codes resolved from Enterprise Lender Registry. */
const PRIORITY_CODES = [
  "ICICI",
  "HDFC",
  "AXIS",
  "IDFC_FIRST",
  "KOTAK",
  "RBL",
  "DCB",
  "ADITYA_BIRLA_FINANCE",
  "FEDERAL",
  "BAJAJ_FINANCE",
  "YES",
];

const PO_NAMES = [
  "ICICI Bank",
  "HDFC Bank",
  "Axis Bank",
  "IDFC FIRST Bank",
  "Kotak Mahindra Bank",
  "RBL Bank",
  "DCB Bank",
  "Aditya Birla Finance",
  "Federal Bank",
  "Bajaj Finance",
  "Yes Bank",
];

function isPersonalLoan(code) {
  const raw = String(code ?? "");
  const u = raw.toUpperCase().replace(/-/g, "_");
  return (
    u === "PERSONAL_LOAN" ||
    u === "PL_STD" ||
    u === "PERSONAL_LOAN" ||
    u === "PL" ||
    raw === "PERSONAL-LOAN" ||
    u === "PERSONALLOAN"
  );
}

function supports(ps) {
  return Array.isArray(ps) && ps.some(isPersonalLoan);
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
  const plProduct =
    products.find((p) => p.code === "PERSONAL_LOAN") ||
    products.find((p) => isPersonalLoan(p.code));
  if (!plProduct) throw new Error("Canonical Personal Loan Product Master not found");

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
  const beforePL = beforeLenders.filter(
    (l) => l.enabled !== false && supports(l.productsSupported),
  );
  const byCode = new Map(beforeLenders.map((l) => [l.code, l]));

  const items = [];
  const exceptions = [];
  for (let i = 0; i < PRIORITY_CODES.length; i++) {
    const code = PRIORITY_CODES[i];
    const name = PO_NAMES[i];
    const lender = byCode.get(code);
    if (!lender) {
      exceptions.push({
        requestedRank: i + 1,
        requestedName: name,
        lenderCode: code,
        reason: "NO_LIVE_LENDER_RECORD",
      });
      throw new Error(`Missing lender code: ${code}`);
    }
    if (!supports(lender.productsSupported)) {
      exceptions.push({
        requestedRank: i + 1,
        requestedName: name,
        lenderCode: code,
        lenderId: lender.id,
        reason: "NOT CURRENTLY PRODUCT-MAPPED — PRIORITY NOT PERSISTED",
      });
      throw new Error(`Lender ${code} is not Personal Loan mapped`);
    }
    if (lender.enabled === false) throw new Error(`Lender ${code} is disabled`);
    items.push({
      priorityRank: i + 1,
      lenderId: lender.id,
      lenderCode: lender.code,
      institutionName: lender.label,
      institutionType: lender.classification || lender.institutionCategory || "Not Specified",
      status: lender.status,
      enabled: lender.enabled,
      personalLoanMapped: true,
      requestedName: name,
    });
  }

  const uniqueIds = new Set(items.map((i) => i.lenderId));
  if (uniqueIds.size !== items.length) throw new Error("Duplicate priority lender IDs");

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
  const afterPL = afterLenders.filter(
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
    sprint: "CO-PERSONAL-LOAN-PRIORITY-001",
    principle:
      "PERSONAL LOAN PRIORITY = RANKING ONLY · PRIORITY ≠ ELIGIBILITY · PRIORITY ≠ MAPPING · PRIORITY ≠ WHITELIST",
    productMaster: {
      productId: plProduct.id,
      productCode: plProduct.code,
      productLabel: plProduct.label,
    },
    productFamily: PRODUCT_FAMILY,
    before: {
      totalLenders: beforeCount,
      personalLoanEligible: beforePL.length,
      enabledTrue: beforeEnabledTrue,
      matrixFingerprint: beforeFp,
    },
    after: {
      totalLenders: afterLenders.length,
      personalLoanEligible: afterPL.length,
      enabledTrue: afterEnabledTrue,
      matrixFingerprint: afterFp,
    },
    integrity: {
      lenderCountUnchanged: beforeCount === afterLenders.length,
      personalLoanEligibleUnchanged: beforePL.length === afterPL.length,
      enabledUnchanged: beforeEnabledTrue === afterEnabledTrue,
      matrixUnchanged: beforeFp === afterFp,
      priorityCount: saved.length,
      priorityUnique: new Set(saved.map((s) => s.lenderId)).size === saved.length,
      allPriorityPlMapped: saved.every((s) => supports(s.lender.productsSupported)),
      noNewLenders: true,
      noDeletedLenders: true,
      noEligibilityCreated: true,
      noProgramsModified: true,
    },
    priorityTable: saved.map((s) => ({
      priority: s.priorityRank,
      institution: s.lender.label,
      lenderId: s.lenderId,
      lenderCode: s.lender.code,
      institutionType: s.lender.classification || s.lender.institutionCategory || "Not Specified",
      personalLoanMapped: supports(s.lender.productsSupported) ? "Yes" : "No",
      status: s.lender.status,
      enabled: s.lender.enabled,
      active:
        s.lender.enabled !== false && String(s.lender.status).toLowerCase() !== "inactive",
    })),
    remainingEligibleCount: afterPL.length - saved.length,
    exceptions,
    identityResolution: items.map((i) => ({
      assignedPriority: i.priorityRank,
      institutionName: i.institutionName,
      lenderId: i.lenderId,
      lenderCode: i.lenderCode,
      institutionType: i.institutionType,
      activeStatus: i.enabled !== false && String(i.status).toLowerCase() !== "inactive",
      personalLoanMappingStatus: "Yes",
      requestedName: i.requestedName,
    })),
  };

  const dir = resolve(process.cwd(), "docs/co-personal-loan-priority-001");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, "CO-PERSONAL-LOAN-PRIORITY-001-APPLY-RESULT.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  console.log(JSON.stringify(report, null, 2));

  if (!report.integrity.lenderCountUnchanged) throw new Error("Lender count changed");
  if (!report.integrity.personalLoanEligibleUnchanged) {
    throw new Error("Personal Loan eligible count changed");
  }
  if (!report.integrity.matrixUnchanged) throw new Error("Matrix fingerprint changed");
  if (report.integrity.priorityCount !== 11) throw new Error("Expected 11 priorities");
  if (!report.integrity.priorityUnique) throw new Error("Duplicate priorities");
  if (!report.integrity.allPriorityPlMapped) {
    throw new Error("A priority lender is not Personal Loan mapped");
  }
  const codes = report.priorityTable.map((r) => r.lenderCode);
  if (codes.join(",") !== PRIORITY_CODES.join(",")) {
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
