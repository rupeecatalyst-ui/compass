import type { PipelineStage } from "@/types/catalyst-one";
import {
  grossStageToLenderCaseStage,
  lenderCaseStageToPipelineStageProjection,
} from "@/lib/enterprise-deal/deal-lender-stage-map";

export type DealStageProjectionSource = {
  grossStage?: string | null;
  id?: string;
};

/**
 * Resolve Deal Registry stage for LoanFile / My Deals PipelineStage projections.
 * Registry may store LenderCaseStage (canonical) or legacy PipelineStage.
 * Never invent a stage. Never prefer LoanFile.stage over Deal.grossStage.
 */
export function resolveDealStageProjection(
  deal: DealStageProjectionSource,
): PipelineStage | "" {
  const raw = deal.grossStage?.trim();
  if (!raw) return "";
  const lenderStage = grossStageToLenderCaseStage(raw);
  return lenderCaseStageToPipelineStageProjection(lenderStage);
}

export function assertDealStageAuthority(): string {
  return "EnterpriseDeal.grossStage";
}
