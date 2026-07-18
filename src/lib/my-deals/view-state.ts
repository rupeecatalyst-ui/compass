/** Persist My Deals view / filter so Save & Exit can restore the work queue. */

import type { MyDealsFilterId, MyDealsViewId } from "@/constants/my-deals";

const STORAGE_KEY = "catalyst-one:my-deals:view-state";

export interface MyDealsViewState {
  view: MyDealsViewId;
  filterId: MyDealsFilterId;
  search?: string;
  businessTab?: string;
}

export function rememberMyDealsReturnState(state: MyDealsViewState): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function readMyDealsReturnState(): MyDealsViewState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MyDealsViewState;
  } catch {
    return null;
  }
}
