/** Persist CHANAKYA Radar scope preferences (CO-SPRINT-100). */

import type { ChanakyaRadarViewId } from "@/constants/chanakya-radar";
import {
  DEFAULT_CHANAKYA_RADAR_FILTERS,
  type ChanakyaRadarFilters,
} from "./filter-radar";

const STORAGE_KEY = "catalyst-one:chanakya-radar:view-state";

export interface ChanakyaRadarViewState {
  view: ChanakyaRadarViewId;
  filters: ChanakyaRadarFilters;
}

export function rememberChanakyaRadarViewState(state: ChanakyaRadarViewState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        // Matrix retired — always persist as dashboard
        view: "dashboard",
      }),
    );
  } catch {
    /* ignore quota */
  }
}

export function readChanakyaRadarViewState(): ChanakyaRadarViewState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ChanakyaRadarViewState>;
    return {
      view: "dashboard",
      filters: {
        ...DEFAULT_CHANAKYA_RADAR_FILTERS,
        ...(parsed.filters ?? {}),
      },
    };
  } catch {
    return null;
  }
}
