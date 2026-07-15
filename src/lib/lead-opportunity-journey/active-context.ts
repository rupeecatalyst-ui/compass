/**
 * Active Opportunity Context — presentation-only session continuity.
 * Preserved during guided Save & Continue; cleared on bare nav / workspace close.
 */

const STORAGE_KEY = "catalyst.active-opportunity-context";

export interface ActiveOpportunityContext {
  fileId: string;
  opportunityId?: string;
  customerName?: string;
  product?: string;
  label?: string;
}

export function getActiveOpportunityContext(): ActiveOpportunityContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveOpportunityContext;
    if (!parsed?.fileId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setActiveOpportunityContext(ctx: ActiveOpportunityContext): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore quota */
  }
}

export function clearActiveOpportunityContext(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
