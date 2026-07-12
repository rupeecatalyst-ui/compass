"use client";

import { useEffect, useMemo, useState } from "react";
import { ETE_PREDEFINED_DESCRIPTIONS, ETE_TASK_TYPES } from "@/constants/enterprise-task-engine";
import {
  deriveEteTaskColour,
  escalateEteOverdueTasks,
  listEteTasks,
  registerEteTask,
} from "@/lib/enterprise-task-engine";
import type { EteTask } from "@/types/enterprise-task-engine";
import { EnterpriseEngagementCard, type EnterpriseCardTone } from "@/components/catalyst-one/shared/enterprise-engagement-card";
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

const COLOUR_TONE: Record<string, EnterpriseCardTone> = {
  blue: "blue",
  orange: "amber",
  red: "rose",
};

const PREDEFINED = Object.values(ETE_PREDEFINED_DESCRIPTIONS);

function seedTasksIfEmpty() {
  if (listEteTasks().length > 0) return;
  const soon = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const overdue = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const later = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  registerEteTask({
    taskType: ETE_TASK_TYPES.OPPORTUNITY,
    assigneeRef: "employee:rm-001",
    opportunityRef: "opp-demo-001",
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.FOLLOW_UP_DOCUMENTS,
    dueOn: soon,
    createdBy: "system",
  });
  registerEteTask({
    taskType: ETE_TASK_TYPES.INDEPENDENT,
    assigneeRef: "employee:ops-001",
    predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.INTERNAL_REVIEW,
    dueOn: later,
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
}

export function TaskEngineWorkspace() {
  const [tasks, setTasks] = useState<EteTask[]>([]);
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

  const coloured = useMemo(
    () =>
      tasks.map((t) => ({
        task: t,
        colour: deriveEteTaskColour(t.dueOn),
      })),
    [tasks],
  );

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
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create task");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Engine"
        description="Independent and Opportunity tasks. Overdue escalates to CHANAKYA → Reporting Manager as co-owner."
      />

      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>Task Type</Label>
          <Select
            value={taskType}
            onValueChange={(v) => setTaskType(v as EteTask["taskType"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ETE_TASK_TYPES.INDEPENDENT}>Independent</SelectItem>
              <SelectItem value={ETE_TASK_TYPES.OPPORTUNITY}>Opportunity</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Assignee</Label>
          <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Select
            value={predefined}
            onValueChange={(v) => setPredefined(v as EteTask["predefinedDescription"])}
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
        {predefined === ETE_PREDEFINED_DESCRIPTIONS.CUSTOM && (
          <div className="space-y-2 md:col-span-2">
            <Label>Custom description (mandatory)</Label>
            <Input value={customDescription} onChange={(e) => setCustomDescription(e.target.value)} />
          </div>
        )}
        <div className="space-y-2">
          <Label>Due date (optional)</Label>
          <Input type="datetime-local" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button onClick={onCreate}>Create Task</Button>
        </div>
        {error && <p className="text-sm text-destructive md:col-span-full">{error}</p>}
      </div>

      <div className="flex gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Blue · on track</span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Orange · due &lt; 4h</span>
        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700 dark:bg-rose-950 dark:text-rose-300">Red · overdue</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {coloured.map(({ task, colour }) => (
          <EnterpriseEngagementCard
            key={task.id}
            title={task.predefinedDescription}
            description={task.description || `${task.taskType} · ${task.assigneeRef}`}
            tone={COLOUR_TONE[colour] ?? "slate"}
            badge={colour.toUpperCase()}
            meta={
              task.dueOn
                ? `Due ${new Date(task.dueOn).toLocaleString()}${
                    task.coOwnerRefs?.length ? ` · Co-owners: ${task.coOwnerRefs.join(", ")}` : ""
                  }`
                : "No due date"
            }
          />
        ))}
      </div>
    </div>
  );
}
