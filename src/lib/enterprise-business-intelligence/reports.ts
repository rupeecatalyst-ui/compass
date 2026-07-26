/**
 * CO-BIZ-003 Phase 7 — Export-ready CSV reports (Excel-compatible).
 */

import { formatINRCompact } from "@/lib/format-currency";
import type { EbiReportKind, EbiSnapshot } from "@/types/enterprise-business-intelligence";
import { composeBusinessIntelligenceSnapshot } from "./compose";

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return `\uFEFF${[headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\r\n")}\r\n`;
}

export function buildEbiReportCsv(
  kind: EbiReportKind,
  snapshot?: EbiSnapshot,
): { filename: string; contentType: string; body: string } {
  const snap = snapshot ?? composeBusinessIntelligenceSnapshot();
  const stamp = snap.asOf.slice(0, 10);

  if (kind === "daily_business_summary") {
    return {
      filename: `daily-business-summary-${stamp}.csv`,
      contentType: "text/csv;charset=utf-8",
      body: toCsv(
        ["Metric", "Value"],
        [
          ["As Of", snap.asOf],
          ["Business Health Score", snap.health.overallScore],
          ["Active Opportunities", snap.executive.activeOpportunities],
          ["Active Deals", snap.executive.activeDeals],
          ["Pipeline Value", formatINRCompact(snap.executive.pipelineValue)],
          ["Average Deal Size", formatINRCompact(snap.executive.averageDealSize)],
          ["Conversion Ratio %", snap.executive.conversionRatioPct],
          ["Overdue Tasks", snap.operational.overdueTasks],
          ["Tasks Due Today", snap.operational.tasksDueToday],
          ["Inactive Opportunities", snap.operational.inactiveOpportunities],
        ],
      ),
    };
  }

  if (kind === "pipeline_summary") {
    return {
      filename: `pipeline-summary-${stamp}.csv`,
      contentType: "text/csv;charset=utf-8",
      body: toCsv(
        ["Stage", "Count", "Value"],
        snap.executive.dealsByStage.map((r) => [r.name, r.count, r.value ?? 0]),
      ),
    };
  }

  if (kind === "employee_performance") {
    return {
      filename: `employee-performance-${stamp}.csv`,
      contentType: "text/csv;charset=utf-8",
      body: toCsv(
        [
          "Employee",
          "Opportunities Handled",
          "Deals Closed",
          "Avg Turnaround Days",
          "Pending Workload",
          "Overdue Work",
          "Completion Rate %",
        ],
        snap.team.members.map((m) => [
          m.name,
          m.opportunitiesHandled,
          m.dealsClosed,
          m.averageTurnaroundDays,
          m.pendingWorkload,
          m.overdueWork,
          m.completionRatePct,
        ]),
      ),
    };
  }

  if (kind === "stage_distribution") {
    return {
      filename: `stage-distribution-${stamp}.csv`,
      contentType: "text/csv;charset=utf-8",
      body: toCsv(
        ["Dimension", "Name", "Count", "Value"],
        [
          ...snap.executive.dealsByStage.map((r) => ["Stage", r.name, r.count, r.value ?? 0]),
          ...snap.executive.dealsByProduct.map((r) => ["Product", r.name, r.count, r.value ?? 0]),
          ...snap.executive.dealsByBranch.map((r) => ["Branch", r.name, r.count, r.value ?? 0]),
          ...snap.executive.dealsByRm.map((r) => ["RM", r.name, r.count, r.value ?? 0]),
        ],
      ),
    };
  }

  if (kind === "task_performance") {
    return {
      filename: `task-performance-${stamp}.csv`,
      contentType: "text/csv;charset=utf-8",
      body: toCsv(
        ["Metric", "Value"],
        [
          ["Completed Today", snap.operational.completedTasksToday],
          ["Due Today", snap.operational.tasksDueToday],
          ["Overdue", snap.operational.overdueTasks],
          ["Avg Completion Hours", snap.operational.averageTaskCompletionHours],
          ["Document Progress %", snap.operational.documentCollectionProgressPct],
        ],
      ),
    };
  }

  return {
    filename: `business-health-summary-${stamp}.csv`,
    contentType: "text/csv;charset=utf-8",
    body: toCsv(
      ["Dimension", "Score", "Status", "Detail"],
      [
        ["Overall", snap.health.overallScore, snap.health.status, snap.health.summary],
        ...snap.health.dimensions.map((d) => [d.label, d.score, d.status, d.detail]),
      ],
    ),
  };
}
