/**
 * EWOE → Dialogue Center integration.
 */

import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import type { EwoeWorkflowTransition } from "@/types/enterprise-workflow-orchestration-engine";
import { getEwoeOrchestrationConfig } from "./config";

export function publishEwoeTransitionToDialogue(transition: EwoeWorkflowTransition): void {
  const config = getEwoeOrchestrationConfig();
  if (!config.autoPublishDialogue) return;

  appendEdcTimelineEntry({
    contextRef: { type: "opportunity", id: transition.opportunityId },
    eventType: "workflow",
    title: `Workflow · ${transition.previousStageCode} → ${transition.currentStageCode}`,
    description: [
      `Previous: ${transition.previousStageCode}`,
      `Current: ${transition.currentStageCode}`,
      transition.previousSubStageCode || transition.currentSubStageCode
        ? `Sub-stage: ${transition.previousSubStageCode ?? "—"} → ${transition.currentSubStageCode ?? "—"}`
        : null,
      `Reason: ${transition.reason}`,
      `Version: v${transition.definitionVersion}`,
    ]
      .filter(Boolean)
      .join(" · "),
    actorId: transition.actorId,
    occurredOn: transition.occurredOn,
    expandablePayload: {
      source: "ewoe",
      previousStage: transition.previousStageCode,
      currentStage: transition.currentStageCode,
      previousSubStage: transition.previousSubStageCode,
      currentSubStage: transition.currentSubStageCode,
      reason: transition.reason,
      timestamp: transition.occurredOn,
      definitionVersion: transition.definitionVersion,
      transitionId: transition.id,
    },
  });
}
