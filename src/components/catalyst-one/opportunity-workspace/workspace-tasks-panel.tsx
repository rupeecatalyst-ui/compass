"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ETE_PREDEFINED_DESCRIPTIONS, ETE_TASK_TYPES } from "@/constants/enterprise-task-engine";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import {
  deriveEteTaskColour,
  escalateEteOverdueTasks,
  listEteTasks,
  patchEteTask,
  registerEteTask,
} from "@/lib/enterprise-task-engine";
import type { EtePredefinedDescription, EteTask } from "@/types/enterprise-task-engine";
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
import { OwCircularProgress, OwGlassPanel, OwPanelHeader } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";
import {
  getPlaceholderTask,
  getQuickIntent,
  placeholderConsumeQuickIntent,
  placeholderDeleteTask,
  placeholderMarkTaskEditing,
  placeholderSetTaskPriority,
  placeholderSetTaskTitle,
  type PlaceholderTaskPriority,
} from "./providers/workspace-placeholder-provider";

const PREDEFINED = Object.values(ETE_PREDEFINED_DESCRIPTIONS);

export function WorkspaceTasksPanel() {
  const {
    opportunityId,
    refresh,
    refreshKey,
    completedTaskIds,
    markTaskCompleted,
    markTaskReopened,
  } = useOpportunityWorkspace();
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("employee:rm-001");
  const [predefined, setPredefined] = useState<EtePredefinedDescription>(
    ETE_PREDEFINED_DESCRIPTIONS.CALL_CUSTOMER,
  );
  const [dueOn, setDueOn] = useState("");
  const [priority, setPriority] = useState<PlaceholderTaskPriority>("medium");
  const [error, setError] = useState<string | null>(null);
  const [editAssignee, setEditAssignee] = useState("");
  const [editDueOn, setEditDueOn] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    escalateEteOverdueTasks("workspace");
  }, []);

  useEffect(() => {
    if (!opportunityId) return;
    if (getQuickIntent(opportunityId) !== "focus_task_form") return;
    placeholderConsumeQuickIntent(opportunityId);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [opportunityId, refreshKey]);

  const tasks = useMemo(() => {
    if (!opportunityId) return [];
    return listEteTasks().filter((t) => t.opportunityRef === opportunityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId, refreshKey]);

  const sections = useMemo(() => {
    const active: EteTask[] = [];
    const completed: EteTask[] = [];
    const overdue: EteTask[] = [];

    for (const task of tasks) {
      const overlay = opportunityId ? getPlaceholderTask(opportunityId, task.id) : null;
      if (overlay?.deleted) continue;
      if (completedTaskIds.has(task.id) || !task.enabled) {
        completed.push(task);
        continue;
      }
      const colour = deriveEteTaskColour(task.dueOn);
      if (task.escalated || colour === "red") {
        overdue.push(task);
      } else {
        active.push(task);
      }
    }
    return { active, completed, overdue };
  }, [tasks, completedTaskIds, opportunityId]);

  const total = Math.max(1, tasks.length);
  const completionPct = Math.round((sections.completed.length / total) * 100);

  const onCreate = () => {
    if (!opportunityId) return;
    setError(null);
    try {
      const taskTitle = title.trim() || predefined;
      const task = registerEteTask({
        taskType: ETE_TASK_TYPES.OPPORTUNITY,
        assigneeRef: assignee,
        opportunityRef: opportunityId,
        predefinedDescription: predefined,
        description: taskTitle,
        dueOn: dueOn ? new Date(dueOn).toISOString() : undefined,
        reportingManagerRef: "employee:mgr-001",
        createdBy: "workspace",
      });
      placeholderSetTaskPriority(opportunityId, task.id, priority);
      placeholderSetTaskTitle(opportunityId, task.id, taskTitle);
      appendEdcTimelineEntry({
        contextRef: { type: "opportunity", id: opportunityId },
        eventType: "task",
        title: "Task created",
        description: `${taskTitle} · ${assignee} · priority ${priority}`,
        actorId: "workspace",
        expandablePayload: {
          title: taskTitle,
          predefined,
          assignee,
          priority,
          status: "open",
          source: "opportunity-workspace-tasks",
        },
      });
      setTitle("");
      setDueOn("");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create task");
    }
  };

  const renderTask = (task: EteTask, section: "active" | "completed" | "overdue") => {
    const colour = section === "overdue" ? "red" : deriveEteTaskColour(task.dueOn);
    const overlay = opportunityId ? getPlaceholderTask(opportunityId, task.id) : null;
    const editing = overlay?.editing;
    const displayTitle = overlay?.title || task.description || task.predefinedDescription;
    const statusLabel =
      section === "completed" ? "completed" : section === "overdue" ? "overdue" : "open";

    return (
      <div
        key={task.id}
        className="rounded-xl border border-zinc-200/70 bg-zinc-50/50 p-2.5 dark:border-white/10 dark:bg-zinc-950/40"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium">{displayTitle}</p>
            <p className="text-[10px] text-muted-foreground">{task.predefinedDescription}</p>
            <p className="text-[10px] text-muted-foreground">{task.assigneeRef}</p>
            {task.dueOn && (
              <p className="text-[10px] text-muted-foreground">
                Due {new Date(task.dueOn).toLocaleString()}
              </p>
            )}
            <p className="text-[10px] capitalize text-muted-foreground">
              Priority: {overlay?.priority ?? "medium"} · Status: {statusLabel}
            </p>
          </div>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase ${
              colour === "red"
                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                : colour === "orange"
                  ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                  : "bg-teal-500/15 text-teal-800 dark:text-teal-200"
            }`}
          >
            {statusLabel}
          </span>
        </div>

        {section === "completed" ? (
          <div className="mt-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-xs"
              onClick={() => markTaskReopened(task.id)}
            >
              Reopen
            </Button>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            {editing && (
              <div className="grid gap-2">
                <Input
                  className="h-7 text-xs"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title"
                />
                <Input
                  className="h-7 text-xs"
                  value={editAssignee}
                  onChange={(e) => setEditAssignee(e.target.value)}
                  placeholder="Assignee"
                />
                <Input
                  className="h-7 text-xs"
                  type="datetime-local"
                  value={editDueOn}
                  onChange={(e) => setEditDueOn(e.target.value)}
                />
                <Select
                  value={overlay?.priority ?? "medium"}
                  onValueChange={(v) => {
                    if (!opportunityId) return;
                    placeholderSetTaskPriority(opportunityId, task.id, v as PlaceholderTaskPriority);
                    refresh();
                  }}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">low</SelectItem>
                    <SelectItem value="medium">medium</SelectItem>
                    <SelectItem value="high">high</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    patchEteTask(
                      task.id,
                      {
                        assigneeRef: editAssignee || task.assigneeRef,
                        dueOn: editDueOn ? new Date(editDueOn).toISOString() : task.dueOn,
                        description: editTitle || task.description,
                      },
                      "workspace",
                    );
                    if (opportunityId) {
                      if (editTitle) placeholderSetTaskTitle(opportunityId, task.id, editTitle);
                      placeholderMarkTaskEditing(opportunityId, task.id, false);
                      appendEdcTimelineEntry({
                        contextRef: { type: "opportunity", id: opportunityId },
                        eventType: "task",
                        title: "Task edited",
                        description: `Updated ${editTitle || displayTitle}`,
                        actorId: "workspace",
                        expandablePayload: { taskId: task.id, source: "opportunity-workspace-tasks" },
                      });
                    }
                    refresh();
                  }}
                >
                  Save edit
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => markTaskCompleted(task.id)}
              >
                Complete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  if (!opportunityId) return;
                  placeholderMarkTaskEditing(opportunityId, task.id, !editing);
                  setEditTitle(displayTitle);
                  setEditAssignee(task.assigneeRef);
                  setEditDueOn(
                    task.dueOn ? new Date(task.dueOn).toISOString().slice(0, 16) : "",
                  );
                  refresh();
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  if (!opportunityId) return;
                  const next =
                    overlay?.priority === "high"
                      ? "low"
                      : overlay?.priority === "low"
                        ? "medium"
                        : "high";
                  placeholderSetTaskPriority(opportunityId, task.id, next);
                  refresh();
                }}
              >
                Priority
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  if (!opportunityId) return;
                  placeholderDeleteTask(opportunityId, task.id);
                  appendEdcTimelineEntry({
                    contextRef: { type: "opportunity", id: opportunityId },
                    eventType: "task",
                    title: "Task deleted",
                    description: `Deleted ${displayTitle}`,
                    actorId: "workspace",
                    expandablePayload: { taskId: task.id, source: "opportunity-workspace-tasks" },
                  });
                  refresh();
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <OwGlassPanel className="h-full">
      <OwPanelHeader title="Tasks · ETE" badge="ETE" description="Task posture for this opportunity" />

      <div className="mb-4 flex items-center gap-4">
        <OwCircularProgress value={completionPct} label="Done" colour="stroke-amber-500" />
        <div className="grid flex-1 grid-cols-3 gap-2 text-xs">
          <Stat label="Open" value={sections.active.length} />
          <Stat label="Completed" value={sections.completed.length} />
          <Stat label="Overdue" value={sections.overdue.length} />
        </div>
      </div>

      <div className="space-y-3">
        <div ref={formRef} className="grid gap-2 rounded-xl border border-white/10 p-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Select
              value={predefined}
              onValueChange={(v) => setPredefined(v as EtePredefinedDescription)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PREDEFINED.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as PlaceholderTaskPriority)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">low</SelectItem>
                <SelectItem value="medium">medium</SelectItem>
                <SelectItem value="high">high</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Due Date</Label>
            <Input type="datetime-local" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Input value="open" disabled className="opacity-70" />
          </div>
          <Button size="sm" onClick={onCreate}>
            Assign
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="space-y-3">
          <Section title={`Open (${sections.active.length})`}>
            {sections.active.map((t) => renderTask(t, "active"))}
          </Section>
          <Section title={`Overdue (${sections.overdue.length})`} tone="rose">
            {sections.overdue.map((t) => renderTask(t, "overdue"))}
          </Section>
          <Section title={`Completed (${sections.completed.length})`} tone="emerald">
            {sections.completed.map((t) => renderTask(t, "completed"))}
          </Section>
        </div>
      </div>
    </OwGlassPanel>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200/60 px-2 py-1.5 dark:border-white/10">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  tone?: "rose" | "emerald";
}) {
  return (
    <div>
      <p
        className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${
          tone === "rose"
            ? "text-rose-600 dark:text-rose-400"
            : tone === "emerald"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground"
        }`}
      >
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
