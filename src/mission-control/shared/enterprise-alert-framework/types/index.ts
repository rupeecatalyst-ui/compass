/**
 * Enterprise Alert Publishing Framework — primitive types.
 * Architecture only — no channel delivery or notifications.
 */

export type AlertFrameworkSeverity = "critical" | "high" | "medium" | "low" | "info";

export type AlertFrameworkPriority = "p1" | "p2" | "p3" | "p4" | "p5";

export type AlertFrameworkChannelKind =
  | "mission_control"
  | "email"
  | "sms"
  | "whatsapp"
  | "push"
  | "webhook"
  | "mobile"
  | "microsoft_teams"
  | "slack";

export type AlertPublisherStatus =
  | "registered"
  | "planned"
  | "active"
  | "suspended"
  | "deprecated";

export type AlertChannelStatus = "planned" | "enabled" | "disabled";

export type AlertRoutingMode = "broadcast" | "priority" | "filtered" | "none";

export type AlertDedupeStrategy = "none" | "fingerprint" | "title_source" | "custom";

/** Placeholder alert lifecycle states */
export type AlertLifecycleState =
  | "generated"
  | "published"
  | "acknowledged"
  | "assigned"
  | "resolved"
  | "archived";

export type AlertSourceStatus =
  | "registered"
  | "planned"
  | "active"
  | "suspended"
  | "deprecated";
