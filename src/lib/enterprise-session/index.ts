/**
 * CO-ARCH-002 / CO-ARCH-003 — Enterprise Context & Session Layer
 * Runtime consumer of Enterprise Registries (not a second SSOT).
 */
export {
  configureOpportunityNetworkFetcher,
  ensureSessionOpportunity,
  peekSessionOpportunity,
  putSessionOpportunity,
  invalidateSessionOpportunity,
  clearSessionOpportunityCache,
  type EnsureOpportunityOptions,
} from "@/lib/enterprise-session/opportunity-runtime-cache";

export {
  configureDealNetworkFetcher,
  ensureSessionDeal,
  peekSessionDeal,
  putSessionDeal,
  invalidateSessionDeal,
  clearSessionDealCache,
  type EnsureDealOptions,
  type SessionDealRecord,
} from "@/lib/enterprise-session/deal-runtime-cache";

export {
  peekPublishedLendersSession,
  putPublishedLendersSession,
  invalidatePublishedLendersSession,
  getPublishedLendersInflight,
  setPublishedLendersInflight,
} from "@/lib/enterprise-session/published-lenders-session";

export {
  bindSessionOpportunity,
  bindSessionDeal,
  bindSessionContact,
  clearEnterpriseSession,
  getEnterpriseSessionSnapshot,
  getSessionPublishedLenders,
  getSessionDeal,
  subscribeEnterpriseSession,
  type EnterpriseSessionSnapshot,
} from "@/lib/enterprise-session/session-context";
