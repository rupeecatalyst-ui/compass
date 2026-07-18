/**
 * CHANAKYA Radar — filter the shared card list (single dataset for Matrix + Kanban).
 * Does not reclassify Deal Health — scoring stays in derive-radar.
 */

import { CHANAKYA_RADAR_FILTER_ALL } from "@/constants/chanakya-radar";
import type { ChanakyaRadarCard } from "./derive-radar";

export interface ChanakyaRadarFilters {
  relationshipManager: string;
  product: string;
  source: string;
}

export const DEFAULT_CHANAKYA_RADAR_FILTERS: ChanakyaRadarFilters = {
  relationshipManager: CHANAKYA_RADAR_FILTER_ALL,
  product: CHANAKYA_RADAR_FILTER_ALL,
  source: CHANAKYA_RADAR_FILTER_ALL,
};

export function filterChanakyaRadarCards(
  cards: ChanakyaRadarCard[],
  filters: ChanakyaRadarFilters,
): ChanakyaRadarCard[] {
  return cards.filter((card) => {
    if (
      filters.relationshipManager !== CHANAKYA_RADAR_FILTER_ALL &&
      card.relationshipManager !== filters.relationshipManager
    ) {
      return false;
    }
    if (filters.product !== CHANAKYA_RADAR_FILTER_ALL && card.product !== filters.product) {
      return false;
    }
    if (filters.source !== CHANAKYA_RADAR_FILTER_ALL && card.source !== filters.source) {
      return false;
    }
    return true;
  });
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/** Build filter option lists from the unfiltered Radar card set. */
export function listChanakyaRadarFilterOptions(cards: ChanakyaRadarCard[]): {
  relationshipManagers: string[];
  products: string[];
  sources: string[];
} {
  return {
    relationshipManagers: uniqueSorted(cards.map((c) => c.relationshipManager)),
    products: uniqueSorted(cards.map((c) => c.product)),
    sources: uniqueSorted(cards.map((c) => c.source)),
  };
}
