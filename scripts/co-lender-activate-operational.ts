/**
 * Activate operational lenders in Enterprise Lender Registry (Prisma SSOT).
 *
 * 1. Ensure master catalog lenders exist (create missing only — no metadata rewrite).
 * 2. Activate operational inventory (status + lifecycle + operational + enabled).
 * 3. Deactivate provisional / test / archived / not-onboarded rows.
 *
 * Does NOT modify products, programmes, policies, codes, or IDs.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/co-lender-activate-operational.ts
 *   npx tsx --env-file=.env.local scripts/co-lender-activate-operational.ts --apply
 */
import { PrismaClient, type LenderInstitutionCategory } from "@prisma/client";
import { LENDER_MASTER_SEED_CATALOG } from "../src/constants/enterprise-lender-registry/master-seed-catalog";
import { normalizeLenderRegistryCode } from "../server/repositories/lender-registry/mappers";
import {
  getLenderCategorySeeds,
  getLenderSeeds,
} from "../server/services/tier2-registry/seed-catalog";

const APPLY = process.argv.includes("--apply");
const ACTOR = "system-co-lender-activate-ops";

const prisma = new PrismaClient();

function isPickerEligible(row: {
  isDeleted: boolean;
  status: string;
  enabled: boolean;
  lifecycleStatus: string;
  operationalStatus: string | null;
}): boolean {
  return (
    !row.isDeleted &&
    row.status === "active" &&
    row.enabled === true &&
    row.lifecycleStatus === "active" &&
    (!row.operationalStatus || row.operationalStatus === "active")
  );
}

/** Non-operational: leave / force inactive. */
function nonOperationalReason(row: {
  code: string;
  label: string;
  displayName: string | null;
  shortName: string | null;
  legalName: string | null;
  lifecycleStatus: string;
  status: string;
  isDeleted: boolean;
  aliases: unknown;
}): string | null {
  if (row.isDeleted) return "deleted";
  if (row.lifecycleStatus === "retired") return "retired";
  if (row.lifecycleStatus === "suspended") return "suspended";
  if (row.status === "archived") return "archived_status";

  const code = (row.code || "").trim().toUpperCase();
  if (code.startsWith("BF_") || code.startsWith("BF-")) return "provisional_bf_not_onboarded";
  if (code.startsWith("LND-P2A-") || code.startsWith("LND_P2A_")) return "phase2a_test_fixture";

  const hay = [
    row.code,
    row.label,
    row.displayName,
    row.shortName,
    row.legalName,
    ...(Array.isArray(row.aliases) ? (row.aliases as string[]) : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(test|demo|uat|sample|training|dummy|placeholder)\b/.test(hay)) {
    return "test_or_demo";
  }
  if (/\b(discontinued|archived|retired|decommissioned)\b/.test(hay)) {
    return "discontinued_label";
  }
  return null;
}

async function ensureCategories(organizationId: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const seed of getLenderCategorySeeds()) {
    const code = normalizeLenderRegistryCode(seed.code);
    const existing = await prisma.enterpriseLenderCategory.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    if (existing) {
      map.set(code, existing.id);
      // Activate category for pickers that depend on category enabled — status fields only.
      if (APPLY && (existing.status !== "active" || !existing.enabled)) {
        await prisma.enterpriseLenderCategory.update({
          where: { id: existing.id },
          data: { status: "active", enabled: true, modifiedBy: ACTOR },
        });
      }
      continue;
    }
    if (!APPLY) {
      map.set(code, `pending:${code}`);
      continue;
    }
    const created = await prisma.enterpriseLenderCategory.create({
      data: {
        organizationId,
        code,
        label: seed.label,
        sortOrder: seed.sortOrder,
        status: "active",
        enabled: true,
        createdBy: ACTOR,
        modifiedBy: ACTOR,
      },
    });
    map.set(code, created.id);
  }
  return map;
}

