/**
 * CO-SPRINT-119 — New Arrivals KPI catalog (User Home Dashboard).
 * Add future cards here only — UI reads this list.
 */

import { ROLES, type Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import type {
  NewArrivalsDatePresetId,
  NewArrivalsKpiCardDef,
} from "@/types/user-home-new-arrivals";

/** Roles that may see dashboard analytics / New Arrivals (managers & admins). */
export const NEW_ARRIVALS_ALLOWED_ROLES: readonly Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.MANAGER,
] as const;

export const NEW_ARRIVALS_DATE_PRESETS: ReadonlyArray<{
  id: NewArrivalsDatePresetId;
  label: string;
  /** Fixed lookback in days; undefined for today / custom */
  days?: number;
}> = [
  { id: "today", label: "Today" },
  { id: "last_7", label: "Last 7 Days", days: 7 },
  { id: "last_30", label: "Last 30 Days", days: 30 },
  { id: "last_90", label: "Last 90 Days", days: 90 },
  { id: "last_180", label: "Last 180 Days", days: 180 },
  { id: "custom", label: "Custom Date Range" },
] as const;

export const NEW_ARRIVALS_DEFAULT_PRESET: NewArrivalsDatePresetId = "last_30";

/**
 * Config-driven KPI cards. Enable/disable or append without redesigning the section.
 *
 * Registry mapping (current SSOT):
 * - Borrowers → ECM Contact role `customer`
 * - Investments → ECM Contact role `investor` until Investment Registry exists
 * - Wealth Partners → ECM Contact role `partner` until dedicated Wealth Partner Registry exists
 */
export const NEW_ARRIVALS_KPI_CARDS: readonly NewArrivalsKpiCardDef[] = [
  {
    id: "new_borrowers",
    title: "New Borrowers",
    icon: "user",
    source: { type: "ecm_role", roles: ["customer"] },
    drillDown: { type: "contacts", contactType: "customer" },
    enabled: true,
  },
  {
    id: "new_investments",
    title: "New Investments",
    icon: "line_chart",
    source: { type: "ecm_role", roles: ["investor"] },
    drillDown: {
      type: "contacts",
      contactType: "investor",
    },
    enabled: true,
  },
  {
    id: "new_wealth_partners",
    title: "New Wealth Partners",
    icon: "handshake",
    source: { type: "ecm_role", roles: ["partner"] },
    drillDown: { type: "contacts", contactType: "partner" },
    enabled: true,
  },
  // Future examples (disabled — enable when registries/counts are ready):
  // {
  //   id: "new_loan_files",
  //   title: "New Deals",
  //   icon: "landmark",
  //   source: { type: "custom", sourceKey: "loan_files" },
  //   drillDown: { type: "route", path: ROUTES.LOAN_FILES, query: { filter: "new" } },
  //   enabled: false,
  // },
] as const;

/** Query param keys shared by New Arrivals → registry drill-down */
export const NEW_ARRIVALS_QUERY = {
  contactType: "contactType",
  dateCreatedFrom: "dateCreatedFrom",
  dateCreatedTo: "dateCreatedTo",
  fromNewArrivals: "fromNewArrivals",
} as const;

export const NEW_ARRIVALS_CONTACTS_BASE = ROUTES.CONTACTS;
