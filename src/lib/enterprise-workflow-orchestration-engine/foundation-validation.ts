/**
 * EWOE foundation validation — smoke checks for SPR-004.
 */

import { EWOE_FRAMEWORK_VERSION } from "@/constants/enterprise-workflow-orchestration-engine";
import { resetEwoeComposition } from "./composition";
import { resetEwoeOrchestrationConfig } from "./config";
import {
  advanceEwoeWorkflowStage,
  initializeEwoeDefaultDefinitions,
  listEwoeEvents,
  resolveEwoeWorkflowDefinition,
  startEwoeWorkflowInstance,
} from "./orchestration-registry";
import { getEwoeFrameworkVersion, getEwoeRegistrySnapshot } from "./registry-snapshot";
import { validateEwoeWorkflowDefinition } from "./validation-engine";
import { getEwoeWorkflowVisualization } from "./visualization";

export function runEwoeFoundationValidation(): {
  passed: boolean;
  details: Record<string, unknown>;
} {
  resetEwoeComposition();
  resetEwoeOrchestrationConfig();

  const definition = initializeEwoeDefaultDefinitions("validation");
  const validation = validateEwoeWorkflowDefinition(definition);
  const resolved = resolveEwoeWorkflowDefinition();

  const opportunityId = "opp-ewoe-validation";
  const instance = startEwoeWorkflowInstance({
    opportunityId,
    actorId: "validation",
    stageCode: "intake",
  });

  const advanced = advanceEwoeWorkflowStage({
    opportunityId,
    toStageCode: "document_collection",
    reason: "Foundation validation advance",
    actorId: "validation",
    syncEole: false,
  });

  const viz = getEwoeWorkflowVisualization(opportunityId);
  const events = listEwoeEvents(opportunityId);
  const snapshot = getEwoeRegistrySnapshot();

  const passed =
    validation.valid &&
    resolved.definitionCode === "EWOE-HL-SAL-001" &&
    instance.status === "active" &&
    advanced.transition.currentStageCode === "document_collection" &&
    viz.nodes.length > 0 &&
    events.some((e) => e.eventType === "stage_changed") &&
    getEwoeFrameworkVersion() === EWOE_FRAMEWORK_VERSION &&
    snapshot.definitions.length >= 1;

  return {
    passed,
    details: {
      version: getEwoeFrameworkVersion(),
      definitionCode: definition.definitionCode,
      validation,
      instanceId: instance.id,
      transitionId: advanced.transition.id,
      visualizationNodes: viz.nodes.length,
      eventCount: events.length,
      snapshotCounts: {
        definitions: snapshot.definitions.length,
        instances: snapshot.instances.length,
        transitions: snapshot.transitions.length,
        events: snapshot.events.length,
      },
    },
  };
}
