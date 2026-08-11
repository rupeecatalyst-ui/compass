/**
 * CO-UBL-PRIORITY-001 — verify Unsecured Business Loan priority persistence.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(root, ".env.local") });
config({ path: path.join(root, ".env") });

const prisma = new PrismaClient();
const PRODUCT_FAMILY = "BUSINESS_LOAN_UNSECURED";

const EXPECTED_CODES = [
  "AXIS",
  "BAJAJ_FINANCE",
  "CLIX_CAPITAL",
  "CREDIT_SAISON",
  "DCB",
  "DEUTSCHE_BANK",
  "EDELWEISS",
  "SMFG_INDIA",
  "HDFC",
  "HDB_FINANCIAL",
  "ICICI",
  "TATA_CAPITAL",
  "STANDARD_CHARTERED",
  "YES",
  "LT_FINANCE",
  "IDFC_FIRST",
  "FLEXILOANS",
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

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assertIncludes(rel, needles, label) {
  const src = read(rel);
  for (const n of needles) {
    assert.ok(src.includes(n), `${label}: missing ${JSON.stringify(n)} in ${rel}`);
  }
}

async function main() {
  assertIncludes(
    "src/components/catalyst-one/admin/product-lender-priority-workspace.tsx",
    [
      "PRIORITY UNSECURED BUSINESS LOAN LENDERS",
      "OTHER UNSECURED BUSINESS LOAN LENDERS",
      "BUSINESS_LOAN_UNSECURED",
      "Priority ≠ filter",
    ],
    "ui",
  );
  assertIncludes(
    "src/lib/enterprise-product-lender-priority/compose-product-family-eligible.ts",
    ["BUSINESS_LOAN_UNSECURED", "selectionPriority"],
    "compose",
  );

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
  assert.ok(org, "organization required");

  const lenders = await prisma.enterpriseLender.findMany({
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
  const ubl = lenders.filter((l) => l.enabled !== false && supports(l.productsSupported));
  assert.equal(ubl.length, 236, `UBL eligible must remain 236, got ${ubl.length}`);

  const priorities = await prisma.enterpriseProductLenderPriority.findMany({
    where: { organizationId: org.id, productFamily: PRODUCT_FAMILY },
    orderBy: { priorityRank: "asc" },
    include: {
      lender: {
        select: { code: true, label: true, enabled: true, productsSupported: true },
      },
    },
  });
  assert.equal(priorities.length, 17, `Expected 17 UBL priorities, got ${priorities.length}`);
  assert.equal(
    new Set(priorities.map((p) => p.lenderId)).size,
    17,
    "UBL priority lender IDs must be unique",
  );

  for (let i = 0; i < priorities.length; i++) {
    assert.equal(priorities[i].priorityRank, i + 1, `Rank gap at ${i}`);
    assert.equal(priorities[i].lender.code, EXPECTED_CODES[i], `Code mismatch at ${i + 1}`);
    assert.ok(
      supports(priorities[i].lender.productsSupported),
      `${priorities[i].lender.code} must be UBL mapped`,
    );
  }

  const tata = priorities.find((p) => p.lender.code === "TATA_CAPITAL");
  assert.ok(tata, "TATA_CAPITAL must be in UBL priority");
  assert.equal(tata.lender.label, "Tata Capital");
  assert.ok(
    !priorities.some((p) => p.lender.code === "TATA_CAPITAL_HFL"),
    "Tata Capital Housing Finance must not receive UBL priority",
  );

  const priorityIds = new Set(priorities.map((p) => p.lenderId));
  const other = ubl.filter((l) => !priorityIds.has(l.id));
  assert.equal(other.length, 219, `Expected 219 other UBL lenders, got ${other.length}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        sprint: "CO-UBL-PRIORITY-001",
        ublEligible: ubl.length,
        priorityCount: priorities.length,
        priorityOrder: priorities.map((p) => ({
          priority: p.priorityRank,
          institution: p.lender.label,
          lenderId: p.lenderId,
          lenderCode: p.lender.code,
        })),
        otherUblLenders: other.length,
        tataCapitalResolution: {
          requested: "Tata Capital Finance",
          resolvedLabel: tata.lender.label,
          lenderCode: tata.lender.code,
          lenderId: tata.lenderId,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
