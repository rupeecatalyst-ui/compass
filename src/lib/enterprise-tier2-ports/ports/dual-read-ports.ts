/**

 * CO-ARCH-001-I5b / I6b — Dual-read Tier 2 registry ports (constants + PostgreSQL cache).

 * When TIER2_REGISTRY_PORT_RUNTIME is active, DB options win on code collision (I6b).

 * Otherwise constants win (I5b default).

 */

import { isTier2RegistryPortRuntimeActive } from "@/constants/enterprise-master-data/dual-read";
import { dedupeProductOptionsForSelection } from "@/lib/enterprise-product-master/dedupe-selection";
import { dedupeLendersForSelection } from "@/lib/enterprise-lender-registry/presentation-canonical";
import type {

  DocumentRegistryPort,

  DocumentRegistryPortOption,

  LenderRegistryPort,

  LenderRegistryPortOption,

  ProductRegistryPort,

  ProductRegistryPortOption,

} from "@/types/tier2-registry-port";

import {

  getAllDocumentDefinitionCache,

  getAllLenderCache,

  getAllProductCache,

  getDocumentDefinitionCache,

  getDocumentTypeCache,

  getLenderCache,

  getLenderCategoryCache,

  getLenderProgramCache,

  getProductCache,

  getProductCategoryCache,

  getProductGroupCache,

} from "./cache-store";

import { constantsDocumentRegistryPort } from "./document-constants-port";

import { constantsLenderRegistryPort } from "./lender-constants-port";

import { constantsProductRegistryPort } from "./product-constants-port";



function normalizeCode(value: string): string {

  return value.trim().toLowerCase();

}



function mergeOptions<T extends { id: string; sortOrder?: number; label: string; source?: string }>(

  constants: T[],

  database: T[],

  runtimeActive: boolean,

): T[] {

  const byCode = new Map<string, T>();

  const primary = runtimeActive ? database : constants;

  const secondary = runtimeActive ? constants : database;



  for (const option of primary) {

    byCode.set(normalizeCode(option.id), {

      ...option,

      source: runtimeActive ? "database" : "constants",

    } as T);

  }

  for (const option of secondary) {

    const key = normalizeCode(option.id);

    if (!byCode.has(key)) {

      byCode.set(key, option);

    }

  }



  return Array.from(byCode.values()).sort(

    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label),

  );

}



function findById<T extends { id: string }>(rows: T[], id: string): T | undefined {

  const key = normalizeCode(id);

  return rows.find((row) => normalizeCode(row.id) === key);

}



export const dualReadProductRegistryPort: ProductRegistryPort = {

  listCategories() {

    return mergeOptions(

      constantsProductRegistryPort.listCategories(),

      getProductCategoryCache(),

      isTier2RegistryPortRuntimeActive(),

    );

  },

  listGroups(categoryId) {

    if (!categoryId) return [];

    return mergeOptions(

      constantsProductRegistryPort.listGroups(categoryId),

      getProductGroupCache(categoryId),

      isTier2RegistryPortRuntimeActive(),

    );

  },

  listProducts(groupId) {
    const database = groupId ? getProductCache(groupId) : getAllProductCache();

    // CO-BUG-002 / CO-PR-004 — When Tier-2 runtime is active, Product Registry (DB) is the sole SSOT.
    // Do not concatenate Product Library / ECM constant catalogues (different codes, same labels).
    // Presentation dedupe by canonical family only — never mutate Product Master rows.
    if (isTier2RegistryPortRuntimeActive()) {
      return dedupeProductOptionsForSelection(
        database.map((option) => ({
          ...option,
          code: option.id,
          enabled: option.enabled !== false,
        })),
      ) as unknown as ProductRegistryPortOption[];
    }

    return constantsProductRegistryPort.listProducts(groupId);
  },

  getProductLabel(id) {

    if (!id) return "";

    if (isTier2RegistryPortRuntimeActive()) {

      const fromDb = findById(getAllProductCache(), id);

      if (fromDb) return fromDb.label;

    }

    return constantsProductRegistryPort.getProductLabel(id) || id;

  },

};



export const dualReadDocumentRegistryPort: DocumentRegistryPort = {

  listTypes() {

    return mergeOptions(

      constantsDocumentRegistryPort.listTypes(),

      getDocumentTypeCache(),

      isTier2RegistryPortRuntimeActive(),

    );

  },

  listDefinitions(typeId) {

    const constants = constantsDocumentRegistryPort.listDefinitions(typeId);

    const database = typeId

      ? getDocumentDefinitionCache(typeId)

      : getAllDocumentDefinitionCache();

    return mergeOptions(constants, database, isTier2RegistryPortRuntimeActive());

  },

  getDefinitionLabel(id) {

    if (!id) return "";

    if (isTier2RegistryPortRuntimeActive()) {

      const fromDb = findById(getAllDocumentDefinitionCache(), id);

      if (fromDb) return fromDb.label;

    }

    return constantsDocumentRegistryPort.getDefinitionLabel(id) || id;

  },

};



export const dualReadLenderRegistryPort: LenderRegistryPort = {

  listCategories() {

    return mergeOptions(

      constantsLenderRegistryPort.listCategories(),

      getLenderCategoryCache(),

      isTier2RegistryPortRuntimeActive(),

    );

  },

  listLenders(categoryId) {
    const constants = constantsLenderRegistryPort.listLenders(categoryId);
    const database = categoryId ? getLenderCache(categoryId) : getAllLenderCache();

    // CO-LR-008 — when Tier-2 runtime is active, Registry (DB) is the sole SSOT.
    // Presentation dedupe by identity family — never mutate lender rows.
    if (isTier2RegistryPortRuntimeActive()) {
      const forSelection = database.map((option) => ({
        ...option,
        label: option.label,
        code: option.meta?.code ?? option.id,
        displayName: option.label,
        enabled: option.enabled !== false,
      }));
      const survivors = dedupeLendersForSelection(forSelection);
      const byId = new Map(database.map((option) => [option.id, option]));
      return survivors.map((survivor) => {
        const orig =
          (survivor.id ? byId.get(survivor.id) : undefined) ??
          byId.get(String(survivor.code ?? ""));
        return {
          id: orig?.id ?? survivor.id ?? String(survivor.code ?? ""),
          label: survivor.displayName || survivor.label,
          parentId: orig?.parentId,
          meta: orig?.meta,
          enabled: survivor.enabled !== false,
          sortOrder: survivor.sortOrder ?? orig?.sortOrder,
          source: (orig?.source ?? "database") as LenderRegistryPortOption["source"],
          categoryId: orig?.categoryId,
          lenderId: orig?.lenderId,
          institutionCategory: orig?.institutionCategory,
          lifecycleStatus: orig?.lifecycleStatus,
        };
      });
    }

    return mergeOptions(constants, database, isTier2RegistryPortRuntimeActive());
  },

  listPrograms(lenderId) {

    if (!lenderId) return [];

    return mergeOptions(

      constantsLenderRegistryPort.listPrograms(lenderId),

      getLenderProgramCache(lenderId),

      isTier2RegistryPortRuntimeActive(),

    );

  },

  getLenderLabel(id) {

    if (!id) return "";

    if (isTier2RegistryPortRuntimeActive()) {

      const fromDb = findById(getAllLenderCache(), id);

      if (fromDb) return fromDb.label;

    }

    return constantsLenderRegistryPort.getLenderLabel(id) || id;

  },

};


