/**
 * CO-SPRINT-095 — Relationship Heat Map types.
 * Engagement scoring is a framework only — production algorithm deferred.
 */

export type RelationshipEntityType =
  | "borrower"
  | "investor"
  | "wealth_partner"
  | "channel_partner"
  | "lender_contact";

export type RelationshipEngagementBand =
  | "very_active"
  | "active"
  | "moderate"
  | "needs_attention"
  | "dormant";

export type RelationshipTimeWindow = "today" | "7d" | "30d" | "90d";

export type RelationshipStatusFilter = "all" | "active" | "moderate" | "dormant";

/**
 * Operational signals the future scoring algorithm may consume.
 * Listed for framework completeness — not computed in this sprint.
 */
export type RelationshipEngagementFactorId =
  | "dialogues"
  | "meetings"
  | "calls"
  | "opportunity_activity"
  | "loan_stage_movements"
  | "workflow_progress"
  | "task_activity"
  | "document_uploads"
  | "document_reviews"
  | "notes"
  | "follow_ups"
  | "timeline_events"
  | "customer_interactions"
  | "team_interactions"
  | "recent_activity"
  | "engagement_frequency"
  | "engagement_recency";

export interface RelationshipEngagementSignals {
  /** Placeholder bag — future algorithm fills these from operational systems */
  factors: Partial<Record<RelationshipEngagementFactorId, number>>;
  lastActivityAt?: string;
  /** Existing completeness score — wiring aid only, not engagement SSOT */
  contactScoreHint?: number;
}

export interface RelationshipEngagementScoreResult {
  /** 0–100 engagement / relationship score (rectangle size) */
  score: number;
  band: RelationshipEngagementBand;
  /** True when score came from framework placeholder, not production engine */
  placeholder: boolean;
  computedAt: string;
}

export interface RelationshipHeatMapEntity {
  id: string;
  name: string;
  entityType: RelationshipEntityType;
  entityTypeLabel: string;
  engagementScore: number;
  band: RelationshipEngagementBand;
  /** Colour fill for treemap */
  fill: string;
  activeOpportunities: number;
  lastActivityLabel: string;
  lastActivityAt: string;
  /** Deep-link target for workspace open */
  workspaceHref: string;
  /** Framework demo tile (no durable contact record) */
  isFrameworkDemo?: boolean;
  /** Recharts Treemap size key */
  size: number;
}

export interface RelationshipHeatMapFilters {
  entityType: "all" | RelationshipEntityType;
  timeWindow: RelationshipTimeWindow;
  status: RelationshipStatusFilter;
  search: string;
}
