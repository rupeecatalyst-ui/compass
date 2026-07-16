/**
 * Chanakya Guide Phase 1 — Enterprise Guide Repository contracts.
 * Configuration-driven knowledge source. UI renders entries only.
 * Foundation for future Enterprise Success Coach (Phase 2) — not coaching itself.
 */

export type ChanakyaGuidePlatform = "catalyst_one" | "catalyst_connect" | "compass";

export type ChanakyaGuideWorkspaceId =
  | "strategic_workspace"
  | "loan_workspace"
  | "credit_workbench"
  | "document_center"
  | "opportunity_setup"
  | "dialogue"
  | "tasks"
  | "lender_pipeline"
  | "platform_tour";

/** Runtime context used to resolve repository entries. */
export interface ChanakyaGuideContext {
  platform?: ChanakyaGuidePlatform;
  workspaceId: ChanakyaGuideWorkspaceId;
  /** Section / tab within the workspace (maps to Guide.section). */
  section?: string;
  /** @deprecated Prefer `section`. Kept for existing callers. */
  moduleId?: string;
  workflowContext?: string;
  transactionLabel?: string;
}

/**
 * Atomic Guide entry — Enterprise Knowledge unit.
 * All user-facing copy lives here; components must not invent guidance text.
 */
export interface ChanakyaGuideEntry {
  id: string;
  platform: ChanakyaGuidePlatform;
  workspaceId: ChanakyaGuideWorkspaceId;
  /** Section within the workspace (e.g. overview, lenders, default). */
  section: string;
  guidanceTitle: string;
  /** Short mentor-style message (primary). */
  mentorMessage: string;
  /** Expanded detail — Learn More. */
  detailedGuidance: string;
  bestPractice: string;
  recommendedNextStep: string;
  relatedWorkflow?: string;
  relatedRegistry?: string;
  relatedEnterpriseEngine?: string;
  /** Optional workflow filter tags. */
  workflowContexts?: string[];
  sortOrder?: number;
}

/** Workspace chrome metadata (label + one-line purpose). */
export interface ChanakyaGuideWorkspaceMeta {
  platform: ChanakyaGuidePlatform;
  workspaceId: ChanakyaGuideWorkspaceId;
  workspaceLabel: string;
  pagePurpose: string;
}

/** @deprecated Use ChanakyaGuideEntry — kept for transitional imports. */
export type ChanakyaGuideCard = ChanakyaGuideEntry;

/** @deprecated Use ChanakyaGuideWorkspaceMeta + entries. */
export interface ChanakyaGuidePageDef extends ChanakyaGuideWorkspaceMeta {
  cards: ChanakyaGuideEntry[];
}

export interface ChanakyaTourStep {
  id: string;
  title: string;
  body: string;
  relatedWorkspaceId?: ChanakyaGuideWorkspaceId;
}

export type ChanakyaTourStatus = "not_started" | "in_progress" | "paused" | "completed" | "skipped";

export interface ChanakyaTourState {
  status: ChanakyaTourStatus;
  stepIndex: number;
  updatedAt: string;
}
