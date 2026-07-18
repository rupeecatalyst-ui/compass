/** Persist CHANAKYA Radar view + filters (last selection). */

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
    const view = parsed.view === "matrix" || parsed.view === "kanban" ? parsed.view : null;
    if (!view) return null;
    return {
      view,
      filters: {
        ...DEFAULT_CHANAKYA_RADAR_FILTERS,
        ...(parsed.filters ?? {}),
      },
    };
  } catch {
    return null;
  }
}
