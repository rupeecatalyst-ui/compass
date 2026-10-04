import type {
  RelationshipEngagementBand,
  RelationshipEngagementFactorId,
  RelationshipEntityType,
} from "@/types/relationship-heat-map";

export const RELATIONSHIP_HEAT_MAP_VERSION = "0.1.0-framework";

export const RELATIONSHIP_ENTITY_TYPE_OPTIONS: {
  id: "all" | RelationshipEntityType;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "borrower", label: "Borrowers" },
  { id: "investor", label: "Investors" },
  { id: "wealth_partner", label: "Wealth Partners" },
  { id: "channel_partner", label: "Channel Partners" },
  { id: "lender_contact", label: "Lender Contacts" },
];

export const RELATIONSHIP_TIME_WINDOW_OPTIONS = [
  { id: "today" as const, label: "Today" },
  { id: "7d" as const, label: "7 Days" },
  { id: "30d" as const, label: "30 Days" },
  { id: "90d" as const, label: "90 Days" },
];

export const RELATIONSHIP_STATUS_OPTIONS = [
  { id: "all" as const, label: "All Status" },
  { id: "active" as const, label: "Active" },
  { id: "moderate" as const, label: "Moderate" },
  { id: "dormant" as const, label: "Dormant" },
];

/** Premium executive palette — colour = days since last meaningful interaction */
export const RELATIONSHIP_ENGAGEMENT_BAND_META: Record<
  RelationshipEngagementBand,
  { label: string; fill: string; description: string; dayRange: string }
> = {
  very_active: {
    label: "Very Active",
    fill: "#10b981",
    description: "Last meaningful interaction within 0–7 days",
    dayRange: "0–7 days",
  },
  active: {
    label: "Active",
    fill: "#3b82f6",
    description: "Last meaningful interaction 8–30 days ago",
    dayRange: "8–30 days",
  },
  moderate: {
    label: "Moderately Active",
    fill: "#eab308",
    description: "Last meaningful interaction 31–60 days ago",
    dayRange: "31–60 days",
  },
  needs_attention: {
    label: "Needs Attention",
    fill: "#f97316",
    description: "Last meaningful interaction 61–90 days ago",
    dayRange: "61–90 days",
  },
  dormant: {
    label: "Dormant",
    fill: "#ef4444",
    description: "More than 90 days, or no meaningful interaction recorded",
    dayRange: ">90 days or none",
  },
};

export const RELATIONSHIP_HEAT_MAP_HOW_CALCULATED = [
  "Colour is the activity band from days since the latest meaningful interaction — not the numeric score.",
  "Very Active 0–7 days · Active 8–30 · Moderately Active 31–60 · Needs Attention 61–90 · Dormant >90 or none recorded.",
  "Meaningful: completed call; sent/received operational email; sent/received WhatsApp/message; completed meeting; completed follow-up; employee-recorded interaction with a valid date.",
  "Does not reset the clock: viewing a profile, automated/background updates, stage movement without communication, task creation without completion, draft/unsent communications, synchronisation events.",
  "Size is the relationship score (recency, frequency, responsiveness, business relevance). A high score cannot keep a contact out of Dormant after 90 days without contact.",
].join(" ");

export const RELATIONSHIP_ENTITY_TYPE_LABELS: Record<RelationshipEntityType, string> = {
  borrower: "Borrower",
  investor: "Investor",
  wealth_partner: "Wealth Partner",
  channel_partner: "Channel Partner",
  lender_contact: "Lender Contact",
};

/**
 * Factors reserved for the future engagement scoring algorithm.
 * Do not compute production scores from these in this sprint.
 */
export const RELATIONSHIP_ENGAGEMENT_FACTORS: {
  id: RelationshipEngagementFactorId;
  label: string;
}[] = [
  { id: "dialogues", label: "Dialogues" },
  { id: "meetings", label: "Meetings" },
  { id: "calls", label: "Calls" },
  { id: "opportunity_activity", label: "Opportunity activity" },
  { id: "loan_stage_movements", label: "Loan stage movements" },
  { id: "workflow_progress", label: "Workflow progress" },
  { id: "task_activity", label: "Task activity" },
  { id: "document_uploads", label: "Document uploads" },
  { id: "document_reviews", label: "Document reviews" },
  { id: "notes", label: "Notes" },
  { id: "follow_ups", label: "Follow-ups" },
  { id: "timeline_events", label: "Timeline events" },
  { id: "customer_interactions", label: "Customer interactions" },
  { id: "team_interactions", label: "Team interactions" },
  { id: "recent_activity", label: "Recent activity" },
  { id: "engagement_frequency", label: "Frequency of engagement" },
  { id: "engagement_recency", label: "Recency of engagement" },
];
