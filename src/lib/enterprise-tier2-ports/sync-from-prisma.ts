/**
 * CO-ARCH-009 — Server-side Tier 2 registry hydration from PostgreSQL.
 * Prefer importing via `@/lib/enterprise-tier2-ports/server` from Next route handlers.
 * Verify runners may import this module directly (Node / tsx).
 */

import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { configureTier2RegistryPorts } from "./configure-ports";
import {
  setDocumentRegistryCache,
  setLenderRegistryCache,
  setProductRegistryCache,
} from "./ports/cache-store";

if (typeof window !== "undefined") {
  throw new Error(
    "[CO-ARCH-009] syncTier2RegistryPortsFromPrisma is server-only and must not run in the browser.",
  );
}

/** Server-side hydration — loads PostgreSQL Tier 2 rows into dual-read cache. */
export async function syncTier2RegistryPortsFromPrisma(): Promise<number> {
  if (!isEnterprisePersistencePrisma()) return 0;
  configureTier2RegistryPorts();

  const [
    { productRegistryService },
    { documentRegistryService },
    { lenderRegistryService },
  ] = await Promise.all([
    import("@server/services/product-registry/product-registry.service"),
    import("@server/services/document-registry/document-registry.service"),
    import("@server/services/lender-registry/lender-registry.service"),
  ]);

  const [categories, groups, products, types, definitions, lenderCategories, lenders, programs] =
    await Promise.all([
      productRegistryService.queryCategories({ page: 1, pageSize: 5000, status: "active" }),
      productRegistryService.queryGroups({ page: 1, pageSize: 5000, status: "active" }),
      productRegistryService.queryProducts({ page: 1, pageSize: 5000, status: "active" }),
      documentRegistryService.queryTypes({ page: 1, pageSize: 5000, status: "active" }),
      documentRegistryService.queryDefinitions({ page: 1, pageSize: 5000, status: "active" }),
      lenderRegistryService.queryCategories({ page: 1, pageSize: 5000, status: "active" }),
      lenderRegistryService.queryLenders({ page: 1, pageSize: 5000, status: "active" }),
      lenderRegistryService.queryPrograms({ page: 1, pageSize: 5000, status: "active" }),
    ]);

  setProductRegistryCache({
    categories: categories.items,
    groups: groups.items,
    products: products.items,
  });
  setDocumentRegistryCache({
    types: types.items,
    definitions: definitions.items,
  });
  setLenderRegistryCache({
    categories: lenderCategories.items,
    lenders: lenders.items,
    programs: programs.items,
  });

  return (
    categories.items.length +
    groups.items.length +
    products.items.length +
    types.items.length +
    definitions.items.length +
    lenderCategories.items.length +
    lenders.items.length +
    programs.items.length
  );
}
