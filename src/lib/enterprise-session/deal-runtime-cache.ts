/**
 * CO-ARCH-003 — Enterprise Session Layer: Deal runtime cache.
 *
 * Enterprise Deal Registry remains SSOT.
 * This module is a session consumer: Read / Write / Invalidate / single-flight.
 * Not a second registry or store.
 *
 * NOTE: Do not import deal-api-client here — types are structural to avoid SSR cycles.
 */

export type SessionDealRecord = {
  id: string;
  dealNumber: string;
  opportunityId?: string | null;
  opportunityNumber?: string | null;
  lenderId?: string | null;
  lenderProgramId?: string | null;
  legacyLoanFileId?: string | null;
  fileNumber?: string | null;
  rowVersion: number;
  grossStage: string;
  subStage?: string | null;
  lifecycleStatus: string;
  operationalStatus?: string;
  archived: boolean;
  isDeleted: boolean;
  primaryContactName?: string | null;
  primaryContactMobile?: string | null;
  primaryContactId?: string | null;
  primaryContactEmail?: string | null;
  productLabel?: string | null;
  requestedAmount?: number | null;
  approvedAmount?: number | null;
  fulfilledAmount?: number | null;
  relationshipManagerName?: string | null;
  primaryOwnerUserId?: string | null;
  relationshipManagerUserId?: string | null;
  lendingExtension?: unknown;
  primaryCounterpartyName?: string | null;
  invoicePartyType?: string | null;
  invoicePartySpecify?: string | null;
  invoicePartyContactId?: string | null;
  invoicePartyId?: string | null;
  priority?: string;
  updatedAt?: string | null;
  createdAt?: string | null;
  snapshot?: unknown;
};

export type EnsureDealOptions = {
  forceRefresh?: boolean;
};

type DealFetcher = (dealId: string) => Promise<SessionDealRecord>;

const sessionDealById = new Map<string, SessionDealRecord>();
const inflightById = new Map<string, Promise<SessionDealRecord>>();

let networkFetcher: DealFetcher | null = null;

export function configureDealNetworkFetcher(fetcher: DealFetcher): void {
  networkFetcher = fetcher;
}

export function peekSessionDeal(
  dealId: string | null | undefined,
): SessionDealRecord | null {
  const id = dealId?.trim();
  if (!id) return null;
  return sessionDealById.get(id) ?? null;
}

export function putSessionDeal(deal: SessionDealRecord): void {
  if (!deal?.id) return;
  sessionDealById.set(deal.id, deal);
  if (deal.legacyLoanFileId?.trim()) {
    sessionDealById.set(`legacy:${deal.legacyLoanFileId.trim()}`, deal);
  }
}

export function invalidateSessionDeal(dealId: string | null | undefined): void {
  const id = dealId?.trim();
  if (!id) return;
  const existing = sessionDealById.get(id);
  sessionDealById.delete(id);
  if (existing?.legacyLoanFileId?.trim()) {
    sessionDealById.delete(`legacy:${existing.legacyLoanFileId.trim()}`);
  }
  inflightById.delete(id);
}

export function clearSessionDealCache(): void {
  sessionDealById.clear();
  inflightById.clear();
}

export async function ensureSessionDeal(
  dealId: string,
  options: EnsureDealOptions = {},
): Promise<SessionDealRecord> {
  const id = dealId.trim();
  if (!id) throw new Error("Missing Enterprise Deal ID.");

  if (!options.forceRefresh) {
    const warm = peekSessionDeal(id);
    if (warm) return warm;
    const pending = inflightById.get(id);
    if (pending) return pending;
  }

  if (!networkFetcher) {
    throw new Error(
      "Deal network fetcher not configured. Enterprise Session Layer failed to initialize.",
    );
  }

  const request = networkFetcher(id)
    .then((row) => {
      putSessionDeal(row);
      return row;
    })
    .finally(() => {
      inflightById.delete(id);
    });

  inflightById.set(id, request);
  return request;
}
