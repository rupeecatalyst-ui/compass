"use client";

/**
 * CO-TASKS-PLANNER-001 — Tasks tab (execution desk).
 */

import { useMemo, useState } from "react";
import {
  Check,
  Clock,
  MoreHorizontal,
  Search,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  TASKS_EXECUTION_BUCKETS,
} from "@/constants/enterprise-tasks-workspace";
import { PLANNER_SCHEDULE_TONE_META } from "@/constants/enterprise-planner";
import {
  assigneeLabel,
  columnForTask,
  completeEteTask,
  isRecurringTask,
  patchEteTask,
  resolveTaskCategory,
  resolveTaskStatus,
  taskTitle,
} from "@/lib/enterprise-task-engine";
import { ETE_SCHEDULE_FILTERS, type EteScheduleFilterId } from "@/constants/enterprise-task-engine";
import { resolveScheduleTone } from "@/lib/enterprise-planner";
import type { EteTask, EteTaskPriority } from "@/types/enterprise-task-engine";
import type {
  TasksExecutionBucket,
  TasksExecutionView,
} from "@/types/enterprise-tasks-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function scheduleToneForTask(task: EteTask) {
  const status = resolveTaskStatus(task);
  if (!task.dueOn) {
    return resolveScheduleTone({ status, startsAt: new Date().toISOString() });
  }
  return resolveScheduleTone({
    status,
    column: columnForTask(task),
    startsAt: task.dueOn,
  });
}

const PRIORITIES: EteTaskPriority[] = ["critical", "high", "medium", "low"];

function snoozeDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export function TasksExecutionDesk({
  view,
  actorRef,
  onOpenTask,
  onChanged,
  onCreate,
}: {
  view: TasksExecutionView;
  actorRef: string;
  onOpenTask: (task: EteTask) => void;
  onChanged: () => void;
  onCreate: () => void;
}) {
  const [bucket, setBucket] = useState<TasksExecutionBucket>("today");
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("__all__");
  const [scheduleFilter, setScheduleFilter] = useState<EteScheduleFilterId>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    let list = view.buckets[bucket] ?? [];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const hay = [
          taskTitle(t),
          t.borrowerName,
          t.loanProduct,
          t.workType,
          t.entityLabel,
          t.seriesId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (priorityFilter !== "__all__") {
      list = list.filter((t) => t.priority === priorityFilter);
    }
    if (scheduleFilter === "one_time") {
      list = list.filter((t) => !isRecurringTask(t));
    } else if (scheduleFilter === "recurring") {
      list = list.filter((t) => isRecurringTask(t));
    } else if (scheduleFilter === "completed") {
      list = list.filter((t) => resolveTaskStatus(t) === "completed");
    } else if (scheduleFilter === "overdue") {
      list = list.filter((t) => columnForTask(t) === "past_due");
    } else if (scheduleFilter === "upcoming") {
      list = list.filter((t) => {
        const st = resolveTaskStatus(t);
        return st !== "completed" && st !== "cancelled" && columnForTask(t) !== "past_due";
      });
    }
    return list;
  }, [view, bucket, query, priorityFilter, scheduleFilter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(rows.map((r) => r.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const runBulkComplete = () => {
    let n = 0;
    for (const id of selected) {
      try {
        completeEteTask(id, actorRef);
        n += 1;
      } catch {
        /* skip */
      }
    }
    toast.success(`Completed ${n} task${n === 1 ? "" : "s"}.`);
    clearSelection();
    onChanged();
  };

  const runBulkSnooze = () => {
    let n = 0;
    const due = snoozeDays(1);
    for (const id of selected) {
      try {
        patchEteTask(id, { dueOn: due }, actorRef);
        n += 1;
      } catch {
        /* skip */
      }
    }
    toast.success(`Snoozed ${n} task${n === 1 ? "" : "s"} to tomorrow.`);
    clearSelection();
    onChanged();
  };

  const completeOne = (task: EteTask) => {
    completeEteTask(task.id, actorRef);
    toast.success("Task completed.");
    onChanged();
  };

  const snoozeOne = (task: EteTask, days: number) => {
    patchEteTask(task.id, { dueOn: snoozeDays(days) }, actorRef);
    toast.success(`Snoozed ${days === 1 ? "1 day" : `${days} days`}.`);
    onChanged();
  };

  const setPriority = (task: EteTask, priority: EteTaskPriority) => {
    patchEteTask(task.id, { priority }, actorRef);
    toast.success(`Priority → ${priority}`);
    onChanged();
  };

  const reassign = (task: EteTask) => {
    const next = window.prompt(
      "Reassign to (user ref, e.g. employee:ops-001):",
      task.assigneeRef ?? "",
    );
    if (!next?.trim()) return;
    patchEteTask(task.id, { assigneeRef: next.trim() }, actorRef);
    toast.success("Task reassigned.");
    onChanged();
  };

  const setDue = (task: EteTask) => {
    const raw = window.prompt(
      "Due date (YYYY-MM-DD):",
      task.dueOn ? task.dueOn.slice(0, 10) : "",
    );
    if (!raw?.trim()) return;
    const d = new Date(`${raw.trim()}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
      toast.error("Invalid date.");
      return;
    }
    patchEteTask(task.id, { dueOn: d.toISOString() }, actorRef);
    toast.success("Due date updated.");
    onChanged();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks…"
            className="h-9 border-white/10 bg-[#0b1220] pl-8 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-9 w-[140px] border-white/10 bg-[#0b1220] text-xs text-slate-200">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={scheduleFilter}
          onValueChange={(v) => setScheduleFilter(v as EteScheduleFilterId)}
        >
          <SelectTrigger className="h-9 w-[140px] border-white/10 bg-[#0b1220] text-xs text-slate-200">
            <SelectValue placeholder="Schedule" />
          </SelectTrigger>
          <SelectContent>
            {ETE_SCHEDULE_FILTERS.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          className="h-9 bg-teal-600 text-white hover:bg-teal-500"
          onClick={onCreate}
        >
          Create
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TASKS_EXECUTION_BUCKETS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              setBucket(b.id);
              clearSelection();
            }}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
              bucket === b.id
                ? "border-teal-500/50 bg-teal-500/15 text-teal-100"
                : "border-white/10 bg-[#0b1220] text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            {b.label}
            <span className="ml-1 tabular-nums text-slate-300">
              {view.counts[b.id]}
            </span>
          </button>
        ))}
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs text-teal-100">
          <span className="font-medium tabular-nums">{selected.size} selected</span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 text-[11px]"
            onClick={runBulkComplete}
          >
            Complete
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 text-[11px]"
            onClick={runBulkSnooze}
          >
            Snooze 1d
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] text-slate-300"
            onClick={selectAllVisible}
          >
            Select visible
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] text-slate-400"
            onClick={clearSelection}
          >
            Clear
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0b1220]/80">
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-slate-500">
            No tasks in this view.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {rows.map((t) => {
              const cat = resolveTaskCategory(t);
              const { tone } = scheduleToneForTask(t);
              const toneMeta = PLANNER_SCHEDULE_TONE_META[tone];
              return (
                <li
                  key={t.id}
                  className="flex items-start gap-3 px-3 py-2.5 transition hover:bg-white/[0.03]"
                >
                  <Checkbox
                    checked={selected.has(t.id)}
                    onCheckedChange={() => toggleSelect(t.id)}
                    className="mt-1 border-slate-600 data-[state=checked]:bg-teal-600"
                    aria-label={`Select ${taskTitle(t)}`}
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onOpenTask(t)}
                  >
                    <p className="truncate text-sm font-medium text-slate-100">
                      {taskTitle(t)}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {[
                        cat === "workflow" ? "Workflow" : "Personal",
                        t.workType,
                        t.borrowerName,
                        t.dueOn
                          ? `Due ${new Date(t.dueOn).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : "No due date",
                        assigneeLabel(t.assigneeRef ?? ""),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </button>
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                      toneMeta.chipClass,
                    )}
                  >
                    {toneMeta.swatch} {toneMeta.label}
                  </span>
                  {t.priority ? (
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        t.priority === "critical" && "bg-rose-500/20 text-rose-200",
                        t.priority === "high" && "bg-orange-500/20 text-orange-200",
                        t.priority === "medium" && "bg-amber-500/15 text-amber-200",
                        t.priority === "low" && "bg-slate-500/20 text-slate-300",
                      )}
                    >
                      {t.priority}
                    </span>
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="mt-0.5 size-8 text-slate-400 hover:bg-white/5 hover:text-slate-100"
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onOpenTask(t)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => completeOne(t)}>
                        <Check className="mr-2 size-3.5" /> Complete
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => reassign(t)}>
                        <UserRound className="mr-2 size-3.5" /> Reassign
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => snoozeOne(t, 1)}>
                        <Clock className="mr-2 size-3.5" /> Snooze 1 day
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => snoozeOne(t, 3)}>
                        Snooze 3 days
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDue(t)}>
                        Set due date
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {PRIORITIES.map((p) => (
                        <DropdownMenuItem key={p} onClick={() => setPriority(t, p)}>
                          Priority: {p}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
