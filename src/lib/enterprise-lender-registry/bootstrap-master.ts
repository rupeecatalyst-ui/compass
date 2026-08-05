/**
 * CO-ARCH-004 / CO-LM-003 — Bootstrap master seed into Soft Go-Live local registry.
 * Idempotent by seedKey tag; allocates immutable LND codes; merges duplicates.
 */
import {
  CO_ARCH_004_MASTER_SEED_VERSION,
  LENDER_MASTER_SEED_CATALOG,
} from "@/constants/enterprise-lender-registry/master-seed-catalog";
import { normalizeSupportedProductCodes } from "@/constants/enterprise-lender-registry/baseline-commercial-program-seed";
import { isImmutableLenderCode } from "@/lib/enterprise-lender-registry/codes";
import { localLenderRegistryStore } from "@/lib/enterprise-lender-registry/local-store";
import type { LenderMergeReport } from "@/lib/enterprise-lender-registry/merge";
import { mergeAliasLists } from "@/lib/enterprise-lender-registry/normalize";
import {
  validateLenderMaster,
  type LenderMasterValidationReport,
} from "@/lib/enterprise-lender-registry/validation";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";

export interface LenderMasterBootstrapResult {
  seedVersion: number;
  catalogSize: number;
  created: number;
  updated: number;
  codesAssigned: number;
  mergeReport: LenderMergeReport;
  validation: LenderMasterValidationReport;
}

const SEED_TAG_PREFIX = "seed:";

const CATEGORY_SEEDS: ReadonlyArray<{ code: string; label: string; sortOrder: number }> = [
  { code: "bank", label: "Bank", sortOrder: 1 },
  { code: "nbfc", label: "NBFC", sortOrder: 2 },
  { code: "hfc", label: "HFC", sortOrder: 3 },
  { code: "fintech", label: "Fintech", sortOrder: 4 },
  { code: "cooperative", label: "Cooperative", sortOrder: 5 },
  { code: "other", label: "Other", sortOrder: 6 },
  { code: "foreign_bank", label: "Foreign Bank", sortOrder: 7 },
];

function allLenders(includeDeleted = false): EnterpriseLenderRecord[] {
  return localLenderRegistryStore.queryLenders({
    pageSize: 5000,
    includeDeleted,
  }).items;
}

function findBySeedKey(
  lenders: EnterpriseLenderRecord[],
  seedKey: string,
  displayName: string,
  aliases: string[],
): EnterpriseLenderRecord | undefined {
  const tag = `${SEED_TAG_PREFIX}${seedKey}`;
  const nameKeys = new Set(
    [seedKey, displayName, ...aliases].map((s) => normalizeLoose(s)).filter(Boolean),
  );
  return lenders.find((l) => {
    if (l.isDeleted) return false;
    if ((l.tags ?? []).includes(tag)) return true;
    if (normalizeLoose(l.shortName) === normalizeLoose(seedKey)) return true;
    const keys = [l.displayName, l.label, l.legalName, ...(l.aliases ?? [])].map(normalizeLoose);
    return keys.some((k) => nameKeys.has(k));
  });
}

