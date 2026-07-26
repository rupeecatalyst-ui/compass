/**
 * CO-GOV-001 — Enterprise Governance, Audit & Compliance contracts.
 * No secrets / raw PII blobs. Scalars only for field values.
 */

export type GovernanceEntityType =
  | "Customer"
  | "Contact"
  | "Opportunity"
  | "EnterpriseDeal"
  | "LoanFile"
  | "Lender"
  | "Workflow"
  | "Document"
  | "AccountingEntry"
  | "Role"
  | "Permission"
  | "Configuration"
  | "FeatureFlag"
  | "Policy"
  | "Other";

export type GovernanceLifecycleAction =
  | "Created"
  | "Updated"
  | "Deleted"
  | "Restored";

export type GovernanceEntityChangeEvent = {
  id: string;
  at: string;
  entityType: GovernanceEntityType;
  entityId: string;
  action: GovernanceLifecycleAction;
  actorUserId: string | null;
  summary: string;
  previousValue: string | null;
  newValue: string | null;
  correlationId: string;
  reason?: string | null;
};

export type GovernanceFieldAuditEvent = {
  id: string;
  at: string;
  entityType: GovernanceEntityType;
  entityId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string | null;
  changedAt: string;
  reason?: string | null;
  correlationId: string;
};

export type GovernanceTimelineKind =
  | "lifecycle"
  | "field"
  | "admin"
  | "configuration"
  | "business"
  | "ops";

export type GovernanceTimelineEvent = {
  id: string;
  at: string;
  kind: GovernanceTimelineKind;
  title: string;
  summary: string;
  entityType: GovernanceEntityType | string;
  entityId: string | null;
  actorUserId: string | null;
  correlationId?: string;
  previousValue?: string | null;
  newValue?: string | null;
};

export type GovernanceExportKind =
  | "audit_trail"
  | "change_history"
  | "user_activity"
  | "administrative_changes"
  | "field_audit"
  | "full_pack";

export type GovernanceComplianceDimension = {
  id: string;
  label: string;
  status: "ready" | "partial" | "gap";
  score: number;
  notes: string;
};

export type GovernanceComplianceAssessment = {
  asOf: string;
  overallScore: number;
  auditCompleteness: number;
  entityCoverage: number;
  complianceReadiness: number;
  dimensions: readonly GovernanceComplianceDimension[];
  remainingGaps: readonly string[];
  recommendations: readonly string[];
  summary: string;
};

/** Important business fields tracked for field-level audit (examples). */
export const GOVERNANCE_IMPORTANT_FIELDS = [
  "loanAmount",
  "requestedAmount",
  "approvedAmount",
  "stage",
  "subStage",
  "grossStage",
  "operationalStatus",
  "lifecycleStatus",
  "relationshipManagerUserId",
  "relationshipManagerName",
  "assignedLender",
  "productId",
  "productCode",
  "productLabel",
  "status",
  "priority",
] as const;
