/** Cross-module Opportunity Registry synchronization. */

export const OPPORTUNITIES_UPDATED_EVENT = "compass:opportunities-updated";

export function notifyOpportunitiesUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPPORTUNITIES_UPDATED_EVENT));
}

export function subscribeOpportunitiesUpdated(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(OPPORTUNITIES_UPDATED_EVENT, listener);
  return () => window.removeEventListener(OPPORTUNITIES_UPDATED_EVENT, listener);
}
