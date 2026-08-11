/**
 * CO-SPRINT-119 — New Arrivals KPI Dashboard (User Home only).
 */

import type { Role } from "@/constants/roles";
import type { EcmContactRole } from "@/types/enterprise-contact-master";

export type NewArrivalsDatePresetId =
  | "today"
  | "last_3"
  | "last_7"
  | "last_30"
  | "last_90"
  | "last_180"
  | "custom";

export type NewArrivalsKpiSource =
  | {
      type: "ecm_role";
      /** ECM roles counted by createdOn / createdAt */
      roles: EcmContactRole[];
    }
  | {
      /** Reserved for future registries (loan files, opportunities, etc.) */
      type: "custom";
      sourceKey: string;
    };

export type NewArrivalsDrillDown =
  | {
      type: "contacts";
      contactType: EcmContactRole;
    }
  | {
      type: "route";
      path: string;
      /** Extra query keys merged with date filter params */
      query?: Record<string, string>;
    };

export interface NewArrivalsKpiCardDef {
  id: string;
  title: string;
  /** lucide icon name resolved in UI */
  icon: "user" | "line_chart" | "handshake" | "briefcase" | "landmark" | "file" | "users";
  source: NewArrivalsKpiSource;
  drillDown: NewArrivalsDrillDown;
  enabled: boolean;
}

export interface NewArrivalsDateRange {
  preset: NewArrivalsDatePresetId;
  /** Inclusive start (local calendar day) ISO date YYYY-MM-DD */
  from: string;
  /** Inclusive end (local calendar day) ISO date YYYY-MM-DD */
  to: string;
  /** Label shown on KPI cards */
  label: string;
}

export interface NewArrivalsKpiCount {
  id: string;
  count: number;
}

export interface NewArrivalsCountsResult {
  range: Pick<NewArrivalsDateRange, "from" | "to" | "label">;
  counts: NewArrivalsKpiCount[];
  /** ISO timestamp of computation */
  computedAt: string;
}

export type NewArrivalsViewerRole = Role;
