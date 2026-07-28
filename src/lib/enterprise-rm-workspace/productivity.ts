/**
 * CO-BIZ-005 Phase 6 — Productivity insights from ETE reporting + EBI ops (no new formulas).
 */

import { buildEteOperationalReport, buildMyWorkView } from "@/lib/enterprise-task-engine";
import type {
  RmPipelineSnapshot,
  RmProductivityInsights,
  RmTodayWork,
} from "@/types/enterprise-rm-workspace";

function sameAssignee(a: string, b: string): boolean {
  const na = a.replace(/^user:/, "").replace(/^employee:/, "");
  const nb = b.replace(/^user:/, "").replace(/^employee:/, "");
  return a === b || na === nb;
}

export function projectRmProductivity(input: {
  assigneeRef: string;
  today: RmTodayWork;
  pipeline: RmPipelineSnapshot;
}): RmProductivityInsights {
  const report = buildEteOperationalReport();
  const mine = report.byAssignee.find((r) => sameAssignee(r.assigneeRef, input.assigneeRef));
  const myWork = buildMyWorkView(input.assigneeRef);
  const completedToday = myWork.completed.filter((t) => {
    const at = t.completedAt ? Date.parse(t.completedAt) : Date.parse(t.modifiedOn);
    if (Number.isNaN(at)) return false;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return at >= start.getTime();
  }).length;

  const avgHours =
    input.pipeline.ebi?.operational.averageTaskCompletionHours ??
    report.averageCompletionHours;

  const openPressure = input.today.overdue.count + input.today.followUps.count;
  const pipelineMovementLabel =
    openPressure === 0
      ? "Stable — clear overdue queue"
      : openPressure <= 3
        ? "Active movement — manageable open work"
        : "Heavy queue — prioritise Critical / High";

  const weeklyTrendLabel =
    completedToday > input.today.overdue.count
      ? "Weekly pace: completions ahead of overdue backlog"
      : completedToday === 0 && input.today.overdue.count === 0
        ? "Weekly pace: quiet desk — focus on pipeline growth"
        : "Weekly pace: clear overdue before expanding outreach";

  return {
    tasksCompletedToday: completedToday || mine?.completed || report.completedToday,
    averageCompletionHours: avgHours,
    pipelineMovementLabel,
    casesClosed: input.pipeline.myDisbursals + input.pipeline.myLostCases,
    weeklyTrendLabel,
  };
}
