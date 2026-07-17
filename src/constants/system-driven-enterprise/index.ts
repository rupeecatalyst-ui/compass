import type {
  SdeEventCode,
  SdeGuidanceLevel,
  SdeOperationalCategory,
  SdeSeverity,
} from "@/types/system-driven-enterprise";

export const SDE_STORAGE_KEY = "catalyst.system-driven-enterprise.v1";

export const SDE_PRINCIPLES_VERSION = "1.0" as const;

/** Frozen core principles — System-Driven Enterprise */
export const SDE_CORE_PRINCIPLES = [
  "Guide before blocking.",
  "Prevent errors where appropriate.",
  "Allow controlled exceptions when business continuity requires them.",
  "Record every exception.",
  "Measure every deviation.",
  "Escalate intelligently.",
  "Maintain complete auditability.",
] as const;

export const SDE_OPERATING_MODE = {
  systemGuides: true,
  usersExecute: true,
  managementSupervises: true,
  /** Chanakya / intelligence never hard-blocks — Policy Engine only */
  blockAuthority: "policy_engine" as const,
  guideBeforeBlock: true,
} as const;

export const SDE_EVENT_LABELS: Record<SdeEventCode, string> = {
  GUIDANCE_EMITTED: "Guidance emitted",
  WARNING_EMITTED: "Warning emitted",
  EXCEPTION_RECORDED: "Controlled exception recorded",
  EXCEPTION_RESOLVED: "Exception resolved",
  EXCEPTION_ESCALATED: "Exception escalated",
  SLA_WARNING: "SLA warning",
  SLA_BREACHED: "SLA breached",
  MISSING_MANDATORY_DOCUMENT: "Missing mandatory document",
  PENDING_APPROVAL: "Pending approval",
  WORKFLOW_DELAY: "Workflow delay",
  POLICY_DEVIATION: "Policy deviation",
  MANUAL_OVERRIDE: "Manual override",
  COMPLIANCE_EXCEPTION: "Compliance exception",
  INCOMPLETE_ACTIVITY: "Incomplete activity",
  POLICY_BLOCK: "Policy block",
};

export const SDE_CATEGORY_LABELS: Record<SdeOperationalCategory, string> = {
  sla: "SLA",
  documents: "Documents",
  approvals: "Approvals",
  workflow: "Workflow",
  policy: "Policy",
  override: "Override",
  compliance: "Compliance",
  activity: "Activity",
  guidance: "Guidance",
};

export const SDE_DEFAULT_SEVERITY: Partial<Record<SdeEventCode, SdeSeverity>> = {
  GUIDANCE_EMITTED: "info",
  WARNING_EMITTED: "medium",
  EXCEPTION_RECORDED: "medium",
  EXCEPTION_RESOLVED: "info",
  EXCEPTION_ESCALATED: "high",
  SLA_WARNING: "high",
  SLA_BREACHED: "critical",
  MISSING_MANDATORY_DOCUMENT: "high",
  PENDING_APPROVAL: "medium",
  WORKFLOW_DELAY: "medium",
  POLICY_DEVIATION: "high",
  MANUAL_OVERRIDE: "medium",
  COMPLIANCE_EXCEPTION: "critical",
  INCOMPLETE_ACTIVITY: "low",
  POLICY_BLOCK: "critical",
};

export const SDE_GUIDANCE_LEVEL_LABELS: Record<SdeGuidanceLevel, string> = {
  observe: "Observe",
  recommend: "Recommend",
  warn: "Warn",
  escalate: "Escalate",
  policy_block: "Policy block",
};

export const SDE_MISSION_CONTROL_MONITORS = [
  "SLA breaches",
  "Missing mandatory documents",
  "Pending approvals",
  "Workflow delays",
  "Policy deviations",
  "Manual overrides",
  "Compliance exceptions",
  "Incomplete activities",
] as const;
