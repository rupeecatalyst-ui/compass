/**
 * CO-LR-010 — Enterprise Lender Registry Completion Programme (additive only).
 *
 * Phase 1: Validate approved master catalogue (275)
 * Phase 2: Create missing lenders (no deletes / no ID rewrites / no BF_* reuse)
 * Phase 3: Baseline commercial programmes (create-missing)
 * Phase 4: Fill-missing metadata only
 * Phase 5: Policy fields left NULL (never invent)
 * Phase 6: Report presentation duplicates (no physical merge)
 * Phase 7–8: Re-run audit expectations
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/co-lr-010-complete-registry.mts
 *   node --env-file=.env.local --import tsx scripts/co-lr-010-complete-registry.mts --apply
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Prisma,
  PrismaClient,
  type LenderInstitutionCategory,
  type LenderMasterClassification,
} from "@prisma/client";
import {
  LENDER_MASTER_SEED_CATALOG,
  countLenderMasterSeedByClassification,
} from "../src/constants/enterprise-lender-registry/master-seed-catalog";
import { normalizeSupportedProductCodes } from "../src/constants/enterprise-lender-registry/baseline-commercial-program-seed";
import { LENDER_MASTER_CLASSIFICATION_LABELS } from "../src/types/enterprise-lender-registry";
import { normalizeLenderRegistryCode } from "../server/repositories/lender-registry/mappers";
import {
  getLenderCategorySeeds,
  getLenderSeeds,
} from "../server/services/tier2-registry/seed-catalog";
import { seedBaselineCommercialPrograms } from "../server/services/tier2-registry/seed-baseline-commercial-programs.service";
import {
  dedupeLendersForSelection,
  resolveLenderSelectionFamilyKey,
} from "../src/lib/enterprise-lender-registry/presentation-canonical";

const APPLY = process.argv.includes("--apply");
const ACTOR = "system-co-lr-010";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "co-lr-010");

const prisma = new PrismaClient();

function isProvisionalCode(code: string): boolean {
  const c = code.trim().toUpperCase();
  return (
    c.startsWith("BF_") ||
    c.startsWith("BF-") ||
    c.startsWith("LND-P2A-") ||
    c.startsWith("LND_P2A_")
  );
}

function normalizeLoose(value?: string | null): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function nameKeysForSeed(seed: {
  label: string;
  displayName?: string | null;
  legalName?: string | null;
  aliases?: string[] | null;
}): Set<string> {
  return new Set(
    [seed.label, seed.displayName, seed.legalName, ...(seed.aliases ?? [])]
      .filter(Boolean)
      .map((s) => normalizeLoose(String(s)))
      .filter(Boolean),
  );
}

function rowNameKeys(row: {
  label: string;
  displayName: string | null;
  legalName: string | null;
  aliases: unknown;
}): string[] {
  const aliases = Array.isArray(row.aliases)
    ? row.aliases.filter((x): x is string => typeof x === "string")
    : [];
  return [row.label, row.displayName, row.legalName, ...aliases]
    .filter(Boolean)
    .map((s) => normalizeLoose(String(s)));
}

function prismaClassification(
  classification: string | null | undefined,
): LenderMasterClassification | null {
  if (!classification || classification === "foreign_bank") return null;
  return classification as LenderMasterClassification;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

async function main() {
  const phase1 = {
    catalogTotal: LENDER_MASTER_SEED_CATALOG.length,
    uniqueSeedKeys: new Set(LENDER_MASTER_SEED_CATALOG.map((l) => l.seedKey)).size,
    getLenderSeeds: getLenderSeeds().length,
    byClassification: countLenderMasterSeedByClassification(),
    emptyProducts: LENDER_MASTER_SEED_CATALOG.filter(
      (l) => !l.productsSupported?.length,
    ).length,
    additionalLendersRecommended: [] as string[],
    validated: false,
    notes: [] as string[],
  };

  phase1.validated =
    phase1.catalogTotal === 275 &&
    phase1.uniqueSeedKeys === 275 &&
    phase1.getLenderSeeds === 275 &&
    phase1.emptyProducts === 0 &&
    phase1.byClassification.public_sector_bank >= 12 &&
    phase1.byClassification.private_sector_bank >= 20 &&
    phase1.byClassification.foreign_bank >= 20 &&
    phase1.byClassification.small_finance_bank >= 10 &&
    phase1.byClassification.housing_finance_company >= 25 &&
    phase1.byClassification.nbfc >= 80 &&
    phase1.byClassification.cooperative_bank >= 50 &&
    phase1.byClassification.payments_bank >= 4;

  phase1.notes.push(
    "Approved Enterprise Lender Master = LENDER_MASTER_SEED_CATALOG (CO-LR-006 + CO-LR-008).",
  );
  phase1.notes.push(
    "No additional lenders proposed beyond the approved 275 — PO may request later expansions separately.",
  );
  phase1.notes.push(
    "Prisma LenderMasterClassification has no foreign_bank enum; Foreign Banks use categoryCode foreign_bank with classification=null.",
  );

  if (!phase1.validated) {
    console.error(JSON.stringify({ ok: false, phase: 1, phase1 }, null, 2));
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        phase: 1,
        status: "VALIDATED",
        apply: APPLY,
        catalogTotal: phase1.catalogTotal,
        byClassification: phase1.byClassification,
      },
      null,
      2,
    ),
  );

  const org = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!org) throw new Error("No organization found.");

  const beforeLenders = await prisma.enterpriseLender.findMany({
    where: { organizationId: org.id },
    select: {
      id: true,
      code: true,
      label: true,
      displayName: true,
      legalName: true,
      shortName: true,
      aliases: true,
      tags: true,
      website: true,
      headquartersLabel: true,
      productsSupported: true,
      categoryId: true,
      institutionCategory: true,
      classification: true,
      status: true,
      enabled: true,
      lifecycleStatus: true,
      operationalStatus: true,
      isDeleted: true,
    },
  });

  // —— Categories (create-missing) ——
  const categoryIds = new Map<string, string>();
  let categoriesCreated = 0;
  for (const seed of getLenderCategorySeeds()) {
    const code = normalizeLenderRegistryCode(seed.code);
    const existing = await prisma.enterpriseLenderCategory.findUnique({
      where: { organizationId_code: { organizationId: org.id, code } },
    });
    if (existing) {
      categoryIds.set(code, existing.id);
      continue;
    }
    if (!APPLY) {
      categoryIds.set(code, `pending:${code}`);
      categoriesCreated += 1;
      continue;
    }
    const created = await prisma.enterpriseLenderCategory.create({
      data: {
        organizationId: org.id,
        code,
        label: seed.label,
        sortOrder: seed.sortOrder,
        status: "active",
        enabled: true,
        createdBy: ACTOR,
        modifiedBy: ACTOR,
      },
    });
    categoryIds.set(code, created.id);
    categoriesCreated += 1;
  }

  // —— Phase 2 lenders ——
  let created = 0;
  let linkedExisting = 0;
  let skipped = 0;
  let fillMissingMeta = 0;
  const createdCodes: string[] = [];
  const linkedCodes: string[] = [];

  const seeds = getLenderSeeds();

  for (const seed of seeds) {
    const code = normalizeLenderRegistryCode(seed.code);
    const categoryId = categoryIds.get(normalizeLenderRegistryCode(seed.categoryCode));
    if (!code || !categoryId || categoryId.startsWith("pending:")) {
      if (!APPLY && code) {
        // dry-run still counts would-create below
      } else {
        skipped += 1;
        continue;
      }
    }

    const byCode = beforeLenders.find(
      (r) => !r.isDeleted && normalizeLenderRegistryCode(r.code) === code,
    );

    const seedNames = nameKeysForSeed(seed);
    const byName = beforeLenders.find((r) => {
      if (r.isDeleted) return false;
      if (isProvisionalCode(r.code)) return false;
      return rowNameKeys(r).some((k) => seedNames.has(k));
    });

    const existing = byCode ?? byName ?? null;

    // Only BF_*/P2A name match → still create canonical code row
    const provisionalOnlyMatch =
      !byCode &&
      !byName &&
      beforeLenders.some((r) => {
        if (r.isDeleted || !isProvisionalCode(r.code)) return false;
        return rowNameKeys(r).some((k) => seedNames.has(k));
      });

    if (existing) {
      linkedExisting += 1;
      linkedCodes.push(existing.code);

      if (APPLY) {
        const tags = asStringArray(existing.tags);
        const seedTag = `seed:${seed.code.toLowerCase()}`;
        const nextTags = tags.includes(seedTag) ? tags : [...tags, seedTag, "co-lr-010"];
        const products = asStringArray(existing.productsSupported);
        const data: Prisma.EnterpriseLenderUpdateInput = {
          modifiedBy: ACTOR,
        };
        let changed = false;
        if (!existing.website && seed.website) {
          data.website = seed.website;
          changed = true;
        }
        if (!existing.headquartersLabel && seed.headquartersLabel) {
          data.headquartersLabel = seed.headquartersLabel;
          changed = true;
        }
        if (!existing.shortName && seed.shortName) {
          data.shortName = seed.shortName;
          changed = true;
        }
        if (products.length === 0 && (seed.productsSupported?.length ?? 0) > 0) {
          data.productsSupported = seed.productsSupported as Prisma.InputJsonValue;
          changed = true;
        }
        if (nextTags.length !== tags.length) {
          data.tags = nextTags as Prisma.InputJsonValue;
          changed = true;
        }
        // Publish gate for non-provisional catalog matches only (status fields — keep ID/code)
        if (!isProvisionalCode(existing.code)) {
          if (existing.status !== "active") {
            data.status = "active";
            changed = true;
          }
          if (!existing.enabled) {
            data.enabled = true;
            changed = true;
          }
          if (existing.lifecycleStatus !== "active") {
            data.lifecycleStatus = "active";
            changed = true;
          }
          if (existing.operationalStatus !== "active") {
            data.operationalStatus = "active";
            changed = true;
          }
          if (!existing.classification && seed.classification && seed.classification !== "foreign_bank") {
            data.classification = prismaClassification(seed.classification);
            changed = true;
          }
        }
        if (changed) {
          await prisma.enterpriseLender.update({
            where: { id: existing.id },
            data,
          });
          fillMissingMeta += 1;
        }
      }
      continue;
    }

    // Create missing canonical lender
    created += 1;
    createdCodes.push(code);
    if (!APPLY) continue;
    if (!categoryId || categoryId.startsWith("pending:")) {
      skipped += 1;
      continue;
    }

    await prisma.enterpriseLender.create({
      data: {
        organizationId: org.id,
        code,
        categoryId,
        label: seed.label,
        legalName: seed.legalName ?? seed.label,
        displayName: seed.displayName ?? seed.label,
        shortName: seed.shortName ?? null,
        aliases: seed.aliases ?? undefined,
        institutionCategory: seed.institutionCategory as LenderInstitutionCategory,
        classification: prismaClassification(seed.classification),
        website: seed.website ?? null,
        headquartersLabel: seed.headquartersLabel ?? null,
        productsSupported: seed.productsSupported ?? undefined,
        tags: ["co-lr-010", `seed:${seed.code.toLowerCase()}`] as Prisma.InputJsonValue,
        sortOrder: seed.sortOrder,
        lifecycleStatus: "active",
        operationalStatus: "active",
        status: "active",
        enabled: true,
        createdBy: ACTOR,
        modifiedBy: ACTOR,
      },
    });

    if (provisionalOnlyMatch) {
      // noted in report — presentation family may temporarily include BF_* + canonical
    }
  }

  // —— Phase 3 programmes ——
  let programResult: Awaited<ReturnType<typeof seedBaselineCommercialPrograms>> | null =
    null;
  if (APPLY) {
    programResult = await seedBaselineCommercialPrograms();
  }

  // —— Post state ——
  const afterLenders = await prisma.enterpriseLender.findMany({
    where: { organizationId: org.id, isDeleted: false },
    select: {
      id: true,
      code: true,
      displayName: true,
      label: true,
      legalName: true,
      shortName: true,
      aliases: true,
      status: true,
      enabled: true,
      lifecycleStatus: true,
      operationalStatus: true,
      tags: true,
      programs: {
        where: { isDeleted: false },
        select: { id: true, productCode: true, enabled: true, status: true },
      },
    },
  });

  const catalogCodes = new Set(
    getLenderSeeds().map((s) => normalizeLenderRegistryCode(s.code)),
  );
  const afterCodes = new Set(
    afterLenders.map((l) => normalizeLenderRegistryCode(l.code)),
  );
  const missingCodes = [...catalogCodes].filter((c) => !afterCodes.has(c));

  // Name-linked catalog coverage (non-provisional)
  let catalogSatisfied = 0;
  for (const seed of getLenderSeeds()) {
    const code = normalizeLenderRegistryCode(seed.code);
    if (afterCodes.has(code)) {
      catalogSatisfied += 1;
      continue;
    }
    const names = nameKeysForSeed(seed);
    const hit = afterLenders.some(
      (r) =>
        !isProvisionalCode(r.code) &&
        rowNameKeys(r).some((k) => names.has(k)),
    );
    if (hit) catalogSatisfied += 1;
  }

  const uiVisible = afterLenders.filter(
    (l) =>
      !isProvisionalCode(l.code) &&
      l.status === "active" &&
      l.enabled &&
      l.lifecycleStatus === "active" &&
      (!l.operationalStatus || l.operationalStatus === "active"),
  );

  const withPrograms = afterLenders.filter((l) => l.programs.length > 0);
  const catalogWithPrograms = afterLenders.filter(
    (l) =>
      catalogCodes.has(normalizeLenderRegistryCode(l.code)) && l.programs.length > 0,
  );

  // Presentation duplicates
  const familyMap = new Map<string, typeof afterLenders>();
  for (const l of afterLenders) {
    const family = resolveLenderSelectionFamilyKey({
      id: l.id,
      code: l.code,
      label: l.displayName || l.label,
      displayName: l.displayName,
      legalName: l.legalName,
      shortName: l.shortName,
      aliases: asStringArray(l.aliases),
      enabled: l.enabled,
    });
    const list = familyMap.get(family) ?? [];
    list.push(l);
    familyMap.set(family, list);
  }
  const duplicateFamilies = [...familyMap.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([family, members]) => ({
      family,
      survivor: dedupeLendersForSelection(
        members.map((m) => ({
          id: m.id,
          code: m.code,
          label: m.displayName || m.label,
          displayName: m.displayName,
          legalName: m.legalName,
          shortName: m.shortName,
          aliases: asStringArray(m.aliases),
          enabled: m.enabled,
        })),
      )[0]?.id,
      members: members.map((m) => ({
        id: m.id,
        code: m.code,
        displayName: m.displayName || m.label,
        provisional: isProvisionalCode(m.code),
      })),
    }));

  const afterDedupeUi = dedupeLendersForSelection(
    uiVisible.map((l) => ({
      id: l.id,
      code: l.code,
      label: l.displayName || l.label,
      displayName: l.displayName,
      legalName: l.legalName,
      shortName: l.shortName,
      aliases: asStringArray(l.aliases),
      enabled: l.enabled,
    })),
  );

  const summary = {
    programme: "CO-LR-010",
    apply: APPLY,
    productionDataProtection: {
      deletes: false,
      idRewrites: false,
      fkChanges: false,
      truncate: false,
      inventedPolicyValues: false,
      mode: APPLY ? "additive_apply" : "dry_run",
    },
    phase1,
    before: {
      totalRows: beforeLenders.length,
      nonDeleted: beforeLenders.filter((l) => !l.isDeleted).length,
    },
    phase2: {
      categoriesCreated,
      lendersCreated: created,
      linkedExistingNonProvisional: linkedExisting,
      fillMissingMetaUpdates: fillMissingMeta,
      skipped,
      createdCodes: createdCodes.slice(0, 50),
      createdCodesTotal: createdCodes.length,
      stillMissingExactCodes: missingCodes.length,
      catalogSatisfiedApprox: catalogSatisfied,
    },
    phase3: programResult,
    phase6: {
      presentationDuplicateFamilies: duplicateFamilies.length,
      duplicateFamilies: duplicateFamilies.slice(0, 30),
      note: "Physical merge blocked — CO-LR-008 presentation survivors only.",
    },
    after: {
      nonDeleted: afterLenders.length,
      uiVisiblePublishedActive: uiVisible.length,
      uiVisibleAfterPresentationDedupe: afterDedupeUi.length,
      lendersWithPrograms: withPrograms.length,
      catalogCodeRowsWithPrograms: catalogWithPrograms.length,
      catalogSize: phase1.catalogTotal,
      missingExactCatalogCodes: missingCodes,
    },
    expectations: {
      approvedMaster: 275,
      liveRegistryTarget: "≥275 non-deleted including catalogue coverage",
      missingExactCodesTarget: 0,
      programmeCoverageNote:
        "100% of catalogue-matched lenders should have ≥1 programme after apply",
    },
  };

  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "CO-LR-010-COMPLETION-SUMMARY.json");
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), "utf8");

  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nWrote ${path.relative(root, jsonPath)}`);
  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to execute additive writes.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
