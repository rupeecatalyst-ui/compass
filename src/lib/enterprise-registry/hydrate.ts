/**
 * CO-HOTFIX-006 — Enterprise Registry hydration (PostgreSQL → session cache).
 */

import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { hydrateEcmFromPrisma } from "@/lib/enterprise-persistence";
import { ensureReferenceMasterPortsHydrated } from "@/lib/enterprise-master-data";
import {
  isReferenceMasterPortRuntimeActive,
  isTier2RegistryPortRuntimeActive,
} from "@/constants/enterprise-master-data/dual-read";
import { ensureTier2RegistryPortsHydrated } from "@/lib/enterprise-tier2-ports";
import { notifyEcmContactRegistryChanged } from "@/lib/enterprise-contact-master/contact-change-bus";

let hydratePromise: Promise<{ contacts: number; companies: number; links: number }> | null = null;

async function hydrateDependentPorts(): Promise<void> {
  if (isReferenceMasterPortRuntimeActive()) {
    await ensureReferenceMasterPortsHydrated(true);
  }
  if (isTier2RegistryPortRuntimeActive()) {
    await ensureTier2RegistryPortsHydrated(true);
  }
}

export async function ensureEnterpriseRegistryHydrated(force = false): Promise<{
  contacts: number;
  companies: number;
  links: number;
}> {
  if (!isEnterprisePersistencePrisma()) {
    return { contacts: 0, companies: 0, links: 0 };
  }

  if (force) {
    hydratePromise = hydrateEcmFromPrisma().then(async (result) => {
      notifyEcmContactRegistryChanged();
      await hydrateDependentPorts();
      return result;
    });
    return hydratePromise;
  }

  if (!hydratePromise) {
    hydratePromise = hydrateEcmFromPrisma()
      .then(async (result) => {
        notifyEcmContactRegistryChanged();
        await hydrateDependentPorts();
        return result;
      })
      .catch((err) => {
        hydratePromise = null;
        throw err;
      });
  }

  return hydratePromise;
}

export function resetEnterpriseRegistryHydration(): void {
  hydratePromise = null;
}

// CO-HOTFIX-005 aliases
export { ensureEnterpriseRegistryHydrated as ensureEcmHydrated, resetEnterpriseRegistryHydration as resetEcmHydrationCache };

