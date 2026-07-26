/**
 * CO-BIZ-003 Phase 4 — CHANAKYA executive insights (narrative from KPI compose).
 */

import { ROUTES } from "@/constants/routes";
import { formatINRCompact } from "@/lib/format-currency";
import type {
  EbiChanakyaInsight,
  EbiExecutiveKpis,
  EbiOperationalKpis,
  EbiTeamPerformance,
  EbiBusinessHealthScore,
} from "@/types/enterprise-business-intelligence";

export function deriveChanakyaExecutiveInsights(input: {
  executive: EbiExecutiveKpis;
  operational: EbiOperationalKpis;
  team: EbiTeamPerformance;
  health: EbiBusinessHealthScore;
}): EbiChanakyaInsight[] {
  const { executive, operational, team, health } = input;
  const insights: EbiChanakyaInsight[] = [];

  if (operational.inactiveOpportunities > 0) {
    insights.push({
      id: "inactive-opps",
      text: `${operational.inactiveOpportunities} Opportunities have had no activity for more than 5 days.`,
      reason:
        "Radar idle days ≥ 5 on active Deal rows mapped to opportunity inactivity pressure.",
      tone: "warning",
      recommendedAction: "Assign follow-up tasks via ETE and clear stalled stages.",
      href: ROUTES.CHANAKYA_RADAR,
    });
  }

  const lap = executive.dealsByProduct.find((p) =>
    /lap|loan against property|property/i.test(p.name),
  );
  if (lap && lap.count >= 2) {
    insights.push({
      id: "lap-mix",
      text: `Loan Against Property remains a material product mix (${lap.count} active Deals).`,
      reason: `Product mix from Deal Registry — LAP share of active book is ${Math.round((lap.count / Math.max(1, executive.activeDeals)) * 100)}%.`,
      tone: "info",
      href: ROUTES.MY_DEALS,
    });
  }

  if (operational.dealsAwaitingDocuments > 0) {
    insights.push({
      id: "doc-delay",
      text: `Document collection is delaying ${operational.dealsAwaitingDocuments} Deals.`,
      reason: "Radar rows with pendingDocs > 0; document progress dimension is under pressure.",
      tone: operational.dealsAwaitingDocuments >= 10 ? "danger" : "warning",
      recommendedAction: "Open Document Center and generate Document Collection tasks.",
      href: ROUTES.DOCUMENT_CENTER,
    });
  }

  const best = team.members.find((m) => m.name !== "Unassigned RM" && m.dealsClosed + m.opportunitiesHandled > 0);
  if (best && best.completionRatePct >= 50) {
    insights.push({
      id: "rm-efficiency",
      text: `Relationship Manager ${best.name} has the highest turnaround efficiency.`,
      reason: `Completion rate ${best.completionRatePct}% with ${best.overdueWork} overdue and avg stage days ${best.averageTurnaroundDays ?? "—"}.`,
      tone: "success",
      href: ROUTES.MY_DEALS,
    });
  }

  if (operational.overdueTasks > 0) {
    insights.push({
      id: "overdue-tasks",
      text: `${operational.overdueTasks} overdue tasks require management attention.`,
      reason: "ETE operational report overdueOpen (single task SSOT).",
      tone: "danger",
      recommendedAction: "Open My Work and clear overdue lender / document tasks.",
      href: ROUTES.TASKS,
    });
  }

  insights.push({
    id: "pipeline-value",
    text: `Active pipeline value is ${formatINRCompact(executive.pipelineValue)} across ${executive.activeDeals} Deals.`,
    reason: "Sum of requiredAmount/loanAmount on active Radar Deal files.",
    tone: "info",
    href: ROUTES.CHANAKYA_RADAR,
  });

  insights.push({
    id: "health",
    text: health.summary,
    reason: `Composite Business Health Score ${health.overallScore}/100 (${health.status}).`,
    tone:
      health.status === "healthy"
        ? "success"
        : health.status === "watch"
          ? "warning"
          : "danger",
  });

  return insights.slice(0, 8);
}
