/**
 * Chanakya Guide Phase 1 — presentation contracts only.
 * Not Enterprise Success Coach. No learning, tolerance, escalation, or coaching engines.
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

export interface ChanakyaGuideContext {
  platform?: ChanakyaGuidePlatform;
  workspaceId: ChanakyaGuideWorkspaceId;
  /** Optional module / tab within the workspace (e.g. overview, lenders). */
  moduleId?: string;
  /** Optional workflow / stage label for filtering. */
  workflowContext?: string;
  /** Display-only transaction label (customer · file). */
  transactionLabel?: string;
}

export interface ChanakyaGuideCard {
  id: string;
  /** Short mentor headline. */
  title: string;
  purpose: string;
  businessValue: string;
  recommendedNextStep: string;
  /** Expanded mentor detail — shown via Learn More. */
  learnMore: string;
  /** Optional tags for module / workflow filtering. */
  moduleIds?: string[];
  workflowContexts?: string[];
}

export interface ChanakyaGuidePageDef {
  workspaceId: ChanakyaGuideWorkspaceId;
  platform: ChanakyaGuidePlatform;
  /** Workspace display name. */
  workspaceLabel: string;
  /** One-line what this page is for. */
  pagePurpose: string;
  cards: ChanakyaGuideCard[];
}

export interface ChanakyaTourStep {
  id: string;
  title: string;
  body: string;
  /** Optional workspace to highlight conceptually. */
  relatedWorkspaceId?: ChanakyaGuideWorkspaceId;
}

export type ChanakyaTourStatus = "not_started" | "in_progress" | "paused" | "completed" | "skipped";

export interface ChanakyaTourState {
  status: ChanakyaTourStatus;
  stepIndex: number;
  updatedAt: string;
}
