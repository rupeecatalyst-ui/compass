"use client";

/**
 * BAT #27 — Universal Quick Task create modal.
 * Reuses Enterprise Task Engine (`registerEteTask`) — no parallel task module.
 * CO-BUG-TASK-ENTITY-LINK — Link To uses Enterprise Registry SSOTs only.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChanakyaMark } from "@/components/layout/chanakya-mark";
import {
  TaskEntityLinkPicker,
  type TaskLinkedEntity,
} from "@/components/catalyst-one/tasks/task-entity-link-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/components/providers/auth-provider";
import { searchAssignableUsers, type AssignedUserRef } from "@/lib/assigned-users";
import {
  registerChanakyaTaskMonitoring,
  registerEteTask,
} from "@/lib/enterprise-task-engine";
import { ETE_PREDEFINED_DESCRIPTIONS, ETE_TASK_TYPES } from "@/constants/enterprise-task-engine";
import type { EteTaskPriority } from "@/types/enterprise-task-engine";
import { cn } from "@/lib/utils";
import {
  DEFAULT_RECURRENCE_FORM,
  TaskRecurrenceFields,
  buildRecurrenceFromForm,
  type TaskRecurrenceFormState,
} from "./task-recurrence-fields";
import { resolveReminderAt } from "@/lib/enterprise-task-engine";

export type QuickTaskEntityKind = "contact" | "opportunity" | "deal";

export type QuickTaskContext = {
  contactId?: string | null;
  opportunityId?: string | null;
  dealId?: string | null;
  fileId?: string | null;
  borrowerName?: string | null;
  loanProduct?: string | null;
  lenderName?: string | null;
};

const PRIORITIES: { value: EteTaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export function QuickTaskCreateModal({
  open,
  onOpenChange,
  context,
  allowEntityPicker = false,
  defaultDueOn,
  defaultTitle,
  defaultWorkType,
  defaultPredefinedDescription,
  intentLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: QuickTaskContext;
  /** When true (Dashboard / Tasks / Command Bar), user must Link To a registry entity. */
  allowEntityPicker?: boolean;
  /** CO-TASKS-PLANNER-003 — Prefill due date (ISO or yyyy-mm-dd). */
  defaultDueOn?: string | null;
  defaultTitle?: string | null;
  defaultWorkType?: import("@/types/enterprise-task-engine").EteWorkType | null;
  defaultPredefinedDescription?: import("@/types/enterprise-task-engine").EtePredefinedDescription | null;
  /** Dialog title override (e.g. Schedule Meeting). */
  intentLabel?: string | null;
}) {
  const { user } = useAuthContext();
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<EteTaskPriority>("medium");
  const [dueOn, setDueOn] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [linkedEntity, setLinkedEntity] = useState<TaskLinkedEntity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<AssignedUserRef[]>([]);
  const [recurrenceForm, setRecurrenceForm] =
    useState<TaskRecurrenceFormState>(DEFAULT_RECURRENCE_FORM);

  const lockedContext = Boolean(
    context?.contactId || context?.opportunityId || context?.dealId || context?.fileId,
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void searchAssignableUsers("")
      .then((rows) => {
        if (cancelled) return;
        const mapped = rows.map((u) => ({
          id: u.id,
          name: u.fullName,
          email: u.email,
          employeeId: u.employeeId ?? undefined,
        }));
        setEmployees(mapped);
        setAssigneeId((prev) => prev || mapped[0]?.id || "");
      })
      .catch(() => {
        if (!cancelled) setEmployees([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setTaskName(defaultTitle?.trim() || "");
    setDescription("");
    setPriority("medium");
    const dueSeed = defaultDueOn?.trim() || "";
    if (!dueSeed) {
      setDueOn("");
    } else if (dueSeed.includes("T")) {
      setDueOn(dueSeed.slice(0, 16));
    } else {
      setDueOn(`${dueSeed.slice(0, 10)}T12:00`);
    }
    setReminderAt("");
    setRecurrenceForm(DEFAULT_RECURRENCE_FORM);
    setError(null);
    setLinkedEntity(null);
  }, [
    open,
    context?.opportunityId,
    context?.dealId,
    context?.fileId,
    context?.contactId,
    defaultDueOn,
    defaultTitle,
  ]);

  const contextSummary = useMemo(() => {
    if (linkedEntity) {
      const kindLabel =
        linkedEntity.kind === "deal"
          ? "Deal"
          : linkedEntity.kind === "opportunity"
            ? "Opportunity"
            : "Contact";
      return `${kindLabel} · ${linkedEntity.label}`;
    }
    if (context?.opportunityId) return `Opportunity · ${context.opportunityId}`;
    if (context?.dealId) return `Deal · ${context.dealId}`;
    if (context?.fileId) return `Deal · ${context.fileId}`;
    if (context?.contactId) return `Contact · ${context.contactId}`;
    return null;
  }, [context, linkedEntity]);

  const onSubmit = () => {
    const name = taskName.trim();
    if (!name) {
      setError("Task Name is required.");
      return;
    }
    if (!assigneeId) {
      setError("Assign To is required (Normal / Hybrid Employees only).");
      return;
    }
    if (allowEntityPicker && !lockedContext && !linkedEntity) {
      setError("Link To is required — select a Contact, Opportunity, or Deal from the registry.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const actor =
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
        user?.email ||
        "ui";

      const opportunityId =
        context?.opportunityId?.trim() ||
        linkedEntity?.opportunityId ||
        (linkedEntity?.kind === "opportunity" ? linkedEntity.id : undefined);
      const contactId =
        context?.contactId?.trim() ||
        linkedEntity?.contactId ||
        (linkedEntity?.kind === "contact" ? linkedEntity.id : undefined);
      const dealId =
        context?.dealId?.trim() ||
        context?.fileId?.trim() ||
        (linkedEntity?.kind === "deal" ? linkedEntity.id : undefined);
      const fileId = context?.fileId?.trim() || undefined;

      const entityKind = dealId
        ? "EnterpriseDeal"
        : opportunityId
          ? "Opportunity"
          : contactId
            ? "Customer"
            : "Workflow";
      const entityId =
        dealId || opportunityId || contactId || fileId || "org-workflow";
      const entityLabel =
        linkedEntity?.label ||
        contextSummary ||
        linkedEntity?.dealNumber ||
        linkedEntity?.opportunityNumber ||
        undefined;

      const recurrence = buildRecurrenceFromForm(recurrenceForm);
      const scheduleKind = recurrenceForm.scheduleKind;
      let dueIso = dueOn ? new Date(dueOn).toISOString() : undefined;
      if (!dueIso && scheduleKind !== "recurring") {
        const fallback = new Date();
        fallback.setHours(17, 0, 0, 0);
        dueIso = fallback.toISOString();
      }
      if (scheduleKind === "recurring" && !dueIso) {
        setError("Recurring tasks require a Due Date for the first occurrence.");
        setSaving(false);
        return;
      }
      const reminderIso =
        scheduleKind === "recurring" && recurrence?.reminderOffset && dueIso
          ? resolveReminderAt(dueIso, recurrence.reminderOffset)
          : reminderAt
            ? new Date(reminderAt).toISOString()
            : undefined;

      const task = registerEteTask({
        taskType: opportunityId || dealId ? ETE_TASK_TYPES.OPPORTUNITY : ETE_TASK_TYPES.INDEPENDENT,
        opportunityRef: opportunityId,
        contactId,
        dealId,
        fileId,
        entityKind,
        entityId,
        entityLabel,
        title: name.trim(),
        workType: defaultWorkType ?? "Custom",
        status: "open",
        assigneeRef: `user:${assigneeId}`,
        assignedByRef: user?.id ? `user:${user.id}` : actor,
        predefinedDescription:
          defaultPredefinedDescription ?? ETE_PREDEFINED_DESCRIPTIONS.CUSTOM,
        description: description.trim()
          ? `${name}\n\n${description.trim()}`
          : name,
        priority,
        dueOn: dueIso,
        scheduleKind,
        recurrence,
        reminderAt: reminderIso,
        borrowerName:
          linkedEntity?.customerName ||
          context?.borrowerName ||
          undefined,
        loanProduct:
          linkedEntity?.product ||
          context?.loanProduct ||
          undefined,
        lenderName:
          linkedEntity?.lenderName ||
          context?.lenderName ||
          undefined,
        category: opportunityId || fileId || dealId || contactId ? "workflow" : "general",
        createdBy: actor,
        chanakyaMonitoring: true,
      });

      registerChanakyaTaskMonitoring(task);

      toast.success(
        scheduleKind === "recurring"
          ? "Recurring task series started."
          : "Task created successfully.",
        {
          description: entityLabel
            ? `Linked to ${entityKind} · ${entityLabel}`
            : scheduleKind === "recurring"
              ? "Future occurrences appear on the Planner calendar."
              : "Visible on Planner · Agenda · My Tasks.",
        },
      );
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-lg" allowOutsideClose>
        <DialogHeader>
          <DialogTitle>{intentLabel?.trim() || "Create Task"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          {lockedContext && contextSummary ? (
            <div className="rounded-lg border border-teal-500/25 bg-teal-500/5 px-3 py-2 text-[11px] text-muted-foreground">
              Linked to <span className="font-medium text-foreground">{contextSummary}</span>
              {context?.borrowerName ? ` · ${context.borrowerName}` : ""}
            </div>
          ) : null}

          {allowEntityPicker && !lockedContext ? (
            <TaskEntityLinkPicker
              value={linkedEntity}
              onChange={setLinkedEntity}
              required
            />
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="qt-name">
              Task Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="qt-name"
              className="h-9 text-sm"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g. Follow up for sanction conditions"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qt-desc">Description</Label>
            <Textarea
              id="qt-desc"
              className="min-h-[72px] text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as EteTaskPriority)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qt-due">
                Due Date
                {recurrenceForm.scheduleKind === "recurring" ? (
                  <span className="text-destructive"> *</span>
                ) : null}
              </Label>
              <Input
                id="qt-due"
                type="datetime-local"
                className="h-9 text-xs"
                value={dueOn}
                onChange={(e) => setDueOn(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Assign To <span className="text-destructive">*</span>
            </Label>
            {employees.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Loading Enterprise Employee Registry…
              </p>
            ) : (
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.name}
                      {u.email ? ` · ${u.email}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <TaskRecurrenceFields value={recurrenceForm} onChange={setRecurrenceForm} />

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/20 px-2.5 py-2 text-[11px] text-muted-foreground">
            <ChanakyaMark className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              Tasks must link to Enterprise Registries. Entity ID is stored — never free-text
              names alone.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-9"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={cn("h-9")}
            disabled={saving}
            onClick={onSubmit}
          >
            {saving ? "Creating…" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
