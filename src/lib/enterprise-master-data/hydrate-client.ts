/**
 * CO-ARCH-001-I6a — Client-side Reference Master port hydration.
 */
import { REFERENCE_MASTER_DOMAINS } from "@/constants/enterprise-master-data";
import { isReferenceMasterPortRuntimeActive } from "@/constants/enterprise-master-data/dual-read";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { configureReferenceMasterPorts } from "./configure-ports";
import { setReferenceMasterDomainCache } from "./ports/cache-store";
import { referenceMasterApiClient } from "./reference-master-api-client";

let hydratePromise: Promise<number> | null = null;

export async function ensureReferenceMasterPortsHydrated(force = false): Promise<number> {
  if (!isEnterprisePersistencePrisma() || !isReferenceMasterPortRuntimeActive()) {
    return 0;
  }
  if (typeof window === "undefined") return 0;

  if (force) {
    hydratePromise = hydrateAllDomains();
    return hydratePromise;
  }

  if (!hydratePromise) {
    hydratePromise = hydrateAllDomains().catch((err) => {
      hydratePromise = null;
      throw err;
    });
  }
  return hydratePromise;
}

async function hydrateAllDomains(): Promise<number> {
  configureReferenceMasterPorts();
  let total = 0;
  for (const domain of REFERENCE_MASTER_DOMAINS) {
    const result = await referenceMasterApiClient.queryByDomain(domain, 5000);
    setReferenceMasterDomainCache(domain, result.items);
    total += result.items.length;
  }
  return total;
}

export function resetReferenceMasterHydration(): void {
  hydratePromise = null;
}
