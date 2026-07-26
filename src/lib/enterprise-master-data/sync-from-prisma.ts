/**
 * CO-ARCH-009 — Server-side Reference Master hydration from PostgreSQL.
 * Prefer importing via `@/lib/enterprise-master-data/server` from Next route handlers.
 * Verify runners may import this module directly (Node / tsx).
 */

import { REFERENCE_MASTER_DOMAINS } from "@/constants/enterprise-master-data";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { configureReferenceMasterPorts } from "./configure-ports";
import { setReferenceMasterDomainCache } from "./ports/cache-store";

if (typeof window !== "undefined") {
  throw new Error(
    "[CO-ARCH-009] syncReferenceMasterPortsFromPrisma is server-only and must not run in the browser.",
  );
}

/** Server-side hydration — loads PostgreSQL rows into dual-read cache. */
export async function syncReferenceMasterPortsFromPrisma(): Promise<number> {
  if (!isEnterprisePersistencePrisma()) return 0;
  configureReferenceMasterPorts();

  const { referenceMasterService } = await import(
    "@server/services/reference-master/reference-master.service"
  );

  let total = 0;
  for (const domain of REFERENCE_MASTER_DOMAINS) {
    const result = await referenceMasterService.query({
      domain,
      page: 1,
      pageSize: 5000,
      status: "active",
      enabled: true,
    });
    setReferenceMasterDomainCache(domain, result.items);
    total += result.items.length;
  }
  return total;
}
