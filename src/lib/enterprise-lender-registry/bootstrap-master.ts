/**
 * CO-ARCH-004 — Bootstrap master seed into Soft Go-Live local registry.
 * Idempotent by seedKey tag; allocates immutable LND codes; merges duplicates.
 */
import {
  CO_ARCH_004_MASTER_SEED_VERSION,
  LENDER_MASTER_SEED_CATALOG,
} from "@/constants/enterprise-lender-registry/master-seed-catalog";
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

function allLenders(includeDeleted = false): EnterpriseLenderRecord[] {
  return localLenderRegistryStore.queryLenders({
    pageSize: 5000,
    includeDeleted,
  }).items;
}

function findBySeedKey(
  lenders: EnterpriseLenderRecord[],
  seedKey: string,
): EnterpriseLenderRecord | undefined {
  const tag = `${SEED_TAG_PREFIX}${seedKey}`;
  return lenders.find(
    (l) =>
      !l.isDeleted &&
      ((l.tags ?? []).includes(tag) ||
        normalizeLoose(l.shortName) === normalizeLoose(seedKey) ||
        normalizeLoose(l.displayName) === normalizeLoose(seedKey)),
  );
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

  const categories = localLenderRegistryStore.listCategories();
  const categoryId = categories[0]?.id ?? "elcat-general";

  for (const seed of LENDER_MASTER_SEED_CATALOG) {
    const existing = findBySeedKey(allLenders(), seed.seedKey);
    const tag = `${SEED_TAG_PREFIX}${seed.seedKey}`;

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
        headquartersLabel: seed.headquartersLabel,
        customerCarePhone: seed.customerCarePhone,
        customerCareEmail: seed.customerCareEmail,
        rbiRegulated: seed.rbiRegulated ?? true,
        panIndia: seed.panIndia ?? true,
        productsSupported: seed.productsSupported,
        tags: [tag, `co-arch-004-v${CO_ARCH_004_MASTER_SEED_VERSION}`],
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

    localLenderRegistryStore.updateLender(existing.id, {
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
      headquartersLabel: seed.headquartersLabel ?? existing.headquartersLabel,
      customerCarePhone: seed.customerCarePhone ?? existing.customerCarePhone,
      customerCareEmail: seed.customerCareEmail ?? existing.customerCareEmail,
      rbiRegulated: seed.rbiRegulated ?? true,
      panIndia: seed.panIndia ?? existing.panIndia,
      productsSupported: seed.productsSupported,
      tags: Array.from(new Set([...(existing.tags ?? []), tag])),
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
