/**
 * CO-HL-PROGRAM-003 — Persist Product Owner Home Loan priority (21 lenders).
 * Priority only — never mutates lender identity, codes, mapping, or activation.
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();
const PRODUCT_FAMILY = "HOME_LOAN";
const ACTOR = "co-hl-program-003-po";

/** Final PO order with resolved live lender codes (duplicate decisions documented in report). */
const PRIORITY_CODES = [
  "CBI", // Central Bank of India — not BF_CENTRAL
  "HSBC",
  "HDFC",
  "SHINHAN_BANK",
  "SBI", // State Bank of India — not LND-P2A-SBI (not HL-mapped)
  "BOI",
  "AXIS",
  "ICICI",
  "BAJAJ_HOUSING", // not BAJAJ
  "BOB",
  "FEDERAL",
  "IIFL_HOME",
  "KOTAK",
  "LIC_HFL",
  "PIRAMAL_HOUSING",
  "PNB_HOUSING",
  "SARASWAT",
  "SIB",
  "STANDARD_CHARTERED",
  "TATA_CAPITAL_HFL",
  "YES",
];

const HL = new Set([
  "HOME_LOAN",
  "home_loan",
  "HL",
  "HL_STD",
  "HOME-LOAN",
  "home-loan",
  "prod_001",
]);

function isHL(c) {
  const raw = String(c ?? "");
  const u = raw.toUpperCase().replace(/-/g, "_");
  if (u.includes("HOME_LOAN_BT")) return false;
  return HL.has(raw) || u === "HOME_LOAN" || u === "HL" || u === "HL_STD" || u === "PROD_001";
}

function supports(ps) {
  return Array.isArray(ps) && ps.some(isHL);
}

function matrixFingerprint(lenders) {
  const rows = lenders
    .map((l) => `${l.id}|${l.code}|${JSON.stringify(l.productsSupported ?? null)}|${l.enabled}|${l.status}`)
    .sort();
  return createHash("sha256").update(rows.join("\n")).digest("hex");
}

async function main() {
  const org =
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
    }));
  if (!org) throw new Error("No organization found");
  const organizationId = org.id;

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
  const beforeHL = beforeLenders.filter((l) => l.enabled !== false && supports(l.productsSupported));
  const beforeHLCount = beforeHL.length;
  const beforeFp = matrixFingerprint(beforeLenders);
  const beforeEnabledTrue = beforeLenders.filter((l) => l.enabled === true).length;

  const byCode = new Map(beforeLenders.map((l) => [l.code, l]));
  const items = [];
  for (let i = 0; i < PRIORITY_CODES.length; i++) {
    const code = PRIORITY_CODES[i];
    const lender = byCode.get(code);
    if (!lender) throw new Error(`Missing lender code: ${code}`);
    if (!supports(lender.productsSupported)) {
      throw new Error(`Lender ${code} is not Home Loan mapped`);
    }
    if (lender.enabled === false) throw new Error(`Lender ${code} is disabled`);
    items.push({
      priorityRank: i + 1,
      lenderId: lender.id,
      lenderCode: lender.code,
      institutionName: lender.label,
      status: lender.status,
      enabled: lender.enabled,
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
  const afterHL = afterLenders.filter((l) => l.enabled !== false && supports(l.productsSupported));
  const afterFp = matrixFingerprint(afterLenders);
  const afterEnabledTrue = afterLenders.filter((l) => l.enabled === true).length;

  const saved = await prisma.enterpriseProductLenderPriority.findMany({
    where: { organizationId, productFamily: PRODUCT_FAMILY },
    orderBy: { priorityRank: "asc" },
    include: {
      lender: { select: { id: true, code: true, label: true, status: true, enabled: true } },
    },
  });

  const report = {
    sprint: "CO-HL-PROGRAM-003",
    productFamily: PRODUCT_FAMILY,
    before: {
      totalLenders: beforeCount,
      homeLoanEligible: beforeHLCount,
      enabledTrue: beforeEnabledTrue,
      matrixFingerprint: beforeFp,
    },
    after: {
      totalLenders: afterLenders.length,
      homeLoanEligible: afterHL.length,
      enabledTrue: afterEnabledTrue,
      matrixFingerprint: afterFp,
    },
    integrity: {
      lenderCountUnchanged: beforeCount === afterLenders.length,
      homeLoanEligibleUnchanged: beforeHLCount === afterHL.length,
      enabledUnchanged: beforeEnabledTrue === afterEnabledTrue,
      matrixUnchanged: beforeFp === afterFp,
      priorityCount: saved.length,
      priorityUnique: new Set(saved.map((s) => s.lenderId)).size === saved.length,
    },
    priorityTable: saved.map((s) => ({
      priority: s.priorityRank,
      institution: s.lender.label,
      lenderId: s.lenderId,
      lenderCode: s.lender.code,
      status: s.lender.status,
      enabled: s.lender.enabled,
    })),
    duplicateResolution: {
      centralBankOfIndia: {
        selected: "CBI",
        rejected: "BF_CENTRAL",
        reason:
          "CBI is the canonical public_sector_bank record with HOME_LOAN product codes aligned to the live matrix majority; BF_CENTRAL remains HL-eligible under Other Home Loan Lenders.",
      },
      bajajHousingFinance: {
        selected: "BAJAJ_HOUSING",
        rejected: "BAJAJ",
        reason:
          "BAJAJ_HOUSING is the canonical housing_finance_company record with HOME_LOAN codes; BAJAJ remains HL-eligible under Other Home Loan Lenders.",
      },
      stateBankOfIndia: {
        selected: "SBI",
        rejected: "LND-P2A-SBI",
        reason:
          "Only SBI (State Bank of India) is Home Loan–mapped. LND-P2A-SBI has productsSupported=null and is not HL-eligible, so it cannot receive HL priority.",
      },
    },
  };

  writeFileSync(
    resolve(process.cwd(), "docs/co-hl-program-001/CO-HL-PROGRAM-003-PRIORITY-APPLY-RESULT.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  console.log(JSON.stringify(report, null, 2));

  if (!report.integrity.lenderCountUnchanged) throw new Error("Lender count changed");
  if (!report.integrity.homeLoanEligibleUnchanged) throw new Error("HL eligible count changed");
  if (!report.integrity.matrixUnchanged) throw new Error("Matrix fingerprint changed");
  if (report.integrity.priorityCount !== 21) throw new Error("Expected 21 priorities");
  if (!report.integrity.priorityUnique) throw new Error("Duplicate priorities");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
