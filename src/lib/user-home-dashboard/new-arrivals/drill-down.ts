/**
 * CO-SPRINT-119 — Drill-down href builders for New Arrivals KPIs.
 */

import {
  NEW_ARRIVALS_CONTACTS_BASE,
  NEW_ARRIVALS_QUERY,
} from "@/constants/user-home-dashboard/new-arrivals";
import type {
  NewArrivalsDateRange,
  NewArrivalsDrillDown,
  NewArrivalsKpiCardDef,
} from "@/types/user-home-new-arrivals";

export function buildNewArrivalsDrillDownHref(
  card: Pick<NewArrivalsKpiCardDef, "drillDown">,
  range: Pick<NewArrivalsDateRange, "from" | "to">,
): string {
  return buildDrillDownHref(card.drillDown, range);
}

export function buildDrillDownHref(
  drillDown: NewArrivalsDrillDown,
  range: Pick<NewArrivalsDateRange, "from" | "to">,
): string {
  const params = new URLSearchParams();
  params.set(NEW_ARRIVALS_QUERY.dateCreatedFrom, range.from);
  params.set(NEW_ARRIVALS_QUERY.dateCreatedTo, range.to);
  params.set(NEW_ARRIVALS_QUERY.fromNewArrivals, "1");

  if (drillDown.type === "contacts") {
    params.set(NEW_ARRIVALS_QUERY.contactType, drillDown.contactType);
    return `${NEW_ARRIVALS_CONTACTS_BASE}?${params.toString()}`;
  }

  if (drillDown.query) {
    for (const [k, v] of Object.entries(drillDown.query)) {
      params.set(k, v);
    }
  }
  const qs = params.toString();
  return qs ? `${drillDown.path}?${qs}` : drillDown.path;
}
