/**
 * CO-ARCH-002 — Enterprise Session Layer: Opportunity runtime cache.
 *
 * Enterprise Opportunity Registry remains SSOT.
 * This module is a session consumer: Read / Write / Invalidate / Refresh.
 * Never a second registry.
 */
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import {
  cacheOpportunityRecord,
  getCachedOpportunityRecord,
} from "@/lib/lead-opportunity-journey/opportunity-runtime-adapter";

export type EnsureOpportunityOptions = {
  /** Bypass cache and re-fetch from Enterprise Opportunity Registry. */
  forceRefresh?: boolean;
};

type OpportunityFetcher = (opportunityId: string) => Promise<EnterpriseOpportunityApiRecord>;

const sessionOpportunityById = new Map<string, EnterpriseOpportunityApiRecord>();
const inflightById = new Map<string, Promise<EnterpriseOpportunityApiRecord>>();

let networkFetcher: OpportunityFetcher | null = null;

/** Wire once from opportunity-api-client to avoid circular imports at call sites. */
export function configureOpportunityNetworkFetcher(fetcher: OpportunityFetcher): void {
  networkFetcher = fetcher;
}

export function peekSessionOpportunity(
  opportunityId: string | null | undefined,
): EnterpriseOpportunityApiRecord | null {
  const id = opportunityId?.trim();
  if (!id) return null;
  return (
    sessionOpportunityById.get(id) ??
    getCachedOpportunityRecord(id) ??
    null
  );
}

export function putSessionOpportunity(opp: EnterpriseOpportunityApiRecord): void {
  if (!opp?.id) return;
  sessionOpportunityById.set(opp.id, opp);
  cacheOpportunityRecord(opp);
}

export function invalidateSessionOpportunity(opportunityId: string | null | undefined): void {
  const id = opportunityId?.trim();
  if (!id) return;
  sessionOpportunityById.delete(id);
  inflightById.delete(id);
}

export function clearSessionOpportunityCache(): void {
  sessionOpportunityById.clear();
  inflightById.clear();
}

/**
 * Load Opportunity from Registry at most once per id (single-flight).
 * Warm reads return the session object with zero network.
 */
export async function ensureSessionOpportunity(
  opportunityId: string,
  options: EnsureOpportunityOptions = {},
): Promise<EnterpriseOpportunityApiRecord> {
  const id = opportunityId.trim();
  if (!id) {
    throw new Error("Missing Enterprise Opportunity ID.");
  }

  if (!options.forceRefresh) {
    const warm = peekSessionOpportunity(id);
    if (warm) return warm;
    const pending = inflightById.get(id);
    if (pending) return pending;
  }

  if (!networkFetcher) {
    throw new Error(
      "Opportunity network fetcher not configured. Enterprise Session Layer failed to initialize.",
    );
  }

  const request = networkFetcher(id)
    .then((row) => {
      putSessionOpportunity(row);
      return row;
    })
    .finally(() => {
      inflightById.delete(id);
    });

  inflightById.set(id, request);
  return request;
}
