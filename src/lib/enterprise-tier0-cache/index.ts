/**

 * CO-PERF-002 — Tier-0 Enterprise Cache (master / static data).

 * Avoid repeated API calls for Products, Lenders, and related masters.

 * Domain registries remain SSOT; this is session reuse only.

 */



import {

  fetchProductMasterOptions,

  invalidateProductMasterOptionsCache,

  type ProductMasterOption,

} from "@/lib/enterprise-product-master/options";

import {

  listPublishedLenderOptionsAsync,

  type PublishedLenderOption,

} from "@/lib/enterprise-lender-registry/published-directory";



export const TIER0_ENTERPRISE_CACHE_PROGRAM = "CO-PERF-002" as const;



/** Products — Tier-0 façade over product master options (15 min TTL). */

export async function getTier0Products(opts?: {

  force?: boolean;

}): Promise<ProductMasterOption[]> {

  return fetchProductMasterOptions({ enabledOnly: true, force: opts?.force });

}



/** Lenders — published directory (5 min session TTL). */

export async function getTier0Lenders(opts?: {

  search?: string;

  force?: boolean;

}): Promise<PublishedLenderOption[]> {

  if (opts?.force) {

    const { invalidatePublishedLendersSession } = await import(

      "@/lib/enterprise-session/published-lenders-session"

    );

    invalidatePublishedLendersSession();

  }

  return listPublishedLenderOptionsAsync(opts?.search);

}



/** Warm common masters after login / app shell (non-blocking). */

export function warmTier0EnterpriseCache(): void {

  void getTier0Products().catch(() => undefined);

  void getTier0Lenders().catch(() => undefined);

}



export function invalidateTier0EnterpriseCache(): void {

  invalidateProductMasterOptionsCache();

  void import("@/lib/enterprise-session/published-lenders-session").then((m) =>

    m.invalidatePublishedLendersSession(),

  );

}


