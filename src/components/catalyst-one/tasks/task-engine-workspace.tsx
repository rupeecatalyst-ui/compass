"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { ETE_PREDEFINED_DESCRIPTIONS, ETE_TASK_TYPES } from "@/constants/enterprise-task-engine";
import {
  completeEteTask,
  deriveEteTaskColour,
  escalateEteOverdueTasks,
  listEteTasks,
  registerEteTask,
} from "@/lib/enterprise-task-engine";
import type { EteTask } from "@/types/enterprise-task-engine";
import { ROUTES } from "@/constants/routes";
import { PageHeader } from "@/components/design-system/page-header";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type KanbanColumnId = "due_today" | "due_tomorrow" | "this_week" | "upcoming" | "completed";

const COLUMNS: { id: KanbanColumnId; label: string }[] = [
  { id: "due_today", label: "Due Today" },
  { id: "due_tomorrow", label: "Due Tomorrow" },
  { id: "this_week", label: "This Week" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
];

const PREDEFINED = Object.values(ETE_PREDEFINED_DESCRIPTIONS);

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function seedTasksIfEmpty() {
  if (listEteTasks().length > 0) return;
  const now = Date.now();
  const today = new Date(now + 2 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(now + 26 * 60 * 60 * 1000).toISOString();
  const week = new Date(now + 4 * 24 * 60 * 60 * 1000).toISOString();
  const upcoming = new Date(now + 12 * 24 * 60 * 60 * 1000).toISOString();
  const overdue = new Date(now - 60 * 60 * 1000).toISOString();

  registerEteTask({
    taskType: ETE_TASK_TYPES.OPPORTUNITY,
    assigneeRef: "employee:rm-001",
    opportunityRef: "opp-demo-001",
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.FOLLOW_UP_DOCUMENTS,
    dueOn: today,
    createdBy: "system",
  });
  registerEteTask({
    taskType: ETE_TASK_TYPES.OPPORTUNITY,
    assigneeRef: "employee:rm-001",
    opportunityRef: "opp-demo-001",
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.FOLLOW_UP_LENDER,
    dueOn: overdue,
    reportingManagerRef: "employee:mgr-001",
    createdBy: "system",
  });
  registerEteTask({
    taskType: ETE_TASK_TYPES.INDEPENDENT,
    assigneeRef: "employee:ops-001",
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.CALL_CUSTOMER,
    dueOn: tomorrow,
    createdBy: "system",
  });
  registerEteTask({
    taskType: ETE_TASK_TYPES.INDEPENDENT,
    assigneeRef: "employee:ops-001",
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.INTERNAL_REVIEW,
    dueOn: week,
    createdBy: "system",
  });
  registerEteTask({
    taskType: ETE_TASK_TYPES.OPPORTUNITY,
    assigneeRef: "employee:rm-001",
    opportunityRef: "opp-demo-001",
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.CUSTOMER_MEETING,
    dueOn: upcoming,
    createdBy: "system",
  });
}

function columnForTask(task: EteTask): KanbanColumnId {
  if (!task.enabled) return "completed";
  if (!task.dueOn) return "upcoming";
  const due = startOfDay(new Date(task.dueOn));
  const today = startOfDay(new Date());
  const tomorrow = today + 24 * 60 * 60 * 1000;
  const weekEnd = today + 7 * 24 * 60 * 60 * 1000;
  if (due < today) return "due_today";
  if (due === today) return "due_today";
  if (due === tomorrow) return "due_tomorrow";
  if (due <= weekEnd) return "this_week";
  return "upcoming";
}

function deadlineTone(task: EteTask): "green" | "amber" | "red" {
  const colour = deriveEteTaskColour(task.dueOn);
  if (colour === "red") return "red";
  if (colour === "orange") return "amber";
  return "green";
}

function workflowHref(task: EteTask): { href: string; label: string } {
  if (task.taskType === "opportunity" || task.opportunityRef) {
    return { href: ROUTES.OPPORTUNITY_WORKSPACE, label: "Opportunity Workspace" };
  }
  return { href: ROUTES.LOAN_FILES, label: "Loan Workflow" };
}

function refNumber(task: EteTask): string {
  return `TSK-${task.id.slice(0, 8).toUpperCase()}`;
}

function assigneeLabel(ref: string): string {
  if (ref.includes("rm")) return "Rahul Sharma";
  if (ref.includes("ops")) return "Ops Desk";
  if (ref.includes("mgr")) return "Anil Mehta";
  return ref.replace(/^employee:/, "");
}

/**
 * Prompt 011 PART 6 — Task Experience (Create + Kanban).
 */
export function TaskEngineWorkspace() {
  const [tasks, setTasks] = useState<EteTask[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [taskType, setTaskType] = useState<EteTask["taskType"]>(ETE_TASK_TYPES.INDEPENDENT);
  const [assignee, setAssignee] = useState("employee:rm-001");
  const [predefined, setPredefined] = useState<EteTask["predefinedDescription"]>(
    ETE_PREDEFINED_DESCRIPTIONS.CALL_CUSTOMER,
  );
  const [customDescription, setCustomDescription] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = () => setTasks(listEteTasks());

  useEffect(() => {
    seedTasksIfEmpty();
    escalateEteOverdueTasks("system");
    refresh();
  }, []);

  const grouped = useMemo(() => {
    const map: Record<KanbanColumnId, EteTask[]> = {
      due_today: [],
      due_tomorrow: [],
      this_week: [],
      upcoming: [],
      completed: [],
    };
    for (const task of tasks) {
      map[columnForTask(task)].push(task);
    }
    return map;
  }, [tasks]);

  const onCreate = () => {
    setError(null);
    try {
      registerEteTask({
        taskType,
        assigneeRef: assignee,
        opportunityRef: taskType === ETE_TASK_TYPES.OPPORTUNITY ? "opp-demo-001" : undefined,
        predefinedDescription: predefined,
        description: predefined === ETE_PREDEFINED_DESCRIPTIONS.CUSTOM ? customDescription : undefined,
        dueOn: dueOn ? new Date(dueOn).toISOString() : undefined,
        reportingManagerRef: "employee:mgr-001",
        createdBy: "ui",
      });
      setCreateOpen(false);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create task");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tasks"
        description="Create work, then execute from the Kanban board — every card links to the related workflow."
        actions={
          <Button type="button" className="h-10 gap-2 rounded-xl" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
        }
      />

      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="flex w-[280px] shrink-0 flex-col rounded-xl border border-border bg-muted/20"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {col.label}
              </p>
              <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium tabular-nums">
                {grouped[col.id].length}
              </span>
            </div>
            <div className="flex max-h-[68vh] flex-col gap-2 overflow-y-auto p-2">
              {grouped[col.id].map((task) => {
                const tone = deadlineTone(task);
                const wf = workflowHref(task);
                const title =
                  task.predefinedDescription === "Custom"
                    ? task.description || "Custom task"
                    : task.predefinedDescription;
                return (
                  <article
                    key={task.id}
                    className={cn(
                      "rounded-lg border bg-card p-3 shadow-sm",
                      tone === "red" && "border-rose-500/40",
                      tone === "amber" && "border-amber-500/40",
                      tone === "green" && "border-emerald-500/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug">{title}</p>
                      <span
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          tone === "red" && "bg-rose-500",
                          tone === "amber" && "bg-amber-500",
                          tone === "green" && "bg-emerald-500",
                        )}
                        title={tone === "red" ? "Overdue" : tone === "amber" ? "Approaching" : "Comfortable"}
                      />
                    </div>
                    <dl className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                      <Row label="Reference" value={refNumber(task)} />
                      <Row
                        label="Linked Entity"
                        value={
                          task.taskType === "opportunity"
                            ? `Opportunity · ${task.opportunityRef ?? "—"}`
                            : "General Task"
                        }
                      />
                      <Row label="Customer" value="Demo Customer" />
                      <Row label="Assigned By" value={assigneeLabel(task.createdBy === "system" ? "employee:mgr-001" : task.createdBy)} />
                      <Row label="Assigned To" value={assigneeLabel(task.assigneeRef)} />
                      <Row
                        label="Due Date"
                        value={
                          task.dueOn
                            ? new Date(task.dueOn).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"
                        }
                      />
                      <Row
                        label="Priority"
                        value={tone === "red" ? "High" : tone === "amber" ? "Medium" : "Normal"}
                      />
                      <Row label="Status" value={task.enabled ? (task.escalated ? "Escalated" : "Open") : "Completed"} />
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Button asChild size="sm" className="h-7 gap-1 rounded-md text-[11px]">
                        <Link href={wf.href}>
                          Go To Workflow
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                      {task.enabled && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-md text-[11px]"
                          onClick={() => {
                            completeEteTask(task.id, "ui");
                            refresh();
                          }}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
              {grouped[col.id].length === 0 && (
                <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">No tasks</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as EteTask["taskType"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ETE_TASK_TYPES.INDEPENDENT}>General Task</SelectItem>
                  <SelectItem value={ETE_TASK_TYPES.OPPORTUNITY}>Opportunity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Select
                value={predefined}
                onValueChange={(v) => setPredefined(v as EteTask["predefinedDescription"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {predefined === ETE_PREDEFINED_DESCRIPTIONS.CUSTOM && (
              <div className="space-y-1.5">
                <Label>Custom text</Label>
                <Input value={customDescription} onChange={(e) => setCustomDescription(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee:rm-001">Rahul Sharma</SelectItem>
                  <SelectItem value="employee:ops-001">Ops Desk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due</Label>
              <Input type="datetime-local" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="button" onClick={onCreate}>
              Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground/80">{label}</dt>
      <dd className="truncate text-right font-medium text-foreground/90">{value}</dd>
    </div>
  );
}
