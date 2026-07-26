/**
 * CO-ARCH-002 / CO-ARCH-003 — Enterprise Session Context
 * Runtime consumer of Enterprise Registries (NOT a registry / SSOT).
 *
 * First-class runtime entities: Current Opportunity + Current Deal.
 */
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import type { SessionDealRecord } from "@/lib/enterprise-session/deal-runtime-cache";
import type { PublishedLenderOption } from "@/lib/enterprise-lender-registry/published-directory";
import {
  peekSessionOpportunity,
  putSessionOpportunity,
  invalidateSessionOpportunity,
} from "@/lib/enterprise-session/opportunity-runtime-cache";
import {
  peekSessionDeal,
  putSessionDeal,
  invalidateSessionDeal,
  clearSessionDealCache,
} from "@/lib/enterprise-session/deal-runtime-cache";
import {
  peekPublishedLendersSession,
  invalidatePublishedLendersSession,
} from "@/lib/enterprise-session/published-lenders-session";

export type EnterpriseSessionSnapshot = {
  opportunityId: string | null;
  opportunity: EnterpriseOpportunityApiRecord | null;
  dealId: string | null;
  deal: SessionDealRecord | null;
  contactId: string | null;
  publishedLendersLoaded: boolean;
  publishedLenderCount: number;
};

type Listener = () => void;

let activeOpportunityId: string | null = null;
let activeDealId: string | null = null;
let activeContactId: string | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* ignore */
    }
  }
}

export function subscribeEnterpriseSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function bindSessionOpportunity(opp: EnterpriseOpportunityApiRecord): void {
  putSessionOpportunity(opp);
  activeOpportunityId = opp.id;
  activeContactId = opp.primaryContactId || activeContactId;
  emit();
}

/** Bind canonical Enterprise Deal into the active session. */
export function bindSessionDeal(
  deal: SessionDealRecord | string | null | undefined,
): void {
  if (!deal) {
    activeDealId = null;
    emit();
    return;
  }
  if (typeof deal === "string") {
    activeDealId = deal.trim() || null;
    emit();
    return;
  }
  putSessionDeal(deal);
  activeDealId = deal.id;
  if (deal.opportunityId?.trim()) {
    activeOpportunityId = deal.opportunityId.trim();
  }
  if (deal.primaryContactId?.trim()) {
    activeContactId = deal.primaryContactId.trim();
  }
  emit();
}

export function bindSessionContact(contactId: string | null | undefined): void {
  activeContactId = contactId?.trim() || null;
  emit();
}

export function clearEnterpriseSession(): void {
  if (activeOpportunityId) invalidateSessionOpportunity(activeOpportunityId);
  if (activeDealId) invalidateSessionDeal(activeDealId);
  clearSessionDealCache();
  activeOpportunityId = null;
  activeDealId = null;
  activeContactId = null;
  invalidatePublishedLendersSession();
  emit();
}

export function getEnterpriseSessionSnapshot(): EnterpriseSessionSnapshot {
  const opportunity = activeOpportunityId
    ? peekSessionOpportunity(activeOpportunityId)
    : null;
  const deal = activeDealId ? peekSessionDeal(activeDealId) : null;
  const lenders = peekPublishedLendersSession();
  return {
    opportunityId: activeOpportunityId,
    opportunity,
    dealId: activeDealId,
    deal,
    contactId:
      activeContactId ||
      opportunity?.primaryContactId ||
      deal?.primaryContactId ||
      null,
    publishedLendersLoaded: Boolean(lenders),
    publishedLenderCount: lenders?.length ?? 0,
  };
}

export function getSessionPublishedLenders(): PublishedLenderOption[] | null {
  return peekPublishedLendersSession();
}

export function getSessionDeal(): SessionDealRecord | null {
  return activeDealId ? peekSessionDeal(activeDealId) : null;
}
