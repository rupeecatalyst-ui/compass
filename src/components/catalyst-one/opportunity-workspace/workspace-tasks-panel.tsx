"use client";

import { useEffect, useMemo, useState } from "react";
import { ETE_PREDEFINED_DESCRIPTIONS, ETE_TASK_TYPES } from "@/constants/enterprise-task-engine";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import {
  deriveEteTaskColour,
  escalateEteOverdueTasks,
  listEteTasks,
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

const PREDEFINED = Object.values(ETE_PREDEFINED_DESCRIPTIONS);

export function WorkspaceTasksPanel() {
  const { opportunityId, refresh, refreshKey, completedTaskIds, markTaskCompleted } =
    useOpportunityWorkspace();
  const [assignee, setAssignee] = useState("employee:rm-001");
  const [predefined, setPredefined] = useState<EtePredefinedDescription>(
    ETE_PREDEFINED_DESCRIPTIONS.CALL_CUSTOMER,
  );
  const [dueOn, setDueOn] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    escalateEteOverdueTasks("workspace");
  }, []);

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
  }, [tasks, completedTaskIds]);

  const total = Math.max(1, tasks.length);
  const completionPct = Math.round((sections.completed.length / total) * 100);

  const onCreate = () => {
    if (!opportunityId) return;
    setError(null);
    try {
      registerEteTask({
        taskType: ETE_TASK_TYPES.OPPORTUNITY,
        assigneeRef: assignee,
        opportunityRef: opportunityId,
        predefinedDescription: predefined,
        dueOn: dueOn ? new Date(dueOn).toISOString() : undefined,
        reportingManagerRef: "employee:mgr-001",
        createdBy: "workspace",
      });
      appendEdcTimelineEntry({
        contextRef: { type: "opportunity", id: opportunityId },
        eventType: "task",
        title: "Task created",
        description: `Assigned: ${predefined}`,
        actorId: "workspace",
        expandablePayload: { predefined, assignee, source: "opportunity-workspace-tasks" },
      });
      setDueOn("");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create task");
    }
  };

  const renderTask = (task: EteTask, section: "active" | "completed" | "overdue") => {
    const colour = section === "overdue" ? "red" : deriveEteTaskColour(task.dueOn);
    return (
      <div
        key={task.id}
        className="rounded-xl border border-zinc-200/70 bg-zinc-50/50 p-2.5 dark:border-white/10 dark:bg-zinc-950/40"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium">{task.predefinedDescription}</p>
            <p className="text-[10px] text-muted-foreground">{task.assigneeRef}</p>
            {task.dueOn && (
              <p className="text-[10px] text-muted-foreground">
                Due {new Date(task.dueOn).toLocaleString()}
              </p>
            )}
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
            {section === "completed" ? "done" : colour}
          </span>
        </div>
        {section !== "completed" && (
          <Button
            size="sm"
            variant="ghost"
            className="mt-1 h-7 px-2 text-xs"
            onClick={() => markTaskCompleted(task.id)}
          >
            Complete
          </Button>
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
        <div className="grid gap-2">
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
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
            <Label>Due (optional)</Label>
            <Input type="datetime-local" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
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
