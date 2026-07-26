/**
 * CO-BIZ-003 Phase 2 — Operational KPI Engine.
 * Task metrics via ETE SSOT (`buildEteOperationalReport`). Deal ops via Radar rows.
 */

import type { EbiOperationalKpis } from "@/types/enterprise-business-intelligence";
import { isOpenTask, taskColumn, type EbiDataContext } from "./snapshot";

export function deriveOperationalKpis(ctx: EbiDataContext): EbiOperationalKpis {
  const ete = ctx.eteReport;
  const tasksDueToday = ctx.tasks.filter(
    (t) => isOpenTask(t) && taskColumn(t) === "due_today",
  ).length;

  const inactiveOpportunities = ctx.radar.rows.filter((r) => r.idleDays >= 5).length;
  const dealsAwaitingDocuments = ctx.radar.rows.filter((r) => r.pendingDocs > 0).length;
  const dealsAwaitingLenderAction = ctx.radar.rows.filter(
    (r) =>
      /login|credit|pending|await/i.test(r.stageLabel) ||
      r.quadrant === "follow_up_required" ||
      r.quadrant === "needs_attention",
  ).length;

  const withDocs = ctx.radar.rows.filter((r) => r.pendingDocs > 0 || r.pendingDocs === 0);
  let docProgress = 100;
  if (withDocs.length > 0) {
    const totalPending = withDocs.reduce((s, r) => s + Math.max(0, r.pendingDocs), 0);
    const estimatedRequired = withDocs.length * 5;
    docProgress = Math.max(
      0,
      Math.min(100, Math.round(((estimatedRequired - totalPending) / estimatedRequired) * 100)),
    );
  }

  return {
    asOf: ctx.asOf,
    tasksDueToday,
    overdueTasks: ete.overdueOpen,
    averageTaskCompletionHours: ete.averageCompletionHours,
    inactiveOpportunities,
    dealsAwaitingDocuments,
    dealsAwaitingLenderAction,
    documentCollectionProgressPct: docProgress,
    completedTasksToday: ete.completedToday,
    sourceModules: ["Enterprise Task Engine", "Chanakya Radar Dashboard"],
  };
}
