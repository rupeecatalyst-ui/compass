/**
 * CO-PR-004 — Read-only Product Registry duplicate inventory.
 * Production Data Protection: NEVER deletes, disables, or updates Product rows.
 *
 * Usage:
 *   node --env-file=.env.local scripts/co-pr-004-inventory.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeCodeKey(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

function normalizeLabelKey(label) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Mirrors canonical aliases for inventory grouping (keep in sync with canonical-catalog). */
const ALIAS_TO_CANONICAL = {
  HOME_LOAN: "HOME_LOAN",
  HL: "HOME_LOAN",
  HL_STD: "HOME_LOAN",
  PERSONAL_LOAN: "PERSONAL_LOAN",
  PL_STD: "PERSONAL_LOAN",
  LAP: "LAP",
  LAP_STD: "LAP",
  LOAN_AGAINST_PROPERTY: "LAP",
  BUSINESS_LOAN_UNSECURED: "BUSINESS_LOAN_UNSECURED",
  BUSINESS_LOAN: "BUSINESS_LOAN_UNSECURED",
  BL_STD: "BUSINESS_LOAN_UNSECURED",
  UNSECURED_BUSINESS_LOAN: "BUSINESS_LOAN_UNSECURED",
  WORKING_CAPITAL_SECURED: "WORKING_CAPITAL_SECURED",
  WORKING_CAPITAL: "WORKING_CAPITAL_SECURED",
  WC_STD: "WORKING_CAPITAL_SECURED",
  WORKING_CAPITAL_UNSECURED: "WORKING_CAPITAL_UNSECURED",
};

/** Prefer these codes as survivors when present in a family. */
const CANONICAL_PREFERRED = new Set([
  "HOME_LOAN",
  "PERSONAL_LOAN",
  "LAP",
  "BUSINESS_LOAN_UNSECURED",
  "WORKING_CAPITAL_SECURED",
  "WORKING_CAPITAL_UNSECURED",
]);

function familyKey(code, label) {
  const nk = normalizeCodeKey(code);
  if (ALIAS_TO_CANONICAL[nk]) return `canon:${ALIAS_TO_CANONICAL[nk]}`;
  return `label:${normalizeLabelKey(label)}|code:${nk}`;
}

async function main() {
  const org =
    (await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true, name: true },
    })) ||
    (await prisma.organization.findFirst({ select: { id: true, name: true } }));
  if (!org) {
    console.log(JSON.stringify({ ok: false, error: "No organization found" }, null, 2));
    process.exit(1);
  }

  const rows = await prisma.enterpriseProduct.findMany({
    where: { organizationId: org.id, isDeleted: false },
    select: {
      id: true,
      code: true,
      label: true,
      enabled: true,
      lifecycleStatus: true,
      status: true,
      createdAt: true,
    },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  const groups = new Map();
  for (const row of rows) {
    const key = familyKey(row.code, row.label);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const duplicateFamilies = [...groups.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([key, members]) => ({
      family: key,
      count: members.length,
      members: members.map((m) => ({
        id: m.id,
        code: m.code,
        label: m.label,
        enabled: m.enabled,
        lifecycleStatus: m.lifecycleStatus,
        status: m.status,
      })),
      recommendedSurvivorCode:
        members.find((m) => CANONICAL_PREFERRED.has(normalizeCodeKey(m.code)))?.code ||
        members.find((m) => !/_STD$/i.test(m.code))?.code ||
        members[0].code,
      action: "PRESERVE_ALL_ROWS — presentation dedupe only until PO approves physical merge",
    }));

  const report = {
    ok: true,
    sprint: "CO-PR-004",
    mode: "read-only-inventory",
    productionDataProtection: "no-mutations",
    organizationId: org.id,
    organizationName: org.name,
    totalActiveProducts: rows.length,
    uniqueSelectionFamilies: groups.size,
    duplicateFamilyCount: duplicateFamilies.length,
    duplicateFamilies,
    nextStep:
      duplicateFamilies.length === 0
        ? "No multi-row families found. Presentation SSOT is sufficient."
        : "PO must approve a dedicated remediation sprint before disable/merge of legacy Product rows. Opportunity/Deal FKs must be remapped first.",
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((err) => {
    console.error(JSON.stringify({ ok: false, error: String(err?.message || err) }));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
