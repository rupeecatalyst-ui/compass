/**
 * ETE foundation validation — smoke checks for SPR-001.
 */

import {
  ETE_FRAMEWORK_VERSION,
  ETE_PREDEFINED_DESCRIPTIONS,
  ETE_TASK_TYPES,
} from "@/constants/enterprise-task-engine";
import { resetEdcComposition } from "@/lib/enterprise-dialogue-center";
import { configurePlatformModes, resetPlatformModes } from "@/lib/enterprise-platform-modes";
import { resetEteComposition } from "./composition";
import { getEteFrameworkVersion, getEteRegistrySnapshot } from "./registry-snapshot";
import {
  deriveEteTaskColour,
  escalateEteOverdueTasks,
  listEteTasks,
  registerEteTask,
} from "./task-registry";
import { validateEteTask } from "./validation-engine";

export function runEteFoundationValidation(): { passed: boolean; details: Record<string, unknown> } {
  resetEteComposition();
  resetEdcComposition();
  resetPlatformModes();

  const pastDue = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const soonDue = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const farDue = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const overdueTask = registerEteTask({
    taskType: ETE_TASK_TYPES.OPPORTUNITY,
    assigneeRef: "emp:rm-001",
    opportunityRef: "opp-001",
    dueOn: pastDue,
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.CALL_CUSTOMER,
    reportingManagerRef: "emp:mgr-001",
    createdBy: "system",
  });

  registerEteTask({
    taskType: ETE_TASK_TYPES.INDEPENDENT,
    assigneeRef: "emp:rm-001",
    dueOn: soonDue,
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.FOLLOW_UP_DOCUMENTS,
    createdBy: "system",
  });

  registerEteTask({
    taskType: ETE_TASK_TYPES.INDEPENDENT,
    assigneeRef: "emp:rm-002",
    dueOn: farDue,
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.GENERAL,
    createdBy: "system",
  });

  const colourOverdue = deriveEteTaskColour(pastDue);
  const colourSoon = deriveEteTaskColour(soonDue);
  const colourOk = deriveEteTaskColour(farDue);

  const escalated = escalateEteOverdueTasks("system");
  const tasks = listEteTasks();

  let rejectionChecks = 0;
  const customMissing = validateEteTask({
    taskType: ETE_TASK_TYPES.INDEPENDENT,
    assigneeRef: "emp:x",
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.CUSTOM,
  });
  if (!customMissing.valid) rejectionChecks += 1;

  const oppMissing = validateEteTask({
    taskType: ETE_TASK_TYPES.OPPORTUNITY,
    assigneeRef: "emp:x",
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.GENERAL,
  });
  if (!oppMissing.valid) rejectionChecks += 1;

  try {
    registerEteTask({
      taskType: ETE_TASK_TYPES.OPPORTUNITY,
      assigneeRef: "emp:x",
      predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.GENERAL,
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  configurePlatformModes({ migrationMode: true });
  try {
    registerEteTask({
      taskType: ETE_TASK_TYPES.INDEPENDENT,
      assigneeRef: "emp:x",
      predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.GENERAL,
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }
  resetPlatformModes();

  const snap = getEteRegistrySnapshot();
  const escalatedTask = tasks.find((t) => t.id === overdueTask.id);

  const passed =
    getEteFrameworkVersion() === ETE_FRAMEWORK_VERSION &&
    colourOverdue === "red" &&
    colourSoon === "orange" &&
    colourOk === "blue" &&
    escalated.length >= 1 &&
    escalatedTask?.escalated === true &&
    escalatedTask.coOwnerRefs.includes("emp:mgr-001") &&
    snap.tasks.length === 3 &&
    snap.auditReferences.length >= 4 &&
    rejectionChecks >= 4;

  return {
    passed,
    details: {
      frameworkVersion: getEteFrameworkVersion(),
      colourOverdue,
      colourSoon,
      colourOk,
      escalatedCount: escalated.length,
      tasks: snap.tasks.length,
      auditReferences: snap.auditReferences.length,
      rejectionChecks,
    },
  };
}
