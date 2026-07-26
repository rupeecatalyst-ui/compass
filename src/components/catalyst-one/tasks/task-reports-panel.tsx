"use client";

/**
 * CO-BIZ-001 — Operational task reports (ETE SSOT).
 */

import { useMemo } from "react";
import {
  assigneeLabel,
  buildChanakyaWorkloadInsights,
  buildEteOperationalReport,
} from "@/lib/enterprise-task-engine";
import { getStoredUser } from "@/lib/auth";

export function TaskReportsPanel() {
  const user = getStoredUser();
  const userRef = user?.id ? `user:${user.id}` : "employee:rm-001";
  const report = useMemo(() => buildEteOperationalReport(), []);
  const insights = useMemo(() => buildChanakyaWorkloadInsights(userRef), [userRef]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Completed today", value: report.completedToday },
          { label: "Overdue open", value: report.overdueOpen },
          {
            label: "Avg completion (hrs)",
            value: report.averageCompletionHours ?? "—",
          },
          { label: "Assignees tracked", value: report.byAssignee.length },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-border/60 bg-card/50 px-3 py-2.5"
          >
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {c.label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border/60 bg-card/40 p-3">
        <h3 className="text-xs font-semibold">CHANAKYA workload</h3>
        <ul className="mt-2 space-y-1.5">
          {insights.map((i) => (
            <li key={i.id} className="text-xs text-muted-foreground">
              <span
                className={
                  i.tone === "danger"
                    ? "text-red-700 dark:text-red-300"
                    : i.tone === "warning"
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-foreground"
                }
              >
                {i.text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-border/60 p-3">
          <h3 className="text-xs font-semibold">Tasks by employee</h3>
          <ul className="mt-2 space-y-1">
            {report.byAssignee.slice(0, 8).map((r) => (
              <li
                key={r.assigneeRef}
                className="flex justify-between text-[11px] text-muted-foreground"
              >
                <span>{assigneeLabel(r.assigneeRef)}</span>
                <span className="tabular-nums">
                  open {r.open} · overdue {r.overdue} · done {r.completed}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border/60 p-3">
          <h3 className="text-xs font-semibold">Tasks by business stage</h3>
          <ul className="mt-2 space-y-1">
            {report.byStage.slice(0, 8).map((r) => (
              <li
                key={r.stage}
                className="flex justify-between text-[11px] text-muted-foreground"
              >
                <span>{r.stage}</span>
                <span className="tabular-nums">
                  open {r.open} · overdue {r.overdue}
                </span>
              </li>
            ))}
            {report.byStage.length === 0 ? (
              <li className="text-[11px] text-muted-foreground">No staged tasks.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
