/**
 * Enterprise Decision Ledger (EDL) — constitutional memory of Catalyst One.
 * Append-only. Facts are immutable. History is never rewritten.
 */

export type EdlChangeCategory =
  | "commission_structure"
  | "partner_commercials"
  | "lender_commercials"
  | "product_rules"
  | "credit_policies"
  | "workflow_configuration"
  | "stage_configuration"
  | "sla_configuration"
  | "document_checklist"
  | "business_rules"
  | "policy_engine_configuration"
  | "credit_risk_engine_configuration"
  | "experience_console_changes"
  | "organization_settings"
  | "user_role_changes"
  | "permission_changes"
  | "commercial_agreement"
  | "immutable_fact_correction"
  | "enterprise_engine_configuration"
  | "other";

export type EdlChangeType =
  | "created"
  | "updated"
  | "versioned"
  | "published"
  | "deprecated"
  | "archived"
  | "corrected"
  | "migrated";

export type EdlImpactScope =
  | "global"
  | "tenant"
  | "organization"
  | "product"
  | "lender"
  | "partner"
  | "policy"
  | "workflow"
  | "role"
  | "entity"
  | "transaction_future_only";

/** Permanent ledger entry — never overwritten. */
export interface EdlLedgerEntry {
  /** Unique Ledger ID */
  ledgerId: string;
  /** ISO date-time when the decision was recorded */
  recordedAt: string;
  requestedBy: string;
  approvedBy: string;
  implementedBy?: string;
  /** Serialized / structured previous value (historical truth). */
  previousValue: unknown;
  /** Serialized / structured new value. */
  newValue: unknown;
  /** Mandatory business justification. */
  businessJustification: string;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  /** Semantic version label e.g. "3" or "2.1". */
  versionNumber: string;
  impactScope: EdlImpactScope;
  changeType: EdlChangeType;
  changeCategory: EdlChangeCategory;
  relatedEngine: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  relatedEntityLabel?: string;
  /** Optional link to EAF audit trail. */
  eafAuditEntryId?: string;
  /** Which transactions intentionally stay on prior version (explainability). */
  notImpactedNote?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
}

/** Versioned commercial agreement — historical calculations stay on creation-date version. */
export interface EdlCommercialAgreementVersion {
  id: string;
  agreementCode: string;
  agreementLabel: string;
  relatedEntityType: "partner" | "lender" | "product" | "organization" | "other";
  relatedEntityId: string;
  versionNumber: string;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  /** Commercial payload e.g. { commissionPct: 0.4 } */
  terms: Record<string, unknown>;
  ledgerId: string;
  createdBy: string;
  createdAt: string;
}

export interface EdlAuditReference {
  id: string;
  ledgerId: string;
  eafAuditEntryId: string;
  recordedOn: string;
}

export interface EdlRegistrySnapshot {
  frameworkVersion: string;
  entryCount: number;
  commercialVersionCount: number;
  capturedAt: string;
}

export interface CreateEdlEntryInput {
  requestedBy: string;
  approvedBy: string;
  implementedBy?: string;
  previousValue: unknown;
  newValue: unknown;
  businessJustification: string;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  versionNumber: string;
  impactScope: EdlImpactScope;
  changeType: EdlChangeType;
  changeCategory: EdlChangeCategory;
  relatedEngine: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  relatedEntityLabel?: string;
  notImpactedNote?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
}
