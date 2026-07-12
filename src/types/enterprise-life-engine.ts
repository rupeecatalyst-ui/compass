/**
 * LIFE — Lender Intelligence & Facilitation Engine (SPR-001).
 * Intelligent lender executor selection. Configuration-driven filters.
 */

export type LifeContactRole =
  | "lender_executor"
  | "credit"
  | "operations"
  | "policy"
  | "relationship_manager"
  | "other";

export type LifeActiveStatus = "active" | "inactive" | "suspended";

export interface LifeLenderContact {
  id: string;
  contactCode: string;
  contactName: string;
  mobile?: string;
  email?: string;
  lenderRef: string;
  lenderName: string;
  branchRef?: string;
  branchName?: string;
  city: string;
  productRefs: string[];
  businessMappingRefs: string[];
  roles: LifeContactRole[];
  lenderExecutor: boolean;
  activeStatus: LifeActiveStatus;
  reportingManagerRef?: string;
  reportingManagerName?: string;
  reportingHierarchy: string[];
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface LifeLenderSelectionCriteria {
  productRef: string;
  city: string;
  businessMappingRef?: string;
  requireActive?: boolean;
}

export interface LifeLenderSelectionResult {
  contact: LifeLenderContact;
  lenderRef: string;
  lenderName: string;
  branchRef?: string;
  branchName?: string;
  reportingHierarchy: string[];
  reportingManagerRef?: string;
  reportingManagerName?: string;
  selectionReason: string;
  recommendationScore: number;
}

export interface LifeRecommendationHint {
  id: string;
  contactId: string;
  relationshipType: string;
  weight: number;
  rationale: string;
  enabled: boolean;
}

export type LifeValidationSeverity = "error" | "warning";

export interface LifeValidationIssue {
  code: string;
  severity: LifeValidationSeverity;
  message: string;
  entityRef?: string;
}

export interface LifeValidationResult {
  valid: boolean;
  issues: LifeValidationIssue[];
}

export interface LifeAuditReference {
  id: string;
  entityId: string;
  entityType: "lender_contact" | "selection";
  eafAuditEntryId: string;
  recordedOn: string;
}

export interface LifeRegistrySnapshot {
  contacts: LifeLenderContact[];
  recommendationHints: LifeRecommendationHint[];
  auditReferences: LifeAuditReference[];
}
