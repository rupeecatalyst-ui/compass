/**
 * CO-WP-TIMELINE-001 — Frozen partner business milestone catalog.
 */

import type { PartnerBusinessMilestoneId } from "@/types/enterprise-partner-business-timeline";

export const PARTNER_BUSINESS_TIMELINE_VERSION = "CO-WP-TIMELINE-001";

export const PARTNER_BUSINESS_MILESTONE_DEFS: ReadonlyArray<{
  id: PartnerBusinessMilestoneId;
  label: string;
  description: string;
  sortOrder: number;
}> = [
  {
    id: "opportunity_created",
    label: "Opportunity Created",
    description: "Your customer opportunity is registered with Rupee Catalyst.",
    sortOrder: 10,
  },
  {
    id: "documents_pending",
    label: "Documents Pending",
    description: "Required documents are still needed from the customer.",
    sortOrder: 20,
  },
  {
    id: "documents_complete",
    label: "Documents Complete",
    description: "Required documents for this opportunity are in place.",
    sortOrder: 30,
  },
  {
    id: "submitted",
    label: "Submitted",
    description: "Opportunity submitted for the internal team to process.",
    sortOrder: 40,
  },
  {
    id: "under_review",
    label: "Under Review",
    description: "The Rupee Catalyst team is reviewing this opportunity.",
    sortOrder: 50,
  },
  {
    id: "sent_to_lender",
    label: "Sent to Lender",
    description: "The case has been shared with a lending partner.",
    sortOrder: 60,
  },
  {
    id: "decision_received",
    label: "Decision Received",
    description: "A lender decision is available for this opportunity.",
    sortOrder: 70,
  },
  {
    id: "disbursed",
    label: "Disbursed",
    description: "The loan has been disbursed successfully.",
    sortOrder: 80,
  },
];
