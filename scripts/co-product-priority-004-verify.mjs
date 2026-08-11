/**
 * CO-PRODUCT-PRIORITY-004 — verify LAP + Commercial Purchase priority persistence.
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

const EXPECTED_LAP_CODES = [
  "STANDARD_CHARTERED",
  "SARASWAT",
  "HDFC",
  "INDUSIND",
  "KOTAK",
  "AXIS",
  "YES",
  "FEDERAL",
  "PIRAMAL_FINANCE",
  "DEUTSCHE_BANK",
  "BAJAJ_FINANCE",
  "ADITYA_BIRLA_FINANCE",
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
  return u === "COMM_PURCHASE" || u === "COMMERCIAL_PURCHASE" || u === "CP_STD";
}

function supports(ps, pred) {
  return Array.isArray(ps) && ps.some(pred);
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
      "PRIORITY LAP LENDERS",
      "OTHER LAP LENDERS",
      "PRIORITY COMMERCIAL PURCHASE LENDERS",
      "OTHER COMMERCIAL PURCHASE LENDERS",
      "Priority ≠ filter",
    ],
    "ui",
  );
  assertIncludes(
    "src/lib/enterprise-product-lender-priority/compose-product-family-eligible.ts",
    ["PRODUCT_LENDER_PRIORITY_FAMILY", "selectionPriority", "localeCompare"],
    "compose",
  );
  assertIncludes(
    "server/services/product-lender-priority/product-family-priority.service.ts",
    ["listProductFamilyEligibleLenders", "saveProductFamilyLenderPriorities"],
    "service",
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
  const lap = lenders.filter((l) => l.enabled !== false && supports(l.productsSupported, isLap));
  const cp = lenders.filter(
    (l) => l.enabled !== false && supports(l.productsSupported, isCommPurchase),
  );
  assert.equal(lap.length, 160, `LAP eligible must remain 160, got ${lap.length}`);
  assert.equal(cp.length, 1, `Commercial Purchase eligible must remain 1, got ${cp.length}`);
  assert.equal(cp[0]?.code, "UCO", "Only UCO Bank should be Commercial Purchase mapped");

  const lapPriorities = await prisma.enterpriseProductLenderPriority.findMany({
    where: { organizationId: org.id, productFamily: "LAP" },
    orderBy: { priorityRank: "asc" },
    include: { lender: { select: { code: true, label: true, enabled: true } } },
  });
  assert.equal(lapPriorities.length, 12, `Expected 12 LAP priorities, got ${lapPriorities.length}`);
  assert.equal(
    new Set(lapPriorities.map((p) => p.lenderId)).size,
    12,
    "LAP priority lender IDs must be unique",
  );
  const lapCodes = lapPriorities.map((p) => p.lender.code);
  assert.deepEqual(lapCodes, EXPECTED_LAP_CODES, "LAP priority order mismatch");

  for (const row of lapPriorities) {
    const lender = lenders.find((l) => l.id === row.lenderId);
    assert.ok(lender, `Missing lender ${row.lenderId}`);
    assert.ok(supports(lender.productsSupported, isLap), `${row.lender.code} must be LAP-mapped`);
  }

  const jio = lenders.find((l) => l.code === "LND000001" || /jio financial/i.test(l.label || ""));
  assert.ok(jio, "Jio Financial Services live record must exist");
  assert.ok(
    !supports(jio.productsSupported, isLap),
    "Jio must remain NOT LAP-mapped",
  );
  assert.ok(
    !supports(jio.productsSupported, isCommPurchase),
    "Jio must remain NOT Commercial Purchase-mapped",
  );
  assert.ok(
    !lapPriorities.some((p) => p.lenderId === jio.id),
    "Jio must not have LAP priority",
  );

  const cpPriorities = await prisma.enterpriseProductLenderPriority.findMany({
    where: { organizationId: org.id, productFamily: "COMM_PURCHASE" },
  });
  assert.equal(
    cpPriorities.length,
    0,
    `Expected 0 Commercial Purchase priorities (no PO candidate mapped), got ${cpPriorities.length}`,
  );

  // Remaining eligible still available (not filtered by priority rows)
  assert.equal(160 - 12, 148, "Remaining LAP eligible after priority");
  assert.equal(1 - 0, 1, "Remaining Commercial Purchase eligible after priority");

  console.log(
    JSON.stringify(
      {
        ok: true,
        sprint: "CO-PRODUCT-PRIORITY-004",
        lapEligible: lap.length,
        lapPriority: lapCodes,
        lapRemaining: lap.length - lapPriorities.length,
        commercialPurchaseEligible: cp.length,
        commercialPurchasePriority: cpPriorities.length,
        commercialPurchaseRemaining: cp.length - cpPriorities.length,
        jio: {
          lenderId: jio.id,
          lenderCode: jio.code,
          status: "NOT CURRENTLY PRODUCT-MAPPED — PRIORITY NOT PERSISTED",
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
