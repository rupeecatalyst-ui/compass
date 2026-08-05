/**
 * CO-PROG-004 — Soft Go-Live / local baseline commercial program seed.
 * Create-missing only. Never overwrites administrator edits. No website sync.
 */
import {
  CO_PROG_004_SEED_TAG,
  getBaselineCommercialProgramSeeds,
  normalizeSupportedProductCodes,
} from "@/constants/enterprise-lender-registry/baseline-commercial-program-seed";
import { LENDER_MASTER_SEED_CATALOG } from "@/constants/enterprise-lender-registry/master-seed-catalog";
import { localLenderRegistryStore } from "@/lib/enterprise-lender-registry/local-store";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";

export interface LocalBaselineProgramSeedResult {
  seedTag: string;
  lendersScanned: number;
  capabilityFilled: number;
  capabilityNormalized: number;
  programsCreated: number;
  programsSkipped: number;
}

function findLenderBySeedKey(
  lenders: EnterpriseLenderRecord[],
  seedKey: string,
): EnterpriseLenderRecord | undefined {
  const tag = `seed:${seedKey}`;
  const key = seedKey.trim().toLowerCase();
  return lenders.find(
    (l) =>
      !l.isDeleted &&
      ((l.tags ?? []).includes(tag) ||
        (l.shortName || "").trim().toLowerCase() === key ||
        (l.code || "").trim().toLowerCase() === key ||
        (l.code || "").trim().toUpperCase() === seedKey.toUpperCase()),
  );
}

export function seedBaselineCommercialProgramsLocal(
  actor = "co-prog-004",
): LocalBaselineProgramSeedResult {
  const lenders = localLenderRegistryStore.queryLenders({
    pageSize: 5000,
    includeDeleted: false,
  }).items;

  let capabilityFilled = 0;
  let capabilityNormalized = 0;
  let programsCreated = 0;
  let programsSkipped = 0;

  for (const catalog of LENDER_MASTER_SEED_CATALOG) {
    const lender = findLenderBySeedKey(lenders, catalog.seedKey);
    if (!lender) continue;
    const baseline = normalizeSupportedProductCodes(catalog.productsSupported);
    const raw = [...(lender.productsSupported ?? [])];
    const existing = normalizeSupportedProductCodes(raw);

    if (raw.length === 0 && baseline.length > 0) {
      localLenderRegistryStore.updateLender(lender.id, {
        productsSupported: baseline,
        modifiedBy: actor,
      });
      capabilityFilled += 1;
      lender.productsSupported = baseline;
      continue;
    }

    if (raw.length > 0 && raw.join("|") !== existing.join("|") && existing.length > 0) {
      localLenderRegistryStore.updateLender(lender.id, {
        productsSupported: existing,
        modifiedBy: actor,
      });
      capabilityNormalized += 1;
      lender.productsSupported = existing;
    }
  }

  const refreshed = localLenderRegistryStore.queryLenders({
    pageSize: 5000,
    includeDeleted: false,
  }).items;
  const programs = localLenderRegistryStore.queryPrograms({ pageSize: 10000 }).items;
  const byCode = new Set(programs.filter((p) => !p.isDeleted).map((p) => p.code));
  const byLenderProduct = new Set(
    programs
      .filter((p) => !p.isDeleted && p.productCode)
      .map((p) => `${p.lenderId}::${p.productCode}`),
  );

  for (const seed of getBaselineCommercialProgramSeeds()) {
    const lender = findLenderBySeedKey(refreshed, seed.lenderCode.toLowerCase())
      ?? refreshed.find(
        (l) =>
          !l.isDeleted &&
          (l.code || "").toUpperCase() === seed.lenderCode.toUpperCase(),
      );
    if (!lender) {
      programsSkipped += 1;
      continue;
    }
    const key = `${lender.id}::${seed.productCode}`;
    if (byCode.has(seed.code) || byLenderProduct.has(key)) {
      programsSkipped += 1;
      continue;
    }
    localLenderRegistryStore.createProgram({
      lenderId: lender.id,
      productCode: seed.productCode,
      code: seed.code,
      label: seed.label,
      description: seed.description,
      lifecycleStatus: "active",
      status: "active",
      enabled: true,
      notes: seed.notes,
      createdBy: actor,
    });
    byCode.add(seed.code);
    byLenderProduct.add(key);
    programsCreated += 1;
  }

  return {
    seedTag: CO_PROG_004_SEED_TAG,
    lendersScanned: refreshed.length,
    capabilityFilled,
    capabilityNormalized,
    programsCreated,
    programsSkipped,
  };
}
