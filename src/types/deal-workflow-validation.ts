/**
 * CO-DWS-001 — Deal Workspace workflow validation classification (SSOT types).
 */

export type DealValidationSeverity = "blocking" | "warning" | "informational";

export type DealValidationTrigger =
  | "open_workspace"
  | "load_workspace"
  | "save_deal"
  | "pipeline_stage_move"
  | "action_center"
  | "accounting_operation"
  | "document_upload"
  | "timeline_view";

export type DealReadinessCategoryId =
  | "customer"
  | "documentation"
  | "lender"
  | "accounting"
  | "commercial"
  | "compliance";

export type DealReadinessStatus = "ready" | "attention" | "blocked" | "not_applicable";

export interface DealWorkflowValidationRule {
  id: string;
  name: string;
  module: string;
  businessPurpose: string;
  triggerPoints: DealValidationTrigger[];
  severity: DealValidationSeverity;
  /** When severity is warning, preferred UX surface */
  warningSurface?: "action_center" | "readiness_panel" | "health_card" | "field_hint";
}

export interface DealReadinessItem {
  categoryId: DealReadinessCategoryId;
  label: string;
  status: DealReadinessStatus;
  message: string;
  actionLabel?: string;
  actionHint?: string;
  code: string;
}

export interface DealReadinessSnapshot {
  generatedAt: string;
  overall: DealReadinessStatus;
  items: DealReadinessItem[];
  /** Non-blocking items suitable for Action Center / readiness strip */
  warnings: DealReadinessItem[];
  /** Integrity blockers only */
  blockers: DealReadinessItem[];
}
