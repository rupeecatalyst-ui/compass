/**
 * CO-HL-PROGRAM-003 — verify priority persistence + eligibility population unchanged.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(root, ".env.local") });
config({ path: path.join(root, ".env") });

const prisma = new PrismaClient();
const PRODUCT_FAMILY = "HOME_LOAN";

const EXPECTED_CODES = [
  "CBI",
  "HSBC",
  "HDFC",
  "SHINHAN_BANK",
  "SBI",
  "BOI",
  "AXIS",
  "ICICI",
  "BAJAJ_HOUSING",
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
    "src/components/catalyst-one/admin/home-loan-lender-priority-workspace.tsx",
    ["Home Loan — Priority Lenders", "Other Home Loan Lenders", "Priority ≠ filter"],
    "ui",
  );
  assertIncludes(
    "src/lib/enterprise-product-lender-priority/compose-home-loan-eligible.ts",
    ["homeLoanSelectionPriority", "localeCompare"],
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
  const hl = lenders.filter((l) => l.enabled !== false && supports(l.productsSupported));
  assert.equal(hl.length, 195, `HL eligible must remain 195, got ${hl.length}`);

  const priorities = await prisma.enterpriseProductLenderPriority.findMany({
    where: { organizationId: org.id, productFamily: PRODUCT_FAMILY },
    orderBy: { priorityRank: "asc" },
    include: { lender: { select: { code: true, label: true, enabled: true } } },
  });

  assert.equal(priorities.length, 21, "must have exactly 21 priority rows");
  assert.equal(
    new Set(priorities.map((p) => p.lenderId)).size,
    21,
    "priority lender IDs must be unique",
  );

  for (let i = 0; i < EXPECTED_CODES.length; i++) {
    const row = priorities[i];
    assert.equal(row.priorityRank, i + 1, `rank ${i + 1}`);
    assert.equal(row.lender.code, EXPECTED_CODES[i], `code at rank ${i + 1}`);
    assert.equal(row.lender.enabled, true, `${EXPECTED_CODES[i]} must stay enabled`);
  }

  // Rejected duplicates remain HL-eligible and unranked
  const bajaj = lenders.find((l) => l.code === "BAJAJ");
  const bfCentral = lenders.find((l) => l.code === "BF_CENTRAL");
  assert.ok(bajaj && supports(bajaj.productsSupported), "BAJAJ remains HL-mapped");
  assert.ok(bfCentral && supports(bfCentral.productsSupported), "BF_CENTRAL remains HL-mapped");
  assert.ok(
    !priorities.some((p) => p.lender.code === "BAJAJ"),
    "BAJAJ must not be in priority set",
  );
  assert.ok(
    !priorities.some((p) => p.lender.code === "BF_CENTRAL"),
    "BF_CENTRAL must not be in priority set",
  );

  const fp = createHash("sha256")
    .update(
      lenders
        .map((l) => `${l.id}|${l.code}|${JSON.stringify(l.productsSupported ?? null)}`)
        .sort()
        .join("\n"),
    )
    .digest("hex");

  const applyPath = path.join(
    root,
    "docs/co-hl-program-001/CO-HL-PROGRAM-003-PRIORITY-APPLY-RESULT.json",
  );
  assert.ok(fs.existsSync(applyPath), "apply result artifact required");
  const apply = JSON.parse(fs.readFileSync(applyPath, "utf8"));
  assert.equal(apply.before.homeLoanEligible, 195);
  assert.equal(apply.after.homeLoanEligible, 195);
  assert.equal(apply.integrity.matrixUnchanged, true);

  console.log("CO-HL-PROGRAM-003 verify PASSED");
  console.log(` - Priority rows: ${priorities.length}`);
  console.log(` - HL eligible: ${hl.length}`);
  console.log(` - Matrix fingerprint present: ${fp.slice(0, 12)}…`);
  console.log(" - Rejected duplicates remain available (BAJAJ, BF_CENTRAL)");
  console.log(" - No deploy · No Home Loan program create");
}

main()
  .catch((e) => {
    console.error("CO-HL-PROGRAM-003 verify FAILED");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
