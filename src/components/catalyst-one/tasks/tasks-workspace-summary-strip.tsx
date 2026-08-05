"use client";

/**
 * CO-TASKS-PLANNER-002 — Compact metrics toolbar (not tall summary cards).
 */

import type { TasksWorkspaceSummary } from "@/types/enterprise-tasks-workspace";
import { cn } from "@/lib/utils";

const CELLS: {
  key: keyof TasksWorkspaceSummary;
  label: string;
  openPlanner?: boolean;
  tone: string;
}[] = [
  { key: "todaysTasks", label: "Tasks", tone: "text-teal-300" },
  {
    key: "todaysMeetings",
    label: "Meetings",
    openPlanner: true,
    tone: "text-sky-300",
  },
  { key: "overdue", label: "Overdue", tone: "text-rose-300" },
  { key: "upcoming", label: "Upcoming", tone: "text-amber-300" },
  { key: "completed", label: "Completed", tone: "text-emerald-300" },
];

export function TasksWorkspaceSummaryStrip({
  summary,
  onOpenMeetings,
  className,
}: {
  summary: TasksWorkspaceSummary;
  onOpenMeetings: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "etw-metrics-toolbar flex flex-wrap items-center gap-1 rounded-md border border-white/10 bg-[#0b1220]/90 px-1.5 py-1",
        className,
      )}
      role="group"
      aria-label="Operational metrics"
    >
      {CELLS.map((cell) => {
        const value = summary[cell.key];
        const interactive = Boolean(cell.openPlanner);
        const Comp = interactive ? "button" : "div";
        return (
          <Comp
            key={cell.key}
            type={interactive ? "button" : undefined}
            onClick={interactive ? onOpenMeetings : undefined}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded px-2 text-left",
              interactive &&
                "cursor-pointer transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50",
            )}
            title={interactive ? "Open Planner" : undefined}
          >
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {cell.label}
            </span>
            <span className={cn("text-xs font-semibold tabular-nums", cell.tone)}>{value}</span>
          </Comp>
        );
      })}
    </div>
  );
}
