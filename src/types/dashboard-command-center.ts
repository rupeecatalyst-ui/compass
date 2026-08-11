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
  createdAt: string;
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
