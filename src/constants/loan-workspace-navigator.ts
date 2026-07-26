/**
 * Loan Workspace — Execution Hub journey roadmap (UI presentation).
 * Aligned to frozen Canonical Journey Header (CO-ARCH).
 */

import {
  CANONICAL_JOURNEY_STAGES,
  type CanonicalJourneyStageDef,
  type CanonicalJourneyStageId,
} from "@/constants/canonical-journey-header";
import { ROUTES } from "@/constants/routes";

export const LOAN_WORKSPACE_HUB_OFFICIAL_NAME = "Loan Journey";

export const LOAN_WORKSPACE_HUB_STATUS_LINE =
  "One roadmap. See where the loan starts, where you are, what comes next, and what success looks like.";

/** Query flag: show execution book (Kanban / List / Timeline / Tasks). */
export const LOAN_WORKSPACE_BROWSE_PARAM = "browse";

/** Query flag: keep opportunity context but show hub (do not auto-open execution modal). */
export const LOAN_WORKSPACE_SURFACE_PARAM = "surface";
export const LOAN_WORKSPACE_SURFACE_HUB = "hub";

/** Visual states supported by the hub journey rail (presentation only). */
export type ExecutionHubJourneyVisualState =
  | "current"
  | "completed"
  | "pending"
  | "locked";

export type ExecutionHubJourneyStepId = CanonicalJourneyStageId;

export interface ExecutionHubJourneyStep {
  id: ExecutionHubJourneyStepId;
  label: string;
  shortLabel: string;
  description: string;
  href: string;
  tab?: string;
  defaultState: ExecutionHubJourneyVisualState;
  navigable?: boolean;
  isSuccessDestination?: boolean;
}

function toHubStep(
  stage: CanonicalJourneyStageDef,
  defaultState: ExecutionHubJourneyVisualState,
): ExecutionHubJourneyStep {
  return {
    id: stage.id,
    label: stage.label,
    shortLabel: stage.shortLabel,
    description: stage.purpose,
    href: stage.href,
    tab: stage.tab,
    defaultState,
    navigable: stage.navigable,
    isSuccessDestination: stage.isSuccessDestination,
  };
}

/**
 * Execution Hub loan journey roadmap — same frozen sequence as Canonical Journey Header.
 */
export const EXECUTION_HUB_JOURNEY_STEPS: ExecutionHubJourneyStep[] =
  CANONICAL_JOURNEY_STAGES.map((stage, index) =>
    toHubStep(stage, index === 0 ? "current" : "pending"),
  );

/** @deprecated Prefer EXECUTION_HUB_JOURNEY_STEPS — kept for type compatibility. */
export type LoanWorkspaceHubCardId = ExecutionHubJourneyStepId;

/** @deprecated Prefer ExecutionHubJourneyStep. */
export type LoanWorkspaceHubCard = ExecutionHubJourneyStep;

/** @deprecated Prefer EXECUTION_HUB_JOURNEY_STEPS. */
export const LOAN_WORKSPACE_HUB_CARDS = EXECUTION_HUB_JOURNEY_STEPS;

void ROUTES;