async function ensureCatalogLenders(
  organizationId: string,
  categoryIds: Map<string, string>,
): Promise<{ created: number; alreadyPresent: number; skippedMissingCategory: number }> {
  let created = 0;
  let alreadyPresent = 0;
  let skippedMissingCategory = 0;
  const seeds = getLenderSeeds();

  for (const seed of seeds) {
    const code = normalizeLenderRegistryCode(seed.code);
    const categoryId = categoryIds.get(normalizeLenderRegistryCode(seed.categoryCode));
    if (!code) continue;

    const existing = await prisma.enterpriseLender.findUnique({
      where: { organizationId_code: { organizationId, code } },
    });
    if (existing) {
      alreadyPresent += 1;
      continue;
    }

    if (!categoryId || categoryId.startsWith("pending:")) {
      // Dry-run: categories would be created before lenders on --apply.
      if (!APPLY) {
        created += 1;
        continue;
      }
      skippedMissingCategory += 1;
      continue;
    }

    if (!APPLY) {
      created += 1;
      continue;
    }

    await prisma.enterpriseLender.create({
      data: {
        organizationId,
        code,
        categoryId,
        label: seed.label,
        legalName: seed.legalName ?? seed.label,
        displayName: seed.displayName ?? seed.label,
        shortName: seed.shortName ?? null,
        aliases: seed.aliases ?? undefined,
        institutionCategory: seed.institutionCategory as LenderInstitutionCategory,
        classification: seed.classification ?? null,
        website: seed.website ?? null,
        headquartersLabel: seed.headquartersLabel ?? null,
        productsSupported: seed.productsSupported ?? undefined,
        sortOrder: seed.sortOrder,
        lifecycleStatus: "active",
        operationalStatus: "active",
        status: "active",
        enabled: true,
        createdBy: ACTOR,
        modifiedBy: ACTOR,
      },
    });
    created += 1;
  }

  return { created, alreadyPresent, skippedMissingCategory };
}

async function main() {
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!org) throw new Error("No organization found.");

  const before = await prisma.enterpriseLender.findMany({
    where: { organizationId: org.id },
  });
  const pickerBefore = before.filter(isPickerEligible).length;

  const categoryIds = await ensureCategories(org.id);
  const ensure = await ensureCatalogLenders(org.id, categoryIds);

  const all = await prisma.enterpriseLender.findMany({
    where: { organizationId: org.id },
  });

  const catalogCodes = new Set(
    getLenderSeeds().map((s) => normalizeLenderRegistryCode(s.code)),
  );

  let activated = 0;
  let deactivated = 0;
  let alreadyActive = 0;
  const remainInactive: { code: string; reason: string }[] = [];

  for (const row of all) {
    const reason = nonOperationalReason(row);
    if (reason) {
      remainInactive.push({ code: row.code, reason });
      if (isPickerEligible(row) || row.status === "active" || row.enabled) {
        if (APPLY) {
          await prisma.enterpriseLender.update({
            where: { id: row.id },
            data: {
              status: "inactive",
              enabled: false,
              operationalStatus: "inactive",
              modifiedBy: ACTOR,
            },
          });
        }
        deactivated += 1;
      }
      continue;
    }

    const inCatalog = catalogCodes.has(normalizeLenderRegistryCode(row.code));
    const alreadyLive =
      row.status === "active" &&
      row.enabled &&
      row.lifecycleStatus === "active";

    // Operational = master catalog, or legacy rows already live (e.g. BAJAJ).
    if (!inCatalog && !alreadyLive) {
      remainInactive.push({ code: row.code, reason: "not_yet_onboarded" });
      continue;
    }

    if (isPickerEligible(row)) {
      alreadyActive += 1;
      continue;
    }

    if (APPLY) {
      await prisma.enterpriseLender.update({
        where: { id: row.id },
        data: {
          status: "active",
          enabled: true,
          lifecycleStatus: "active",
          operationalStatus: "active",
          modifiedBy: ACTOR,
        },
      });
    }
    activated += 1;
  }

  const after = APPLY
    ? await prisma.enterpriseLender.findMany({ where: { organizationId: org.id } })
    : all;
  const pickerAfterEstimate = APPLY
    ? after.filter(isPickerEligible).length
    : alreadyActive + activated + ensure.created;

  const report = {
    apply: APPLY,
    organizationId: org.id,
    masterCatalogSize: LENDER_MASTER_SEED_CATALOG.length,
    ensureMissing: ensure,
    before: {
      total: before.length,
      pickerEligible: pickerBefore,
    },
    actions: {
      createdMissing: ensure.created,
      activated,
      alreadyActive,
      deactivatedNonOperational: deactivated,
      remainInactive: remainInactive.length,
      remainInactiveBreakdown: remainInactive.reduce<Record<string, number>>((acc, r) => {
        acc[r.reason] = (acc[r.reason] || 0) + 1;
        return acc;
      }, {}),
    },
    after: {
      pickerEligible: APPLY ? after.filter(isPickerEligible).length : pickerAfterEstimate,
      note:
        "pickerEligible should equal operational inventory (master catalog + any legacy live non-test lenders; excludes BF_/LND-P2A_/test/archived).",
    },
  };

  console.log(JSON.stringify(report, null, 2));
  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to write changes.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
