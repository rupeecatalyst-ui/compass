/**
 * EDIE Certified Business Rules — Phase 1 types.
 * Document Center consumes these; never hardcode checklists in UI.
 */

export type EdieProductRef =
  | "product:home-loan"
  | "product:home-loan-bt"
  | "product:lap"
  | "product:unsecured-business-loan"
  | "product:personal-loan";

export type EdieCustomerCategory = "salaried" | "self_employed" | "company";

export type EdieTransactionType = "fresh" | "balance_transfer";

/** Workflow stage used for Critical activation. */
export type EdieWorkflowStage =
  | "pre_login"
  | "before_lender_login"
  | "soft_approval"
  | "final_approval"
  | "disbursement"
  | "accounting"
  | "closure";

export type EdieDocumentSeverity = "required" | "mandatory" | "critical";

export type EdieDocumentModuleId =
  | "customer_kyc"
  | "address_proof"
  | "business_constitution"
  | "financial"
  | "banking"
  | "property"
  | "existing_loan";

export type EdieUploadMode = "individual" | "folder" | "choice_one";

export interface EdieCatalogDocument {
  typeRef: string;
  label: string;
  moduleId: EdieDocumentModuleId;
  /** Default severity before stage overlays. */
  defaultSeverity: EdieDocumentSeverity;
  optional?: boolean;
  weight: number;
}

export interface EdieChecklistItem {
  typeRef: string;
  label: string;
  moduleId: EdieDocumentModuleId;
  moduleLabel: string;
  severity: EdieDocumentSeverity;
  /** required | mandatory | critical flags for scoring / UI. */
  mandatory: boolean;
  critical: boolean;
  optional: boolean;
  uploadMode: EdieUploadMode;
  /** Folder id when uploadMode is folder. */
  folderId?: string;
  folderLabel?: string;
  weight: number;
  /** Stage at which severity becomes critical (if applicable). */
  criticalFromStage?: EdieWorkflowStage;
  complete: boolean;
  /** For address proof choice — selected variant. */
  choiceGroupId?: string;
}

export interface EdieChecklistModule {
  id: EdieDocumentModuleId;
  label: string;
  description?: string;
  items: EdieChecklistItem[];
}

export interface EdieResolvedChecklist {
  productRef: EdieProductRef;
  customerCategory: EdieCustomerCategory;
  transactionType: EdieTransactionType;
  workflowStage: EdieWorkflowStage;
  constitution?: string;
  modules: EdieChecklistModule[];
  items: EdieChecklistItem[];
  counts: {
    required: number;
    mandatory: number;
    critical: number;
    received: number;
    pending: number;
    criticalPending: number;
  };
}

export interface EdieResolveInput {
  productRef: EdieProductRef;
  customerCategory: EdieCustomerCategory;
  transactionType: EdieTransactionType;
  workflowStage: EdieWorkflowStage;
  constitution?: string;
  /** typeRef → complete */
  receipts?: Record<string, boolean>;
  /** Address proof selection (typeRef within choice group). */
  addressProofSelection?: string;
}

export interface EdieComplianceGateResult {
  allowed: boolean;
  missingMandatory: EdieChecklistItem[];
  summary: string;
}
