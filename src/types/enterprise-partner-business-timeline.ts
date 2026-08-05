/**
 * CO-WP-TIMELINE-001 — Partner-facing Opportunity business milestones.
 * Communicates progress without exposing enterprise workflow complexity.
 */

export type PartnerBusinessMilestoneId =
  | "opportunity_created"
  | "documents_pending"
  | "documents_complete"
  | "submitted"
  | "under_review"
  | "sent_to_lender"
  | "decision_received"
  | "disbursed";

export type PartnerBusinessMilestoneState = "completed" | "current" | "upcoming";

export type PartnerBusinessMilestoneDto = {
  id: PartnerBusinessMilestoneId;
  label: string;
  description: string;
  state: PartnerBusinessMilestoneState;
  sortOrder: number;
  reachedAt: string | null;
};

export type PartnerBusinessTimelineDto = {
  version: string;
  dtoSource: "enterprise_partner_business_timeline";
  dtoNotice: string;
  /** Current partner-friendly status (replaces Stage / Sub Stage). */
  currentLabel: string;
  currentDescription: string;
  milestones: PartnerBusinessMilestoneDto[];
};
