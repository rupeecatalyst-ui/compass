/**
 * CO-UX-003 — Enterprise Deal Journey Progress (SSOT).
 * Progress capsules and stage colours derive from this module only.
 * Hold / Lost are status overlays — underlying journey stage is preserved.
 */

import type { LenderCaseStage, PipelineStage } from "@/types/catalyst-one";
import { migrateLegacyStage } from "@/constants/loan-stage-master";
import { normalizeLenderCaseStage } from "@/constants/lender-pipeline";

/** Official enterprise journey colours (frozen — CO-UX-003). */
export const ENTERPRISE_JOURNEY_COLORS = {
  preLogin: "#94A3B8", // Grey
  loggedInWip: "#2563EB", // Blue
  softApproved: "#EAB308", // Yellow
  finalApproved: "#86EFAC", // Light Green
  closureWip: "#22C55E", // Green
  disbursed: "#14532D", // Deep Green
  hold: "#F97316", // Orange
  lost: "#EF4444", // Red
} as const;

/** Ordered journey segments for the progress capsule (excludes Hold/Lost overlays). */
export const ENTERPRISE_JOURNEY_SEGMENTS = [
  { id: "pre_login", label: "Pre-Login", color: ENTERPRISE_JOURNEY_COLORS.preLogin },
  { id: "logged_in_wip", label: "Logged In – WIP", color: ENTERPRISE_JOURNEY_COLORS.loggedInWip },
  { id: "soft_approved", label: "Soft Approved", color: ENTERPRISE_JOURNEY_COLORS.softApproved },
  { id: "final_approved", label: "Final Approved", color: ENTERPRISE_JOURNEY_COLORS.finalApproved },
  { id: "closure_wip", label: "Closure WIP", color: ENTERPRISE_JOURNEY_COLORS.closureWip },
  { id: "disbursed", label: "Disbursed", color: ENTERPRISE_JOURNEY_COLORS.disbursed },
] as const;

export type EnterpriseJourneySegmentId =
  (typeof ENTERPRISE_JOURNEY_SEGMENTS)[number]["id"];

export type EnterpriseDealStatusOverlay = "none" | "hold" | "lost";

/** Map PipelineStage → journey segment (progress authority). */
export function pipelineStageToJourneySegment(
  stage: PipelineStage | string | null | undefined,
): EnterpriseJourneySegmentId {
  const s = migrateLegacyStage(String(stage ?? "raw_lead"));
  switch (s) {
    case "raw_lead":
    case "pre_login":
      return "pre_login";
    case "logged_in":
    case "credit_wip":
      return "logged_in_wip";
    case "soft_approved":
      return "soft_approved";
    case "final_approved":
      return "final_approved";
    case "closure_wip":
      return "closure_wip";
    case "won":
      return "disbursed";
    default:
      return "pre_login";
  }
}

/** Map LenderCaseStage → journey segment. */
export function lenderCaseStageToJourneySegment(
  stage: LenderCaseStage | string | null | undefined,
): EnterpriseJourneySegmentId {
  const s = normalizeLenderCaseStage(String(stage ?? "identified"));
  switch (s) {
    case "identified":
    case "prelogin":
      return "pre_login";
    case "logged_in_wip":
      return "logged_in_wip";
    case "soft_approved":
      return "soft_approved";
    case "final_approved":
      return "final_approved";
    case "closure_wip":
      return "closure_wip";
    case "disbursed":
      return "disbursed";
    case "hold":
    case "lost":
      // Overlay only — caller should pass underlying stage when known.
      return "pre_login";
    default:
      return "pre_login";
  }
}

export function resolveStatusOverlay(
  status: string | null | undefined,
  stageHint?: string | null,
): EnterpriseDealStatusOverlay {
  const raw = `${status ?? ""} ${stageHint ?? ""}`.toLowerCase();
  if (raw.includes("lost") || raw.includes("rejected")) return "lost";
  if (raw.includes("hold")) return "hold";
  return "none";
}

export function getJourneySegmentIndex(segmentId: EnterpriseJourneySegmentId): number {
  return ENTERPRISE_JOURNEY_SEGMENTS.findIndex((s) => s.id === segmentId);
}

export function getJourneySegmentColor(segmentId: EnterpriseJourneySegmentId): string {
  return (
    ENTERPRISE_JOURNEY_SEGMENTS.find((s) => s.id === segmentId)?.color ??
    ENTERPRISE_JOURNEY_COLORS.preLogin
  );
}

export function getJourneySegmentLabel(segmentId: EnterpriseJourneySegmentId): string {
  return ENTERPRISE_JOURNEY_SEGMENTS.find((s) => s.id === segmentId)?.label ?? "Pre-Login";
}

/**
 * Derive capsule fill count (1…N) from stage.
 * Hold/Lost do not reduce progress — they overlay status only.
 */
export function deriveJourneyProgressSegments(input: {
  pipelineStage?: PipelineStage | string | null;
  lenderCaseStage?: LenderCaseStage | string | null;
  status?: string | null;
}): {
  filled: number;
  total: number;
  segmentId: EnterpriseJourneySegmentId;
  segmentColor: string;
  segmentLabel: string;
  overlay: EnterpriseDealStatusOverlay;
  overlayColor: string | null;
} {
  const overlay = resolveStatusOverlay(input.status, input.lenderCaseStage);
  const segmentId = input.lenderCaseStage
    ? lenderCaseStageToJourneySegment(
        overlay === "none" ? input.lenderCaseStage : input.pipelineStage ?? input.lenderCaseStage,
      )
    : pipelineStageToJourneySegment(input.pipelineStage);

  // When overlay is hold/lost on lender stage hold/lost, prefer pipelineStage for progress.
  const progressSegment =
    overlay !== "none" && input.pipelineStage
      ? pipelineStageToJourneySegment(input.pipelineStage)
      : segmentId;

  const index = getJourneySegmentIndex(progressSegment);
  const filled = Math.max(1, index + 1);
  const total = ENTERPRISE_JOURNEY_SEGMENTS.length;

  return {
    filled,
    total,
    segmentId: progressSegment,
    segmentColor: getJourneySegmentColor(progressSegment),
    segmentLabel: getJourneySegmentLabel(progressSegment),
    overlay,
    overlayColor:
      overlay === "hold"
        ? ENTERPRISE_JOURNEY_COLORS.hold
        : overlay === "lost"
          ? ENTERPRISE_JOURNEY_COLORS.lost
          : null,
  };
}
