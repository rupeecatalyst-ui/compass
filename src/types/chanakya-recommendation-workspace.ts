import type { CanonicalLenderRecommendationResult } from "@/types/canonical-lender-recommendation";

export type ChanakyaWorkspacePanel =
  | "information_required"
  | "unsupported"
  | "blocked"
  | "complete";

export type ChanakyaWorkspaceState =
  | "INFORMATION_REQUIRED"
  | "INFORMATION_COMPLETE"
  | "UNSUPPORTED_CANONICAL_FACT"
  | "NO_PROGRAMME_INVENTORY"
  | "NO_ELIGIBLE_PROGRAMMES"
  | "CONFIGURATION_BLOCKED"
  | "UNSUPPORTED_METHODOLOGY";

export type ChanakyaRecommendationWorkspaceDto = {
  opportunityId: string;
  assessmentId: string | null;
  revisionId: string | null;
  revisionKind: "SAVED" | "FINALIZED" | null;
  readinessStatus: string | null;
  failureCode: string | null;
  missingFactKeys: string[];
  missingLabels: string[];
  panel: ChanakyaWorkspacePanel;
  workspaceState: ChanakyaWorkspaceState;
  executionAllowed: boolean;
  recommendationExecuted: boolean;
  resultStatus: string | null;
  guidance: string;
  result: CanonicalLenderRecommendationResult | null;
};
