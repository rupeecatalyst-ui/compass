"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Plus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExecutionWorkspaceShell } from "@/components/catalyst-one/execution/execution-workspace-shell";
import { cn } from "@/lib/utils";
import type { ExecutionTaskStatus, LoanFilePriority, LoanFileTask } from "@/types/catalyst-one";
import { loanManagers } from "@/data/catalyst-one/loan-files";

type TaskStatusFilter = ExecutionTaskStatus | "all";

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return `task-exec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeTask(t: LoanFileTask): LoanFileTask {
  const inferred: ExecutionTaskStatus =
    t.status ??
    (t.completed ? "completed" : "pending");
  return {
    ...t,
    status: inferred,
    completed: inferred === "completed",
    createdAt: t.createdAt ?? t.dueDate ?? nowIso(),
    updatedAt: t.updatedAt ?? t.dueDate ?? nowIso(),
  };
}

function statusLabel(status: ExecutionTaskStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
  }
}

function statusStyle(status: ExecutionTaskStatus): string {
  switch (status) {
    case "pending":
      return "border-amber-600/20 bg-amber-600/10 text-amber-900 dark:text-amber-200";
    case "in_progress":
      return "border-blue-600/20 bg-blue-600/10 text-blue-900 dark:text-blue-200";
    case "completed":
      return "border-emerald-600/20 bg-emerald-600/10 text-emerald-900 dark:text-emerald-200";
    case "cancelled":
      return "border-border bg-muted/30 text-muted-foreground";
  }
}

export function TasksWorkspace({
  tasks,
  updatedBy,
  onChange,
  onTimeline,
}: {
  tasks: LoanFileTask[];
  updatedBy: string;
  onChange: (tasks: LoanFileTask[]) => void;
  onTimeline: (note: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TaskStatusFilter>("all");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<{
    title: string;
    assignedTo: string;
    priority: LoanFilePriority;
    dueDate: string;
  }>({
    title: "",
    assignedTo: loanManagers[0] ?? updatedBy,
    priority: "medium",
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
  });

  const normalizedTasks = useMemo(() => tasks.map(normalizeTask), [tasks]);
  const pendingCount = normalizedTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length;
  const statusPill = `${pendingCount} pending`;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return normalizedTasks.filter((t) => {
      const status = t.status ?? (t.completed ? "completed" : "pending");
      if (filter !== "all" && status !== filter) return false;
      if (!q) return true;
      const hay = [t.title, t.assignedTo, t.priority, t.remarks ?? "", status].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [filter, normalizedTasks, search]);

  const patchTask = (id: string, patch: Partial<LoanFileTask>, note: string) => {
    const ts = nowIso();
    const next = normalizedTasks.map((t) =>
      t.id === id ? { ...t, ...patch, updatedAt: ts, updatedBy } : t,
    );
    onChange(next);
    onTimeline(note);
  };

  const createTask = () => {
    if (!draft.title.trim()) return;
    const ts = nowIso();
    const t: LoanFileTask = {
      id: newId(),
      title: draft.title.trim(),
      assignedTo: draft.assignedTo,
      priority: draft.priority,
      dueDate: draft.dueDate,
      status: "pending",
      completed: false,
      createdAt: ts,
      updatedAt: ts,
      createdBy: updatedBy,
      updatedBy,
    };
    onChange([t, ...normalizedTasks]);
    onTimeline(`Task created: ${t.title}`);
    setDraft((d) => ({ ...d, title: "" }));
    setCreating(false);
  };

  return (
    <ExecutionWorkspaceShell
      theme="amber"
      title="Tasks"
      subtitle="Operational activities and follow-ups for this loan."
      statusLabel={statusPill}
      search={search}
      onSearchChange={setSearch}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] uppercase text-muted-foreground">Filter</Label>
            <Select value={filter} onValueChange={(v) => setFilter(v as TaskStatusFilter)}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All</SelectItem>
                <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
                <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" size="sm" className="h-8 text-xs" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create
          </Button>
        </div>
      }
    >
      {creating && (
        <div className="mb-4 rounded-xl border border-amber-600/20 bg-background/70 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
              Create Task
            </p>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCreating(false)}>
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Task *" className="sm:col-span-2 lg:col-span-3">
              <Input className="h-8 text-xs" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
            </Field>
            <Field label="Assigned To">
              <Select value={draft.assignedTo} onValueChange={(v) => setDraft((d) => ({ ...d, assignedTo: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {loanManagers.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={draft.priority} onValueChange={(v) => setDraft((d) => ({ ...d, priority: v as LoanFilePriority }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["urgent", "high", "medium", "low"] as LoanFilePriority[]).map((p) => (
                    <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Due Date">
              <Input
                type="date"
                className="h-8 text-xs"
                value={new Date(draft.dueDate).toISOString().slice(0, 10)}
                onChange={(e) => setDraft((d) => ({ ...d, dueDate: new Date(e.target.value).toISOString() }))}
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" className="h-8 text-xs" onClick={createTask}>
              Save Task
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-4 text-center">
            <p className="text-xs text-muted-foreground">No tasks match your filters.</p>
          </div>
        ) : (
          filtered.map((t) => {
            const status = t.status ?? (t.completed ? "completed" : "pending");
            return (
              <div key={t.id} className={cn("rounded-xl border border-border/70 p-4", status === "completed" ? "bg-muted/20" : "bg-card")}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const nextStatus: ExecutionTaskStatus = status === "completed" ? "pending" : "completed";
                          patchTask(t.id, { status: nextStatus, completed: nextStatus === "completed" }, `Task ${nextStatus}: ${t.title}`);
                        }}
                        className="mt-0.5 shrink-0"
                        aria-label="Toggle complete"
                      >
                        {status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-semibold", status === "completed" && "line-through text-muted-foreground")}>
                          {t.title}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", statusStyle(status))}>
                            {statusLabel(status)}
                          </span>
                          <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground capitalize">
                            {t.priority}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Due {new Date(t.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                          <span className="text-[10px] text-muted-foreground">· {t.assignedTo}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Select
                      value={status}
                      onValueChange={(v) =>
                        patchTask(
                          t.id,
                          { status: v as ExecutionTaskStatus, completed: v === "completed" },
                          `Task status updated: ${t.title} → ${v}`,
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                        <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
                        <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                        <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() =>
                        patchTask(t.id, { remarks: t.remarks ? undefined : "Follow up with customer" }, `Task remarks updated: ${t.title}`)
                      }
                    >
                      Add Remark
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ExecutionWorkspaceShell>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

