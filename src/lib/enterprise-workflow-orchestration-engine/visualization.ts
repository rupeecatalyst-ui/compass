/**
 * EWOE visualization snapshot for enterprise timeline UI.
 */

import type {
  EwoeVisualizationNode,
  EwoeVisualizationSnapshot,
  EwoeVisualizationStatus,
} from "@/types/enterprise-workflow-orchestration-engine";
import { getEwoePorts } from "./composition";
import {
  getEwoeInstanceForOpportunity,
  initializeEwoeDefaultDefinitions,
  listEwoeTransitions,
  resolveEwoeWorkflowDefinition,
} from "./orchestration-registry";

function nodeStatus(
  sortOrder: number,
  currentSortOrder: number,
): EwoeVisualizationStatus {
  if (sortOrder < currentSortOrder) return "completed";
  if (sortOrder === currentSortOrder) return "current";
  if (sortOrder === currentSortOrder + 1) return "pending";
  return "upcoming";
}

export function getEwoeWorkflowVisualization(opportunityId: string): EwoeVisualizationSnapshot {
  initializeEwoeDefaultDefinitions();
  const instance = getEwoeInstanceForOpportunity(opportunityId);
  const definition = instance
    ? getEwoePorts().definitions.findById(instance.definitionId)
    : resolveEwoeWorkflowDefinition();

  if (!definition) {
    return {
      opportunityId,
      progressRatio: 0,
      nodes: [],
      recentTransitions: [],
    };
  }

  const stages = [...definition.stages].sort((a, b) => a.sortOrder - b.sortOrder);
  const currentCode = instance?.currentStageCode ?? stages[0]?.stageCode;
  const currentSort =
    stages.find((s) => s.stageCode === currentCode)?.sortOrder ?? stages[0]?.sortOrder ?? 1;

  const nodes: EwoeVisualizationNode[] = stages.map((stage) => {
    const status = nodeStatus(stage.sortOrder, currentSort);
    const subs = [...stage.subStages].sort((a, b) => a.sortOrder - b.sortOrder);
    const currentSub = instance?.currentSubStageCode;
    return {
      stageCode: stage.stageCode,
      stageName: stage.stageName,
      status,
      sortOrder: stage.sortOrder,
      subStages: subs.map((sub, idx) => {
        let subStatus: EwoeVisualizationStatus = "upcoming";
        if (status === "completed") subStatus = "completed";
        else if (status === "current") {
          if (!currentSub) subStatus = idx === 0 ? "current" : "pending";
          else if (sub.subStageCode === currentSub) subStatus = "current";
          else if (subs.findIndex((s) => s.subStageCode === currentSub) > idx) subStatus = "completed";
          else subStatus = "pending";
        } else if (status === "pending") subStatus = "pending";
        return {
          subStageCode: sub.subStageCode,
          subStageName: sub.subStageName,
          status: subStatus,
        };
      }),
    };
  });

  return {
    opportunityId,
    instanceId: instance?.id,
    definitionCode: definition.definitionCode,
    definitionVersion: definition.version,
    currentStageCode: currentCode,
    currentSubStageCode: instance?.currentSubStageCode,
    progressRatio: instance?.progressRatio ?? 0.15,
    nodes,
    recentTransitions: listEwoeTransitions(opportunityId).slice(0, 8),
  };
}
