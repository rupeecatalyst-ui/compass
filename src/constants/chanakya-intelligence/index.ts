/**
 * CO-MC-002 — CHANAKYA Intelligence constants.
 */

import type { ChanakyaIntelligenceHeatDimension } from "@/types/chanakya-intelligence";

export const CHANAKYA_INTELLIGENCE_ROUTE = "/mission-control/chanakya-intelligence";

export const CHANAKYA_INTELLIGENCE_RIVER_STAGES = [
  { id: "lead", label: "Lead", match: [/lead/i, /enquiry/i, /dialogue/i] },
  { id: "opportunity", label: "Opportunity", match: [/opportunit/i, /requirement/i] },
  {
    id: "assessment",
    label: "Assessment",
    match: [/credit/i, /assess/i, /login/i, /logged/i, /document/i, /life/i],
  },
  {
    id: "approval",
    label: "Approval",
    match: [/approv/i, /sanction/i, /soft/i, /final/i],
  },
  {
    id: "disbursal",
    label: "Disbursal",
    match: [/disburs/i, /closure/i, /ops/i],
  },
] as const;

export const CHANAKYA_INTELLIGENCE_HEAT_DIMENSIONS: {
  id: ChanakyaIntelligenceHeatDimension;
  label: string;
}[] = [
  { id: "branch_product", label: "Branch × Product" },
  { id: "employee_kpi", label: "Employee × KPI" },
  { id: "partner_product", label: "Partner × Product" },
  { id: "stage_team", label: "Stage × Team" },
  { id: "region_revenue", label: "Region × Revenue" },
];

export const DEFAULT_CHANAKYA_INTELLIGENCE_FILTERS = {
  product: "all",
  branch: "all",
  team: "all",
  employee: "all",
  partner: "all",
  stage: "all",
} as const;

/** Future widget ids reserved for additive expansion without redesign. */
export const CHANAKYA_INTELLIGENCE_FUTURE_WIDGET_IDS = [
  "ci-dependency-intelligence",
  "ci-operational-weather",
  "ci-predictive-intelligence",
  "ci-ai-recommendations",
  "ci-forecast-engine",
] as const;
