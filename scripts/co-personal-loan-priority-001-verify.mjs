/**
 * CO-PERSONAL-LOAN-PRIORITY-001 — verify Personal Loan priority persistence.
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
const PRODUCT_FAMILY = "PERSONAL_LOAN";

const EXPECTED_CODES = [
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

function isPersonalLoan(code) {
  const raw = String(code ?? "");
  const u = raw.toUpperCase().replace(/-/g, "_");
  return (
    u === "PERSONAL_LOAN" ||
    u === "PL_STD" ||
    u === "PL" ||
    raw === "PERSONAL-LOAN" ||
    u === "PERSONALLOAN"
  );
}

function supports(ps) {
  return Array.isArray(ps) && ps.some(isPersonalLoan);
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
      "PRIORITY PERSONAL LOAN LENDERS",
      "OTHER PERSONAL LOAN LENDERS",
      "PERSONAL_LOAN",
      "Priority ≠ filter",
    ],
    "ui",
  );
  assertIncludes(
    "src/lib/enterprise-product-lender-priority/compose-product-family-eligible.ts",
    ["PERSONAL_LOAN", "selectionPriority"],
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
  const pl = lenders.filter((l) => l.enabled !== false && supports(l.productsSupported));
  assert.equal(pl.length, 197, `Personal Loan eligible must remain 197, got ${pl.length}`);

  const priorities = await prisma.enterpriseProductLenderPriority.findMany({
    where: { organizationId: org.id, productFamily: PRODUCT_FAMILY },
    orderBy: { priorityRank: "asc" },
    include: { lender: { select: { code: true, label: true, enabled: true, productsSupported: true } } },
  });
  assert.equal(priorities.length, 11, `Expected 11 PL priorities, got ${priorities.length}`);
  assert.equal(
    new Set(priorities.map((p) => p.lenderId)).size,
    11,
    "PL priority lender IDs must be unique",
  );

  for (let i = 0; i < priorities.length; i++) {
    assert.equal(priorities[i].priorityRank, i + 1, `Rank gap at ${i}`);
    assert.equal(priorities[i].lender.code, EXPECTED_CODES[i], `Code mismatch at ${i + 1}`);
    assert.ok(
      supports(priorities[i].lender.productsSupported),
      `${priorities[i].lender.code} must be Personal Loan mapped`,
    );
  }

  // Non-priority PL lenders still exist in eligible population
  const priorityIds = new Set(priorities.map((p) => p.lenderId));
  const other = pl.filter((l) => !priorityIds.has(l.id));
  assert.equal(other.length, 186, `Expected 186 other PL lenders, got ${other.length}`);
  assert.ok(other.length > 0, "Other Personal Loan lenders must remain available");

  console.log(
    JSON.stringify(
      {
        ok: true,
        sprint: "CO-PERSONAL-LOAN-PRIORITY-001",
        personalLoanEligible: pl.length,
        priorityCount: priorities.length,
        priorityOrder: priorities.map((p) => ({
          priority: p.priorityRank,
          institution: p.lender.label,
          lenderId: p.lenderId,
          lenderCode: p.lender.code,
        })),
        otherPersonalLoanLenders: other.length,
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
