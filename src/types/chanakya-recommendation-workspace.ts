import type { CanonicalLenderRecommendationResult } from "@/types/canonical-lender-recommendation";

export type ChanakyaWorkspacePanel =
  | "information_required"
  | "unsupported"
  | "blocked"
  | "complete";

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
  executionAllowed: boolean;
  recommendationExecuted: boolean;
  resultStatus: string | null;
  guidance: string;
  result: CanonicalLenderRecommendationResult | null;
};
