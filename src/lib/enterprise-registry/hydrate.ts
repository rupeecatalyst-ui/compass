/**
 * CO-HOTFIX-006 — Enterprise Registry hydration (PostgreSQL → session cache).
 */

import { hydrateEcmFromPrisma, isEnterprisePersistencePrisma } from "@/lib/enterprise-persistence";
import { notifyEcmContactRegistryChanged } from "@/lib/enterprise-contact-master/contact-change-bus";

let hydratePromise: Promise<{ contacts: number; companies: number; links: number }> | null = null;

export async function ensureEnterpriseRegistryHydrated(force = false): Promise<{
  contacts: number;
  companies: number;
  links: number;
}> {
  if (!isEnterprisePersistencePrisma()) {
    return { contacts: 0, companies: 0, links: 0 };
  }

  if (force) {
    hydratePromise = hydrateEcmFromPrisma().then((result) => {
      notifyEcmContactRegistryChanged();
      return result;
    });
    return hydratePromise;
  }

  if (!hydratePromise) {
    hydratePromise = hydrateEcmFromPrisma()
      .then((result) => {
        notifyEcmContactRegistryChanged();
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
