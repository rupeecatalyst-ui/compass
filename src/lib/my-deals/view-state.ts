/** Persist My Deals view / filter so Save & Exit can restore the work queue. */

import type { MyDealsFilterId, MyDealsViewId } from "@/constants/my-deals";

const STORAGE_KEY = "catalyst-one:my-deals:view-state";
/** CO-SPRINT-120 — session-only UX prefs (filters chrome); not business state. */
const UI_PREFS_KEY = "catalyst-one:my-deals:ui-prefs";
/** CO-UX-003 — Opportunity group expansion / scroll / selection. */
const REGISTRY_UX_KEY = "catalyst-one:my-deals:registry-ux";

export interface MyDealsViewState {
  view: MyDealsViewId;
  filterId: MyDealsFilterId;
  search?: string;
  businessTab?: string;
}

export interface MyDealsUiPrefs {
  /** When false, filter toolbar is collapsed for maximum grid space */
  filtersVisible: boolean;
  /** Advanced filters panel under the primary toolbar */
  moreFiltersOpen: boolean;
}

/** CO-UX-003 — preserve registry chrome when returning from Loan Workspace. */
export interface MyDealsRegistryUxState {
  expandedKeys: string[];
  selectedKeys: string[];
  selectedOpportunityKey: string | null;
  scrollTop: number;
  sortField?: string;
  sortDir?: "asc" | "desc";
}

const DEFAULT_UI_PREFS: MyDealsUiPrefs = {
  filtersVisible: true,
  moreFiltersOpen: false,
};

const DEFAULT_REGISTRY_UX: MyDealsRegistryUxState = {
  expandedKeys: [],
  selectedKeys: [],
  selectedOpportunityKey: null,
  scrollTop: 0,
  sortField: "lastActivity",
  sortDir: "desc",
};

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

export function readMyDealsUiPrefs(): MyDealsUiPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_UI_PREFS };
  try {
    const raw = sessionStorage.getItem(UI_PREFS_KEY);
    if (!raw) return { ...DEFAULT_UI_PREFS };
    const parsed = JSON.parse(raw) as Partial<MyDealsUiPrefs>;
    return {
      filtersVisible:
        typeof parsed.filtersVisible === "boolean"
          ? parsed.filtersVisible
          : DEFAULT_UI_PREFS.filtersVisible,
      moreFiltersOpen:
        typeof parsed.moreFiltersOpen === "boolean"
          ? parsed.moreFiltersOpen
          : DEFAULT_UI_PREFS.moreFiltersOpen,
    };
  } catch {
    return { ...DEFAULT_UI_PREFS };
  }
}

export function rememberMyDealsUiPrefs(prefs: Partial<MyDealsUiPrefs>): MyDealsUiPrefs {
  const next = { ...readMyDealsUiPrefs(), ...prefs };
  if (typeof window === "undefined") return next;
  try {
    sessionStorage.setItem(UI_PREFS_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}

export function readMyDealsRegistryUx(): MyDealsRegistryUxState {
  if (typeof window === "undefined") return { ...DEFAULT_REGISTRY_UX };
  try {
    const raw = sessionStorage.getItem(REGISTRY_UX_KEY);
    if (!raw) return { ...DEFAULT_REGISTRY_UX };
    const parsed = JSON.parse(raw) as Partial<MyDealsRegistryUxState>;
    return {
      expandedKeys: Array.isArray(parsed.expandedKeys) ? parsed.expandedKeys : [],
      selectedKeys: Array.isArray(parsed.selectedKeys) ? parsed.selectedKeys : [],
      selectedOpportunityKey:
        typeof parsed.selectedOpportunityKey === "string"
          ? parsed.selectedOpportunityKey
          : null,
      scrollTop: typeof parsed.scrollTop === "number" ? parsed.scrollTop : 0,
      sortField:
        typeof parsed.sortField === "string" ? parsed.sortField : DEFAULT_REGISTRY_UX.sortField,
      sortDir: parsed.sortDir === "asc" || parsed.sortDir === "desc" ? parsed.sortDir : "desc",
    };
  } catch {
    return { ...DEFAULT_REGISTRY_UX };
  }
}

export function rememberMyDealsRegistryUx(
  patch: Partial<MyDealsRegistryUxState>,
): MyDealsRegistryUxState {
  const next = { ...readMyDealsRegistryUx(), ...patch };
  if (typeof window === "undefined") return next;
  try {
    sessionStorage.setItem(REGISTRY_UX_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}
