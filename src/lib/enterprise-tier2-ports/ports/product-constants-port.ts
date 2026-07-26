/**
 * CO-ARCH-001-I5b — Constants-backed Product Registry port (legacy SSOT).
 */
import { listEcmMasterOptionsFromCatalog } from "@/constants/enterprise-contact-master/masters";
import {
  getLatestProductDefinitions,
  getProductCategories,
  getProductGroupsForCategory,
} from "@/lib/product-library/product-store";
import type { ProductRegistryPort, ProductRegistryPortOption } from "@/types/tier2-registry-port";

function toOption(
  id: string,
  label: string,
  extra?: Partial<ProductRegistryPortOption>,
): ProductRegistryPortOption {
  return {
    id,
    label,
    enabled: true,
    source: "constants",
    ...extra,
  };
}

export const constantsProductRegistryPort: ProductRegistryPort = {
  listCategories() {
    const fromStore = getProductCategories().map((c) =>
      toOption(c.id, c.categoryName, { sortOrder: c.sortOrder }),
    );
    if (fromStore.length > 0) return fromStore;
    return listEcmMasterOptionsFromCatalog("product").map((o) =>
      toOption(o.id, o.label, { sortOrder: o.sortOrder }),
    );
  },
  listGroups(categoryId) {
    if (!categoryId) return [];
    return getProductGroupsForCategory(categoryId).map((g) =>
      toOption(g.id, g.groupName, { categoryId, parentId: categoryId, sortOrder: g.sortOrder }),
    );
  },
  listProducts(groupId) {
    const defs = getLatestProductDefinitions();
    const filtered = groupId
      ? defs.filter((d) => d.groupId === groupId)
      : defs;
    if (filtered.length > 0) {
      return filtered.map((d) =>
        toOption(d.productCode ?? d.productId, d.productName, {
          groupId: d.groupId,
          categoryId: d.categoryId,
          lifecycleStatus: d.lifecycleStatus,
        }),
      );
    }
    return listEcmMasterOptionsFromCatalog("product").map((o) =>
      toOption(o.id, o.label, { sortOrder: o.sortOrder }),
    );
  },
  getProductLabel(id) {
    if (!id) return "";
    const fromStore = getLatestProductDefinitions().find(
      (d) => d.id === id || d.productCode === id,
    );
    if (fromStore) return fromStore.productName;
    return listEcmMasterOptionsFromCatalog("product").find((o) => o.id === id)?.label ?? id;
  },
};
