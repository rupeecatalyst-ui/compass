/**
 * Compatibility layer — Opportunity Workspace stage ids map onto the frozen
 * Canonical Journey Header (`canonical-journey-header.ts`).
 */

import {
  buildCanonicalJourneyStageHref,
  getNextCanonicalJourneyStage,
  getPreviousCanonicalJourneyStage,
  opportunityWorkspaceStageToCanonical,
  type CanonicalJourneyStageDef,
  type OpportunityWorkspaceStageId,
} from "@/constants/canonical-journey-header";
import { ROUTES } from "@/constants/routes";

export type { OpportunityWorkspaceStageId } from "@/constants/canonical-journey-header";
export { opportunityWorkspaceStageToCanonical } from "@/constants/canonical-journey-header";

export const OPPORTUNITY_WORKSPACE_OFFICIAL_NAME = "Opportunity Workspace";

export interface OpportunityWorkspaceStageDef {
  id: OpportunityWorkspaceStageId;
  label: string;
  purpose: string;
  href: string;
  moduleId:
    | "credit_bench"
    | "document_center"
    | "credit_workbench"
    | "strategic_workspace";
  sortOrder: number;
}

/** Opportunity-phase slice of the canonical journey (stages 1–4). */
export const OPPORTUNITY_WORKSPACE_STAGES: OpportunityWorkspaceStageDef[] = [
  {
    id: "opportunity_creation",
    label: "Lead Creation",
    purpose: "Create and maintain the customer requirement.",
    href: ROUTES.CREDIT_BENCH,
    moduleId: "credit_bench",
    sortOrder: 1,
  },
  {
    id: "document_center",
    label: "Documents",
    purpose: "Collect all customer documents.",
    href: ROUTES.DOCUMENT_CENTER,
    moduleId: "document_center",
    sortOrder: 2,
  },
  {
    id: "credit_workbench",
    label: "Credit Bench",
    purpose: "Evaluate customer eligibility.",
    href: ROUTES.CREDIT_WORKBENCH,
    moduleId: "credit_workbench",
    sortOrder: 3,
  },
  {
    id: "strategy_workbench",
    label: "LIFE",
    purpose: "Select execution strategy before Deal creation.",
    href: ROUTES.OPPORTUNITY_WORKSPACE,
    moduleId: "strategic_workspace",
    sortOrder: 4,
  },
];

export function getOpportunityWorkspaceStage(
  id: OpportunityWorkspaceStageId,
): OpportunityWorkspaceStageDef {
  const stage = OPPORTUNITY_WORKSPACE_STAGES.find((s) => s.id === id);
  if (!stage) throw new Error(`Unknown Opportunity Workspace stage: ${id}`);
  return stage;
}

export function buildOpportunityWorkspaceStageHref(
  stageId: OpportunityWorkspaceStageId,
  context?: { fileId?: string | null; opportunityId?: string | null },
): string {
  return buildCanonicalJourneyStageHref(
    opportunityWorkspaceStageToCanonical(stageId),
    context,
  );
}

/** Next navigable canonical stage after this Opportunity Workspace stage. */
export function getNextOpportunityWorkspaceStage(
  currentId: OpportunityWorkspaceStageId,
): CanonicalJourneyStageDef | null {
  return getNextCanonicalJourneyStage(
    opportunityWorkspaceStageToCanonical(currentId),
  );
}

export function getPreviousOpportunityWorkspaceStage(
  currentId: OpportunityWorkspaceStageId,
): CanonicalJourneyStageDef | null {
  return getPreviousCanonicalJourneyStage(
    opportunityWorkspaceStageToCanonical(currentId),
  );
}
