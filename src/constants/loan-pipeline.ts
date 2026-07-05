import type { PipelineStage } from "@/types/catalyst-one";

export const PIPELINE_STAGES: { id: PipelineStage; label: string }[] = [
  { id: "raw_lead", label: "Raw Lead" },
  { id: "pre_login", label: "Pre Login" },
  { id: "logged_in", label: "Logged In" },
  { id: "credit_wip", label: "Credit WIP" },
  { id: "soft_approval", label: "Soft Approval" },
  { id: "final_approval", label: "Final Approval" },
  { id: "disbursement", label: "Disbursement Pending" },
  { id: "invoice_raised", label: "Disbursed" },
  { id: "payout_received", label: "Payout Received" },
];

export const STAGE_COLORS: Record<PipelineStage, string> = {
  raw_lead: "#94A3B8",
  pre_login: "#64748B",
  logged_in: "#3B82F6",
  credit_wip: "#6366F1",
  soft_approval: "#8B5CF6",
  final_approval: "#A855F7",
  disbursement: "#F59E0B",
  invoice_raised: "#22C55E",
  payout_received: "#0F766E",
};

/** Default RM for "My Files" saved view in demo mode */
export const DEMO_CURRENT_RM = "Amit Sharma";

export const STAGE_LABELS: Record<PipelineStage, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.id, s.label]),
) as Record<PipelineStage, string>;

export const STAGE_ORDER: PipelineStage[] = PIPELINE_STAGES.map((s) => s.id);

export function getStageIndex(stage: PipelineStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export function getStageProgress(stage: PipelineStage): number {
  const index = getStageIndex(stage);
  return Math.round(((index + 1) / STAGE_ORDER.length) * 100);
}
