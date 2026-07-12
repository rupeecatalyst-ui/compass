/**
 * EWOE engine triggers — invoke existing engines (configurable, no Decision Engine).
 */

import { ETE_PREDEFINED_DESCRIPTIONS, ETE_TASK_TYPES } from "@/constants/enterprise-task-engine";
import { resolveEdieDocumentRulesForContext } from "@/lib/enterprise-document-intelligence-engine";
import { selectLifeLenderExecutors } from "@/lib/enterprise-life-engine";
import { simulateEnceCommunication } from "@/lib/enterprise-notification-communication-engine";
import { listEteTasks, registerEteTask } from "@/lib/enterprise-task-engine";
import type { EwoeEngineTrigger } from "@/types/enterprise-workflow-orchestration-engine";
import type { EtePredefinedDescription } from "@/types/enterprise-task-engine";

export interface EwoeTriggerExecutionResult {
  triggerId: string;
  target: EwoeEngineTrigger["target"];
  action: string;
  ok: boolean;
  detail: string;
}

export function executeEwoeEngineTrigger(
  trigger: EwoeEngineTrigger,
  context: { opportunityId: string; actorId: string },
): EwoeTriggerExecutionResult {
  if (!trigger.enabled) {
    return {
      triggerId: trigger.id,
      target: trigger.target,
      action: trigger.action,
      ok: false,
      detail: "Trigger disabled",
    };
  }

  try {
    switch (trigger.target) {
      case "edie": {
        const loanStage =
          (trigger.payload?.loanStage as string | undefined) ?? "document_collection";
        const rules = resolveEdieDocumentRulesForContext({
          productRef: "product:home-loan",
          employmentType: "salaried",
          loanStage,
        });
        return {
          triggerId: trigger.id,
          target: trigger.target,
          action: trigger.action,
          ok: true,
          detail: `EDIE resolved ${rules.length} rule(s) for ${loanStage}`,
        };
      }
      case "ete": {
        const predefined =
          (trigger.payload?.predefinedDescription as EtePredefinedDescription | undefined) ??
          ETE_PREDEFINED_DESCRIPTIONS.FOLLOW_UP_DOCUMENTS;
        const existing = listEteTasks().filter(
          (t) =>
            t.opportunityRef === context.opportunityId &&
            t.predefinedDescription === predefined &&
            t.enabled,
        );
        if (existing.length === 0) {
          registerEteTask({
            taskType: ETE_TASK_TYPES.OPPORTUNITY,
            assigneeRef: "employee:rm-001",
            opportunityRef: context.opportunityId,
            predefinedDescription: predefined,
            reportingManagerRef: "employee:mgr-001",
            createdBy: context.actorId,
          });
          return {
            triggerId: trigger.id,
            target: trigger.target,
            action: trigger.action,
            ok: true,
            detail: `ETE created task: ${predefined}`,
          };
        }
        return {
          triggerId: trigger.id,
          target: trigger.target,
          action: trigger.action,
          ok: true,
          detail: `ETE task already present: ${predefined}`,
        };
      }
      case "ence": {
        const sim = simulateEnceCommunication({
          channel: "email",
          recipientRef: context.opportunityId,
          contextRef: context.opportunityId,
          payload: { source: "ewoe", action: trigger.action },
          simulatedBy: context.actorId,
        });
        return {
          triggerId: trigger.id,
          target: trigger.target,
          action: trigger.action,
          ok: true,
          detail: `ENCE simulation ${sim.id}`,
        };
      }
      case "life": {
        const city = (trigger.payload?.city as string | undefined) ?? "Pune";
        const productRef =
          (trigger.payload?.productRef as string | undefined) ?? "product:home-loan";
        const matched = selectLifeLenderExecutors({
          productRef,
          city,
          requireActive: true,
        });
        return {
          triggerId: trigger.id,
          target: trigger.target,
          action: trigger.action,
          ok: true,
          detail: `LIFE matched ${matched.length} executor(s)`,
        };
      }
      case "eole":
        return {
          triggerId: trigger.id,
          target: trigger.target,
          action: trigger.action,
          ok: true,
          detail: "EOLE stage ownership retained — no duplicate transition",
        };
      default:
        return {
          triggerId: trigger.id,
          target: trigger.target,
          action: trigger.action,
          ok: false,
          detail: "Unknown trigger target",
        };
    }
  } catch (e) {
    return {
      triggerId: trigger.id,
      target: trigger.target,
      action: trigger.action,
      ok: false,
      detail: e instanceof Error ? e.message : "Trigger failed",
    };
  }
}

export function executeEwoeEngineTriggers(
  triggers: EwoeEngineTrigger[],
  context: { opportunityId: string; actorId: string },
): EwoeTriggerExecutionResult[] {
  return triggers.filter((t) => t.enabled).map((t) => executeEwoeEngineTrigger(t, context));
}
