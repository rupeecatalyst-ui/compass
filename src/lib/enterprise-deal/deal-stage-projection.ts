import type { PipelineStage } from "@/types/catalyst-one";
import { migrateLegacyStage } from "@/constants/loan-stage-master";

export type DealStageProjectionSource = {
  grossStage?: string | null;
  id?: string;
};

/**
 * Resolve the canonical Deal Registry stage for UI projections.
 * Never invent a stage. Never prefer LoanFile.stage over Deal.grossStage.
 */
export function resolveDealStageProjection(
  deal: DealStageProjectionSource,
): PipelineStage | "" {
  const raw = deal.grossStage?.trim();
  if (!raw) return "";
  return migrateLegacyStage(raw) as PipelineStage;
}

export function assertDealStageAuthority(): string {
  return "EnterpriseDeal.grossStage";
}
