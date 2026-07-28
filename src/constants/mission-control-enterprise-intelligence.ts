/**
 * CO-MC-002 — Mission Control Enterprise Intelligence (SSOT).
 * Full-width executive report sections · daily precomputed refresh.
 */

export const MISSION_CONTROL_EI_PROGRAM = "CO-MC-002" as const;

/**
 * Daily Analytics Refresh — 02:00 Asia/Kolkata = 20:30 UTC.
 * Vercel Cron is UTC.
 */
export const MISSION_CONTROL_ANALYTICS_REFRESH_CRON = "30 20 * * *" as const;
export const MISSION_CONTROL_ANALYTICS_REFRESH_LABEL =
  "Daily 02:00 AM (Asia/Kolkata)" as const;

export const MISSION_CONTROL_EI_SECTIONS = [
  {
    id: "executive_summary",
    title: "Executive Summary",
    subtitle: "Board-ready KPIs and enterprise health",
    order: 1,
  },
  {
    id: "business_source",
    title: "Business Source Intelligence",
    subtitle: "How business entered Rupee Catalyst",
    order: 2,
  },
  {
    id: "wealth_partner",
    title: "Wealth Partner Intelligence",
    subtitle: "Partner contribution and commercial participation",
    order: 3,
  },
  {
    id: "product",
    title: "Product Intelligence",
    subtitle: "Product mix and pipeline value",
    order: 4,
  },
  {
    id: "lender",
    title: "Lender Intelligence",
    subtitle: "Lender funnel and negotiation volume",
    order: 5,
  },
  {
    id: "opportunity",
    title: "Opportunity Intelligence",
    subtitle: "Lifecycle and conversion posture",
    order: 6,
  },
  {
    id: "revenue",
    title: "Revenue Intelligence",
    subtitle: "Expected revenue and contribution",
    order: 7,
  },
  {
    id: "customer",
    title: "Customer Intelligence",
    subtitle: "Borrower concentration and activity",
    order: 8,
  },
  {
    id: "geographic",
    title: "Geographic Intelligence",
    subtitle: "Regional performance",
    order: 9,
  },
  {
    id: "marketing",
    title: "Marketing Intelligence",
    subtitle: "Campaign and marketing-sourced business",
    order: 10,
  },
  {
    id: "operational",
    title: "Operational Intelligence",
    subtitle: "Tasks, SLA pressure, and execution health",
    order: 11,
  },
  {
    id: "ai_executive",
    title: "AI Executive Intelligence",
    subtitle: "CHANAKYA observations and recommended actions",
    order: 12,
  },
] as const;

export type MissionControlEiSectionId =
  (typeof MISSION_CONTROL_EI_SECTIONS)[number]["id"];

export type MissionControlEiChartKind =
  | "kpi_strip"
  | "funnel"
  | "line"
  | "bar"
  | "donut"
  | "treemap"
  | "heatmap"
  | "waterfall"
  | "area"
  | "network"
  | "insight_list";
