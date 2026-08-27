import {
  grossStageToLenderCaseStage,
  lenderCaseStageToPipelineStageProjection,
  type DealPipelineStageProjection,
} from "@/lib/enterprise-deal/deal-lender-stage-map";

export type DealStageProjectionSource = {
  grossStage?: string | null;
  id?: string;
};

/**
 * Resolve Deal Registry stage for LoanFile / My Deals PipelineStage projections.
 * Registry may store LenderCaseStage (canonical) or legacy PipelineStage.
 * Never invent a stage. Never prefer LoanFile.stage over Deal.grossStage.
 * Deal Stage SSOT remains EnterpriseDeal.grossStage (LenderCaseStage).
 */
export function resolveDealStageProjection(
  deal: DealStageProjectionSource,
): DealPipelineStageProjection | "" {
  const raw = deal.grossStage?.trim();
  if (!raw) return "";
  const lenderStage = grossStageToLenderCaseStage(raw);
  return lenderCaseStageToPipelineStageProjection(lenderStage);
}

export function assertDealStageAuthority(): string {
  return "EnterpriseDeal.grossStage";
}
