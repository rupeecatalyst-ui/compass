/**
 * CO-ARCH-001-I5b — Constants-backed Lender Registry port (legacy SSOT).
 */
import { listEcmMasterOptionsFromCatalog } from "@/constants/enterprise-contact-master/masters";
import type { LenderRegistryPort, LenderRegistryPortOption } from "@/types/tier2-registry-port";

const LENDER_CATEGORY_SEED: LenderRegistryPortOption[] = [
  { id: "bank", label: "Bank", sortOrder: 1, enabled: true, source: "constants" },
  { id: "nbfc", label: "NBFC", sortOrder: 2, enabled: true, source: "constants" },
  { id: "hfc", label: "HFC", sortOrder: 3, enabled: true, source: "constants" },
  { id: "cooperative", label: "Cooperative", sortOrder: 4, enabled: true, source: "constants" },
  { id: "foreign_bank", label: "Foreign Bank", sortOrder: 5, enabled: true, source: "constants" },
];

function inferCategoryId(lenderId: string, meta?: Record<string, string>): string {
  const label = (meta?.category ?? lenderId).toLowerCase();
  if (label.includes("foreign")) return "foreign_bank";
  if (label.includes("hfc") || label.includes("housing")) return "hfc";
  if (label.includes("nbfc") || label.includes("finance")) return "nbfc";
  if (label.includes("cooperative")) return "cooperative";
  return "bank";
}

export const constantsLenderRegistryPort: LenderRegistryPort = {
  listCategories() {
    return LENDER_CATEGORY_SEED;
  },
  listLenders(categoryId) {
    const all = listEcmMasterOptionsFromCatalog("lender");
    const filtered = categoryId
      ? all.filter((l) => inferCategoryId(l.id, l.meta) === categoryId)
      : all;
    return filtered.map((l) => ({
      id: l.id,
      label: l.label,
      categoryId: inferCategoryId(l.id, l.meta),
      meta: l.meta,
      sortOrder: l.sortOrder,
      enabled: l.enabled !== false,
      source: "constants" as const,
    }));
  },
  listPrograms(lenderId) {
    if (!lenderId) return [];
    return listEcmMasterOptionsFromCatalog("region", lenderId).map((r) => ({
      id: r.id,
      label: r.label,
      lenderId,
      parentId: lenderId,
      sortOrder: r.sortOrder,
      enabled: r.enabled !== false,
      source: "constants" as const,
    }));
  },
  getLenderLabel(id) {
    if (!id) return "";
    return listEcmMasterOptionsFromCatalog("lender").find((o) => o.id === id)?.label ?? id;
  },
};
