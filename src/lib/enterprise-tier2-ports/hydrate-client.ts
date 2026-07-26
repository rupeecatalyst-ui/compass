/**
 * CO-ARCH-001-I6b — Client-side Tier 2 registry port hydration.
 */
import { isTier2RegistryPortRuntimeActive } from "@/constants/enterprise-master-data/dual-read";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { configureTier2RegistryPorts } from "./configure-ports";
import { tier2RegistryApiClient } from "./api-client";
import {
  setDocumentRegistryCache,
  setLenderRegistryCache,
  setProductRegistryCache,
} from "./ports/cache-store";

let hydratePromise: Promise<number> | null = null;

export async function ensureTier2RegistryPortsHydrated(force = false): Promise<number> {
  if (!isEnterprisePersistencePrisma() || !isTier2RegistryPortRuntimeActive()) {
    return 0;
  }
  if (typeof window === "undefined") return 0;

  if (force) {
    hydratePromise = hydrateAllRegistries();
    return hydratePromise;
  }

  if (!hydratePromise) {
    hydratePromise = hydrateAllRegistries().catch((err) => {
      hydratePromise = null;
      throw err;
    });
  }
  return hydratePromise;
}

async function hydrateAllRegistries(): Promise<number> {
  configureTier2RegistryPorts();

  const [
    categories,
    groups,
    products,
    types,
    definitions,
    lenderCategories,
    lenders,
    programs,
  ] = await Promise.all([
    tier2RegistryApiClient.listProductCategories(),
    tier2RegistryApiClient.listProductGroups(),
    tier2RegistryApiClient.listProducts(),
    tier2RegistryApiClient.listDocumentTypes(),
    tier2RegistryApiClient.listDocumentDefinitions(),
    tier2RegistryApiClient.listLenderCategories(),
    tier2RegistryApiClient.listLenders(),
    tier2RegistryApiClient.listLenderPrograms(),
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

export function resetTier2RegistryHydration(): void {
  hydratePromise = null;
}