function normalizeLoose(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Ensure master catalog is present, LND codes assigned, duplicates merged.
 * Safe to call repeatedly (idempotent for catalog rows).
 */
export function bootstrapLenderMaster(actor = "co-arch-004"): LenderMasterBootstrapResult {
  let created = 0;
  let updated = 0;
  let codesAssigned = 0;

  const categoryIds = new Map<string, string>();
  for (const cat of CATEGORY_SEEDS) {
    const row = localLenderRegistryStore.ensureCategory({
      code: cat.code,
      label: cat.label,
      sortOrder: cat.sortOrder,
      actor,
    });
    categoryIds.set(cat.code.toUpperCase(), row.id);
    categoryIds.set(cat.code.toLowerCase(), row.id);
  }

  const fallbackCategoryId =
    categoryIds.get("bank") ??
    localLenderRegistryStore.listCategories()[0]?.id ??
    "elcat-general";

  for (const seed of LENDER_MASTER_SEED_CATALOG) {
    const existing = findBySeedKey(
      allLenders(),
      seed.seedKey,
      seed.displayName,
      seed.aliases,
    );
    const tag = `${SEED_TAG_PREFIX}${seed.seedKey}`;
    const categoryCode = (seed.categoryCode ?? seed.institutionCategory).toLowerCase();
    const categoryId =
      categoryIds.get(categoryCode) ??
      categoryIds.get(categoryCode.toUpperCase()) ??
      fallbackCategoryId;

    const tags = [
      tag,
      `co-arch-004-v${CO_ARCH_004_MASTER_SEED_VERSION}`,
      ...(seed.defaultRecord ? ["default_record", "co-lm-003"] : []),
    ];

    if (!existing) {
      localLenderRegistryStore.createLender({
        categoryId,
        label: seed.displayName,
        legalName: seed.legalName,
        displayName: seed.displayName,
        shortName: seed.shortName,
        aliases: Array.from(new Set([...(seed.aliases ?? []), seed.seedKey, seed.shortName])),
        institutionCategory: seed.institutionCategory,
        classification: seed.classification,
        website: seed.website,
        logoUrl: seed.logoUrl,
        headquartersLabel: seed.headquartersLabel,
        customerCarePhone: seed.customerCarePhone,
        customerCareEmail: seed.customerCareEmail,
        rbiRegulated: seed.rbiRegulated ?? true,
        panIndia: seed.panIndia ?? true,
        productsSupported: normalizeSupportedProductCodes(seed.productsSupported),
        tags,
        lifecycleStatus: "active",
        operationalStatus: "active",
        status: "active",
        enabled: true,
        createdBy: actor,
      });
      created += 1;
      codesAssigned += 1;
      continue;
    }

    const existingSupported = [...(existing.productsSupported ?? [])];
    const nextSupported =
      existingSupported.length === 0
        ? normalizeSupportedProductCodes(seed.productsSupported)
        : normalizeSupportedProductCodes(existingSupported);

    localLenderRegistryStore.updateLender(existing.id, {
      categoryId,
      label: seed.displayName,
      legalName: seed.legalName,
      displayName: seed.displayName,
      shortName: seed.shortName,
      aliases: mergeAliasLists(existing.aliases, [
        ...(seed.aliases ?? []),
        seed.seedKey,
        seed.shortName,
      ]),
      institutionCategory: seed.institutionCategory,
      classification: seed.classification,
      website: seed.website ?? existing.website,
      logoUrl: seed.logoUrl ?? existing.logoUrl,
      headquartersLabel: seed.headquartersLabel ?? existing.headquartersLabel,
      customerCarePhone: seed.customerCarePhone ?? existing.customerCarePhone,
      customerCareEmail: seed.customerCareEmail ?? existing.customerCareEmail,
      rbiRegulated: seed.rbiRegulated ?? true,
      panIndia: seed.panIndia ?? existing.panIndia,
      productsSupported: nextSupported,
      tags: Array.from(new Set([...(existing.tags ?? []), ...tags])),
      lifecycleStatus: existing.lifecycleStatus === "retired" ? "retired" : "active",
      operationalStatus:
        existing.operationalStatus === "inactive" ? "active" : existing.operationalStatus,
      status: existing.status === "archived" ? "archived" : "active",
      enabled: existing.status === "archived" ? false : true,
      modifiedBy: actor,
    });
    updated += 1;

    if (!isImmutableLenderCode(existing.code)) {
      localLenderRegistryStore.remintLenderCode(existing.id, actor);
      codesAssigned += 1;
    }
  }

  for (const lender of allLenders()) {
    if (isImmutableLenderCode(lender.code)) continue;
    localLenderRegistryStore.remintLenderCode(lender.id, actor);
    codesAssigned += 1;
  }

  const mergeReport = localLenderRegistryStore.mergeDuplicates(actor);
  const validation = validateLenderMaster(allLenders(true));
  localLenderRegistryStore.setMasterSeedVersion(CO_ARCH_004_MASTER_SEED_VERSION);

  return {
    seedVersion: CO_ARCH_004_MASTER_SEED_VERSION,
    catalogSize: LENDER_MASTER_SEED_CATALOG.length,
    created,
    updated,
    codesAssigned,
    mergeReport,
    validation,
  };
}

export function ensureLenderMasterBootstrapped(
  actor = "co-arch-004",
): LenderMasterBootstrapResult | null {
  const version = localLenderRegistryStore.getMasterSeedVersion();
  const items = allLenders();
  if (
    version >= CO_ARCH_004_MASTER_SEED_VERSION &&
    items.length >= Math.floor(LENDER_MASTER_SEED_CATALOG.length * 0.9)
  ) {
    return null;
  }
  return bootstrapLenderMaster(actor);
}
