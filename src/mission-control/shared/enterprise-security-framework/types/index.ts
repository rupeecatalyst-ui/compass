/**
 * Enterprise Security Framework — primitive types.
 * Infrastructure only. No auth / authorization / APIs / DB.
 */

export type SecurityPublisherStatus = "registered" | "active" | "paused" | "retired" | "planned";

export type FrameworkSecurityHealth =
  | "healthy"
  | "watch"
  | "elevated"
  | "critical"
  | "unknown";

export type FrameworkSecuritySeverity = "critical" | "high" | "medium" | "low" | "info";

export type SecurityCategoryId =
  | "identity"
  | "authentication"
  | "authorization"
  | "mfa"
  | "sessions"
  | "permissions"
  | "break_glass"
  | "audit"
  | "compliance"
  | "threat_detection"
  | "platform"
  | "other";

export type SecurityPolicyStatus = "draft" | "active" | "deprecated" | "placeholder";

export type SecurityEventLifecycle =
  | "detected"
  | "acknowledged"
  | "investigating"
  | "contained"
  | "resolved"
  | "dismissed";

export type PermissionEffect = "allow" | "deny" | "audit_only";

export type SessionState = "active" | "idle" | "anomalous" | "revoked_placeholder" | "expired";

export type ThreatStatus = "open" | "watching" | "mitigated_placeholder" | "closed";

export type ComplianceControlStatus = "passing" | "failing" | "unknown" | "not_assessed";
