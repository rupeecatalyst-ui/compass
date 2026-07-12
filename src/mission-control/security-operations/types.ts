/**
 * Security Operations Center — contracts only.
 * Executive security workspace UI architecture.
 * No auth / MFA / audit execution / APIs / business logic.
 */

export type SecurityHealthStatus = "healthy" | "watch" | "elevated" | "critical" | "unknown";

export type SecuritySeverity = "critical" | "high" | "medium" | "low" | "info";

export type SecurityDomainId =
  | "identity"
  | "authentication"
  | "authorization"
  | "mfa"
  | "sessions"
  | "permissions"
  | "break_glass"
  | "audit"
  | "compliance"
  | "threat_detection";

export type SecurityEventKind =
  | "threat"
  | "identity"
  | "session"
  | "policy"
  | "compliance"
  | "access";

export interface SecurityNavigateAction {
  label: string;
  href?: string;
}

export interface SecurityPlaceholderAction {
  label: string;
}

export interface SecuritySummaryModel {
  title: string;
  postureLabel: string;
  summary: string;
  asOf: string;
  openEvents: number;
  elevatedDomains: number;
  sourceModules: readonly string[];
}

export interface SecurityHealthIndicator {
  id: string;
  label: string;
  status: SecurityHealthStatus;
  detail?: string;
}

export interface SecurityDomain {
  id: SecurityDomainId;
  title: string;
  status: SecurityHealthStatus;
  severity: SecuritySeverity;
  summary: string;
  signalLabel: string;
  viewDetailsAction: SecurityNavigateAction;
}

export interface SecurityEvent {
  id: string;
  title: string;
  summary: string;
  kind: SecurityEventKind;
  severity: SecuritySeverity;
  domainId: SecurityDomainId;
  sourceModule: string;
  occurredAt: string;
  acknowledgeAction: SecurityPlaceholderAction;
  investigateAction: SecurityPlaceholderAction;
}

export interface ThreatItem {
  id: string;
  title: string;
  summary: string;
  severity: SecuritySeverity;
  category: string;
  sourceModule: string;
  detectedAt: string;
  recommendedAction: string;
  viewDetailsAction: SecurityNavigateAction;
}

export interface IdentityOverviewModel {
  activePrincipalsLabel: string;
  privilegedAccountsLabel: string;
  pendingReviewsLabel: string;
  federationStatusLabel: string;
  summary: string;
}

export interface SessionSummaryModel {
  activeSessionsLabel: string;
  anomalousSessionsLabel: string;
  avgDurationLabel: string;
  remoteAccessLabel: string;
  summary: string;
}

export interface ComplianceStatusModel {
  overallLabel: string;
  status: SecurityHealthStatus;
  controlsPassingLabel: string;
  openFindingsLabel: string;
  nextReviewLabel: string;
  summary: string;
}

export interface SecurityQuickAction {
  id: string;
  label: string;
  description: string;
  href?: string;
  placeholder?: boolean;
}

export interface SecurityAlertItem {
  id: string;
  title: string;
  severity: SecuritySeverity;
  category: string;
  sourceModule: string;
  recommendedAction: string;
  viewDetailsAction: SecurityNavigateAction;
}

export interface SecurityOperationsModel {
  summary: SecuritySummaryModel;
  health: readonly SecurityHealthIndicator[];
  domains: readonly SecurityDomain[];
  events: readonly SecurityEvent[];
  threats: readonly ThreatItem[];
  identity: IdentityOverviewModel;
  sessions: SessionSummaryModel;
  compliance: ComplianceStatusModel;
  alerts: readonly SecurityAlertItem[];
  quickActions: readonly SecurityQuickAction[];
}
