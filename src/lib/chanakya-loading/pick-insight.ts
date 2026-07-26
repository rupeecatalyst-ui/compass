/**
 * CO-UX-024 — Pick a CHANAKYA loading insight; avoid consecutive repeats per module.
 */

import { getChanakyaLoadingInsights } from "@/constants/chanakya-loading";
import type { ChanakyaLoadingModule } from "@/types/chanakya-loading";

const STORAGE_PREFIX = "chanakya-loading-insight:";

function storageKey(module: ChanakyaLoadingModule): string {
  return `${STORAGE_PREFIX}${module}`;
}

function readLastIndex(module: ChanakyaLoadingModule): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(module));
    if (raw == null) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeLastIndex(module: ChanakyaLoadingModule, index: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(module), String(index));
  } catch {
    /* private mode / quota — ignore */
  }
}

/** Random insight for a module; skips the last shown index when practical. */
export function pickChanakyaLoadingInsight(
  module: ChanakyaLoadingModule,
): string {
  const insights = getChanakyaLoadingInsights(module);
  if (insights.length === 0) return "Business grows where attention goes.";
  if (insights.length === 1) return insights[0]!;

  const last = readLastIndex(module);
  let index = Math.floor(Math.random() * insights.length);
  if (last != null && insights.length > 1) {
    let guard = 0;
    while (index === last && guard < 8) {
      index = Math.floor(Math.random() * insights.length);
      guard += 1;
    }
  }
  writeLastIndex(module, index);
  return insights[index]!;
}
