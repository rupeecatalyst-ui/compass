/**
 * CO-C1-EAR-COVERAGE-002 — Deal Timeline → EAR dual-write mapper.
 * Fail-open. Does not write Deal rows. Does not change Deal Timeline SSOT.
 */

import type { EmitEnterpriseActivityInput } from "@/types/enterprise-activity-registry";

export type DealTimelineEarInput = {
  timelineEventId: string;
  dealId: string;
  opportunityId: string | null;
  eventType: string;
  summary: string;
  actorUserId?: string | null;
  occurredAt: Date | string;
  /** Optional stage-change fields for Activity Timeline consumers. */
  payload?: Record<string, unknown> | null;
};

export function classifyDealTimelineEventKind(
  eventType: string,
): "stage_change" | "workflow" {
  return eventType.includes("stage") || eventType.includes("Stage")
    ? "stage_change"
    : "workflow";
}

export function mapDealTimelineEventToEarEmit(
  input: DealTimelineEarInput,
): EmitEnterpriseActivityInput {
  const extra =
    input.payload && typeof input.payload === "object" ? input.payload : {};
  return {
    eventKind: classifyDealTimelineEventKind(input.eventType),
    sourceSystem: "deal_timeline",
    sourceEventId: input.timelineEventId,
    title: input.summary,
    summary: input.eventType,
    payload: {
      dealEventType: input.eventType,
      dealId: input.dealId,
      opportunityId: input.opportunityId,
      previousStage:
        (typeof extra.fromGrossStage === "string" && extra.fromGrossStage) ||
        (typeof extra.previousStage === "string" && extra.previousStage) ||
        null,
      newStage:
        (typeof extra.toGrossStage === "string" && extra.toGrossStage) ||
        (typeof extra.newStage === "string" && extra.newStage) ||
        null,
      actorUserId: input.actorUserId ?? null,
      dealNumber: typeof extra.dealNumber === "string" ? extra.dealNumber : null,
      reason: typeof extra.reason === "string" ? extra.reason : null,
    },
    dealId: input.dealId,
    opportunityId: input.opportunityId,
    actorUserId: input.actorUserId ?? null,
    occurredAt: input.occurredAt,
  };
}

export async function emitDealTimelineToEarBestEffort(
  input: DealTimelineEarInput,
  emit?: (payload: EmitEnterpriseActivityInput) => Promise<unknown>,
): Promise<void> {
  try {
    const mapped = mapDealTimelineEventToEarEmit(input);
    if (emit) {
      await emit(mapped);
      return;
    }
    const { enterpriseActivityService } = await import(
      "@server/services/enterprise-activity/enterprise-activity.service"
    );
    await enterpriseActivityService.emitBestEffort(mapped);
  } catch {
    /* fail-open — never block Deal Timeline */
  }
}
