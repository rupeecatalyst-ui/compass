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

/**
 * Case context for LIFE recommendations (CF-LIFE-001).
 * Populated from Loan File / Contact / Role — never edited as engine filters in UI.
 * Ready for Loan Journey: swap source to loan_file fields without UI redesign.
 */
export type LifeCaseContextSource =
  | "loan_file"
  | "opportunity"
  | "contact_role"
  | "provisional";

export interface LifeCaseContext {
  source: LifeCaseContextSource;
  loanFileId?: string;
  loanFileNumber?: string;
  customerName?: string;
  productRef?: string;
  productLabel?: string;
  customerCity?: string;
  propertyCity?: string;
  loanAmount?: number;
  employmentType?: string;
  /** Hidden engine city used for matching */
  resolvedCity?: string;
  /** Hidden engine business mapping — auto-derived */
  businessMappingRef?: string;
}

export interface LifeCaseContextInput {
  loanFileId?: string;
  loanFile?: import("@/types/catalyst-one").LoanFile;
  provisional?: Partial<LifeCaseContext> & {
    source?: LifeCaseContextSource;
  };
}

export type LifeCompletionActionKind =
  | "complete_property_details"
  | "select_loan_product"
  | "complete_loan_file"
  | "open_loan_files";

export interface LifeContextBlocker {
  code: string;
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
  actionKind: LifeCompletionActionKind;
}

/** Business-facing recommendation row — what the RM chooses from. */
export interface LifeBusinessRecommendation {
  rank: number;
  contactId: string;
  lenderName: string;
  branchName: string;
  executiveName: string;
  relationshipManagerName: string;
  reason: string;
  recommendationScore: number;
}

export interface LifeRecommendationOutcome {
  ready: boolean;
  blockers: LifeContextBlocker[];
  recommendations: LifeBusinessRecommendation[];
  context: LifeCaseContext;
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
