/**
 * Catalyst One v1.0 — System-Driven Enterprise (SDE)
 * Operational discipline without unnecessary blockage.
 * Guide before blocking · Controlled exceptions · SLA monitoring · Full auditability
 */

export type SdeGuidanceLevel =
  | "observe"
  | "recommend"
  | "warn"
  | "escalate"
  | "policy_block";

/** Only the Enterprise Policy Engine may hard-block. */
export type SdeBlockAuthority = "none" | "policy_engine";

export type SdeExceptionStatus =
  | "open"
  | "monitoring"
  | "resolved"
  | "escalated"
  | "cancelled";

export type SdeEventCode =
  | "GUIDANCE_EMITTED"
  | "WARNING_EMITTED"
  | "EXCEPTION_RECORDED"
  | "EXCEPTION_RESOLVED"
  | "EXCEPTION_ESCALATED"
  | "SLA_WARNING"
  | "SLA_BREACHED"
  | "MISSING_MANDATORY_DOCUMENT"
  | "PENDING_APPROVAL"
  | "WORKFLOW_DELAY"
  | "POLICY_DEVIATION"
  | "MANUAL_OVERRIDE"
  | "COMPLIANCE_EXCEPTION"
  | "INCOMPLETE_ACTIVITY"
  | "POLICY_BLOCK";

export type SdeSeverity = "info" | "low" | "medium" | "high" | "critical";

export type SdeOperationalCategory =
  | "sla"
  | "documents"
  | "approvals"
  | "workflow"
  | "policy"
  | "override"
  | "compliance"
  | "activity"
  | "guidance";

export interface SdeControlledException {
  id: string;
  /** Human-readable title */
  title: string;
  category: SdeOperationalCategory;
  status: SdeExceptionStatus;
  /** Responsible user */
  responsibleUserId: string;
  responsibleUserName: string;
  recordedAt: string;
  resolvedAt: string | null;
  workflowId: string | null;
  workflowLabel: string | null;
  transactionId: string | null;
  transactionLabel: string | null;
  reason: string | null;
  /** When true, SLA monitoring is active until resolved */
  slaMonitoring: boolean;
  slaDueAt: string | null;
  guidanceLevel: SdeGuidanceLevel;
  blockAuthority: SdeBlockAuthority;
  visibleUntilResolved: boolean;
  meta?: Record<string, string>;
}

export interface SdeOperationalEvent {
  id: string;
  code: SdeEventCode;
  severity: SdeSeverity;
  category: SdeOperationalCategory;
  title: string;
  summary: string;
  at: string;
  actorUserId: string | null;
  actorUserName: string | null;
  exceptionId: string | null;
  workflowId: string | null;
  transactionId: string | null;
  recommendedAction: string | null;
  /** Feeds Mission Control / dashboards */
  missionControlVisible: boolean;
  meta?: Record<string, string>;
}

export interface SdeAssistanceHint {
  id: string;
  kind: "next_action" | "risk_warning" | "reminder" | "escalation";
  title: string;
  detail: string;
  at: string;
  transactionId: string | null;
  acknowledged: boolean;
}

export interface SdeSnapshot {
  schemaVersion: 1;
  principlesVersion: "1.0";
  exceptions: SdeControlledException[];
  events: SdeOperationalEvent[];
  assistance: SdeAssistanceHint[];
}
