/**
 * CO-BIZ-001 — Chanakya workload intelligence (ETE SSOT).
 */

import type { EteWorkloadInsight } from "@/types/enterprise-task-engine";
import { buildMyWorkView } from "./my-work";
import { listEteTasks } from "./task-registry";
import { columnForTask, resolveTaskStatus, resolveWorkType } from "./task-workspace";

export function buildChanakyaWorkloadInsights(userRef?: string): EteWorkloadInsight[] {
  const insights: EteWorkloadInsight[] = [];
  const tasks = listEteTasks().filter(
    (t) => resolveTaskStatus(t) === "open" && t.enabled !== false,
  );

  const overdueLender = tasks.filter(
    (t) =>
      columnForTask(t) === "past_due" &&
      (resolveWorkType(t) === "Lender Call" ||
        t.predefinedDescription === "Follow-up Lender"),
  ).length;
  if (overdueLender > 0) {
    insights.push({
      id: "overdue-lender",
      text: `You have ${overdueLender} overdue lender follow-up${overdueLender === 1 ? "" : "s"}.`,
      tone: "danger",
    });
  }

  const docsToday = tasks.filter(
    (t) =>
      columnForTask(t) === "due_today" &&
      (resolveWorkType(t) === "Document Collection" ||
        t.predefinedDescription === "Follow-up Documents"),
  ).length;
  if (docsToday > 0) {
    insights.push({
      id: "docs-today",
      text: `${docsToday} Deal${docsToday === 1 ? "" : "s"} require document collection today.`,
      tone: "warning",
    });
  }

  const inactiveOpps = new Set(
    tasks
      .filter(
        (t) =>
          t.opportunityRef &&
          columnForTask(t) === "past_due" &&
          (t.grossStage === "Opportunity Workspace" || !t.grossStage),
      )
      .map((t) => t.opportunityRef!),
  );
  if (inactiveOpps.size > 0) {
    insights.push({
      id: "opp-risk",
      text: `${inactiveOpps.size} Opportunit${inactiveOpps.size === 1 ? "y is" : "ies are"} at risk due to inactivity.`,
      tone: "warning",
    });
  }

  if (userRef) {
    const mine = buildMyWorkView(userRef);
    if (mine.counts.overdue > 0) {
      insights.push({
        id: "my-overdue",
        text: `${mine.counts.overdue} of your tasks are overdue.`,
        tone: "danger",
      });
    } else if (mine.counts.due_today > 0) {
      insights.push({
        id: "my-today",
        text: `You have ${mine.counts.due_today} task${mine.counts.due_today === 1 ? "" : "s"} due today.`,
        tone: "info",
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: "clear",
      text: "Workload is within normal bands — no overdue execution blockers detected.",
      tone: "success",
    });
  }

  return insights;
}
