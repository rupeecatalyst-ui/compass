import { STAGE_LABELS, getSubStatusLabel } from "@/constants/loan-pipeline";
import type { LoanFile, LoanFileTimelineEvent } from "@/types/catalyst-one";

export function getCurrentStageSince(
  timeline: LoanFileTimelineEvent[],
  stage: LoanFile["stage"],
  fallback?: string,
): string | undefined {
  const currentLabel = STAGE_LABELS[stage];
  const event = timeline.find(
    (e) => e.title === "Stage changed" && e.description?.includes(`→ ${currentLabel}`),
  );
  return event?.timestamp ?? fallback;
}

export function getSubStageLastUpdated(timeline: LoanFileTimelineEvent[]): string | undefined {
  return timeline.find((e) => e.title === "Sub stage updated")?.timestamp;
}

export function formatWorkflowTimestamp(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getSubStageDisplayLabel(stage: LoanFile["stage"], subStageId?: string): string {
  return getSubStatusLabel(stage, subStageId) ?? "Not applicable";
}
