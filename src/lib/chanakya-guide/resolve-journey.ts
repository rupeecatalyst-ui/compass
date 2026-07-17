/**
 * Resolve certified Loan Journey position from Guide context.
 */

import {
  CHANAKYA_LOAN_JOURNEY_PHASES,
  CHANAKYA_LOAN_JOURNEY_STAGES,
} from "@/constants/chanakya-guide/loan-journey";
import type {
  ChanakyaGuideContext,
  ChanakyaLoanJourneyPhaseDef,
  ChanakyaLoanJourneyStageDef,
} from "@/types/chanakya-guide";

export function listChanakyaLoanJourneyStages(options?: {
  /** When false (default for navigator), exclude Tasks/Timeline support modules. */
  includeSupport?: boolean;
}): ChanakyaLoanJourneyStageDef[] {
  const stages = [...CHANAKYA_LOAN_JOURNEY_STAGES].sort((a, b) => a.order - b.order);
  if (options?.includeSupport) return stages;
  return stages.filter((s) => (s.kind ?? "workflow") !== "support");
}

export function getChanakyaLoanJourneyPhase(
  phaseId: ChanakyaLoanJourneyStageDef["phaseId"],
): ChanakyaLoanJourneyPhaseDef {
  return (
    CHANAKYA_LOAN_JOURNEY_PHASES.find((p) => p.id === phaseId) ??
    CHANAKYA_LOAN_JOURNEY_PHASES[0]!
  );
}

/**
 * Detect the transaction's current journey stage from workspace context.
 * Prefer section-specific matches (e.g. lenders → Lender Pipeline) over broad workspace matches.
 */
export function resolveChanakyaLoanJourneyStageIndex(
  context: ChanakyaGuideContext,
): number {
  const rawSection = (context.section ?? context.moduleId)?.trim();
  const section =
    rawSection === "tasks" || rawSection === "timeline" ? "overview" : rawSection;
  const workspaceId =
    context.workspaceId === "tasks" ? "loan_workspace" : context.workspaceId;
  const stages = listChanakyaLoanJourneyStages();

  if (section) {
    const bySection = stages.findIndex(
      (s) =>
        s.matchSections?.includes(section) &&
        (!s.matchWorkspaceIds?.length ||
          s.matchWorkspaceIds.includes(workspaceId) ||
          s.matchWorkspaceIds.length === 0),
    );
    if (bySection >= 0) return bySection;
  }

  const byWorkspace = stages.findIndex((s) =>
    s.matchWorkspaceIds?.includes(workspaceId),
  );
  if (byWorkspace >= 0) return byWorkspace;

  // Sensible default for unknown surfaces: Strategic Workspace (core planning).
  const strategic = stages.findIndex((s) => s.id === "strategic_workspace");
  return strategic >= 0 ? strategic : 0;
}

export function getChanakyaLoanJourneyProgress(focusIndex: number) {
  const stages = listChanakyaLoanJourneyStages();
  const current = stages[focusIndex] ?? stages[0]!;
  const next = stages[focusIndex + 1] ?? null;
  const previous = stages[focusIndex - 1] ?? null;
  const phase = getChanakyaLoanJourneyPhase(current.phaseId);
  const nextPhase = next ? getChanakyaLoanJourneyPhase(next.phaseId) : null;

  return {
    stages,
    focusIndex,
    current,
    next,
    previous,
    phase,
    nextPhase,
    nextObjective: next?.objective ?? "Journey complete — review closure.",
  };
}
