/**
 * CO-ARCH-003 / CO-ARCH-007 — Enterprise Processing Architecture (permanent).
 *
 * Every feature belongs to exactly one tier.
 * Tier 2 / Tier 3 must never block a Tier 1 Critical User Journey.
 * Tier 4 surfaces consume certified snapshots only (no live heavy analytics).
 */

export const ENTERPRISE_PROCESSING_ARCHITECTURE_ID = "CO-ARCH-003" as const;
export const ENTERPRISE_PROCESSING_ARCHITECTURE_EXTENSION = "CO-ARCH-007" as const;

/** Tier 1 — user is waiting. Sync path: validate → write → commit → respond. */
export const PROCESSING_TIER_1 = 1 as const;
/** Tier 2 — after commit / idle. Notifications, timeline, audit, indexing, messaging. */
export const PROCESSING_TIER_2 = 2 as const;
/** Tier 3 — scheduled (default overnight). Scores, EME, dashboards, AI aggregates. */
export const PROCESSING_TIER_3 = 3 as const;
/** Tier 4 — snapshot consumers (Mission Control, CHANAKYA Radar). Read-only certified payloads. */
export const PROCESSING_TIER_4 = 4 as const;

export type EnterpriseProcessingTier =
  | typeof PROCESSING_TIER_1
  | typeof PROCESSING_TIER_2
  | typeof PROCESSING_TIER_3
  | typeof PROCESSING_TIER_4;

/** Tier 1 response targets (seconds). */
export const TIER1_TARGETS_SECONDS = {
  simpleAction: 1,
  screenOpen: 2,
  save: 2,
  moveToDeal: 3,
  maximumAcceptable: 5,
} as const;

/**
 * Canonical Tier 1 Critical User Journey capabilities.
 * Analytical / messaging / scoring work must not sit on these sync paths.
 */
export const TIER1_CRITICAL_JOURNEY = [
  "auth.login",
  "auth.logout",
  "auth.session",
  "contacts.list",
  "contacts.profile",
  "contacts.save",
  "opportunity.list",
  "opportunity.open",
  "opportunity.save",
  "strategy.workspace",
  "strategy.shortlist",
  "strategy.move_to_deal",
  "deal.list",
  "deal.open",
  "deal.save",
  "pipeline.stage_change",
  "pipeline.update",
  "documents.upload",
  "documents.view",
  "documents.metadata_save",
  "lenders.search",
  "lenders.assign",
  "lenders.manual_recommendation",
  "accounting.dashboard",
  "accounting.workspace",
  "accounting.invoice",
  "accounting.payout",
  "accounting.commission",
  "accounting.ledger",
  "accounting.payment",
  "accounting.reconciliation_save",
  "tasks.create",
  "tasks.update",
] as const;

export type Tier1CriticalJourneyId = (typeof TIER1_CRITICAL_JOURNEY)[number];

export const TIER2_WORK_KINDS = [
  "notifications",
  "timeline",
  "audit_log",
  "search_index",
  "cache_refresh",
  "document_thumbnail",
  "activity_feed",
  "email",
  "sms",
  "whatsapp",
  "internal_event",
  "ete_task_generation",
  "edc_dialogue",
] as const;

export const TIER3_WORK_KINDS = [
  "customer_health_score",
  "lender_score",
  "channel_partner_score",
  "executive_score",
  "branch_kpi",
  "productivity_metric",
  "ai_insight",
  "business_health_index",
  "historical_analytics",
  "trend_analysis",
  "dashboard_aggregation",
  "leaderboard",
  "performance_ranking",
  "predictive_analytics",
  "eme_snapshot",
  "chanakya_radar_snapshot",
  "mission_control_snapshot",
  "recommendation_learning",
] as const;

/** Tier 4 — UI surfaces that only read certified snapshots. */
export const TIER4_SNAPSHOT_CONSUMERS = [
  "mission_control.executive_briefing",
  "chanakya_radar.landing",
  "executive_dashboard.certified_views",
] as const;

/** Workspace optimisation priority (daily operational experience). */
export const TIER1_WORKSPACE_OPTIMISATION_ORDER = [
  "contacts",
  "opportunity_workspace",
  "strategy_workspace",
  "move_to_deal",
  "deal_workspace",
  "lender_workspace",
  "accounting_workspace",
] as const;
