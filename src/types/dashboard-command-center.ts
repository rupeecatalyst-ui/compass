/**
 * CO-C1-DASH-001 — Operational command-center projection types (dashboard UI only).
 * No new business entities — views over Opportunity / Deal / Partner / Contact SSOTs.
 */

export type NewOpportunityAttentionStatus = "actioned" | "pending" | "unattended";

export interface NewOpportunityFeedRow {
  id: string;
  opportunityNumber: string;
  customerName: string;
  product: string;
  requestedAmount: number | null;
  sourceLabel: string;
  sourceName: string;
  stageLabel: string;
  assignedLabel: string;
  /** Opportunity creation timestamp (SSOT). */
  createdAt: string;
  /** Opportunity last-updated timestamp (SSOT — never derived from createdAt). */
  updatedAt: string;
  /** Display: Created date (e.g. 12 Aug 2026). */
  createdDateLabel: string;
  /** Display: Last Updated date+time (e.g. 12 Aug 2026, 10:16 PM). */
  lastUpdatedLabel: string;
  /** @deprecated Prefer createdDateLabel + lastUpdatedLabel — kept for compact time chip. */
  arrivalTimeLabel: string;
  attention: NewOpportunityAttentionStatus;
  isNewIndicator: boolean;
  workspaceHref: string;
}

export interface NewOpportunitySectionSummary {
  total: number;
  unattended: number;
  actioned: number;
  pending: number;
}

export interface ArrivalBreakdownSlice {
  id: string;
  label: string;
  count: number;
}

export interface NewArrivalsPulseCard {
  id: "new_partners" | "new_contacts";
  title: string;
  count: number;
  /** Delta vs previous equal-length period (null when unavailable) */
  deltaVsPrevious: number | null;
  breakdown: ArrivalBreakdownSlice[];
  href: string;
}
