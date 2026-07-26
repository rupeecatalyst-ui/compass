"use client";

/**
 * BAT #27 — Universal Quick Task create modal.
 * Reuses Enterprise Task Engine (`registerEteTask`) — no parallel task module.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChanakyaMark } from "@/components/layout/chanakya-mark";
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
import { listEligibleAssignedUsers } from "@/lib/assigned-users";
import {
  registerChanakyaTaskMonitoring,
  registerEteTask,
} from "@/lib/enterprise-task-engine";
import { ETE_PREDEFINED_DESCRIPTIONS, ETE_TASK_TYPES } from "@/constants/enterprise-task-engine";
import type { EteTaskPriority } from "@/types/enterprise-task-engine";
import { cn } from "@/lib/utils";

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: QuickTaskContext;
  /** When true (Dashboard / Command Bar), user may choose Contact / Opportunity / Deal. */
  allowEntityPicker?: boolean;
}) {
  const { user } = useAuthContext();
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<EteTaskPriority>("medium");
  const [dueOn, setDueOn] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [entityKind, setEntityKind] = useState<QuickTaskEntityKind>("opportunity");
  const [entitySearch, setEntitySearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const employees = useMemo(() => listEligibleAssignedUsers(), []);

  const lockedContext = Boolean(
    context?.contactId || context?.opportunityId || context?.dealId || context?.fileId,
  );

  useEffect(() => {
    if (!open) return;
    setTaskName("");
    setDescription("");
    setPriority("medium");
    setDueOn("");
    setReminderAt("");
    setError(null);
    setAssigneeId(employees[0]?.id ?? "");
    if (context?.opportunityId) setEntityKind("opportunity");
    else if (context?.dealId || context?.fileId) setEntityKind("deal");
    else if (context?.contactId) setEntityKind("contact");
  }, [open, employees, context?.opportunityId, context?.dealId, context?.fileId, context?.contactId]);

  const contextSummary = useMemo(() => {
    if (context?.opportunityId) return `Opportunity · ${context.opportunityId}`;
    if (context?.dealId) return `Deal · ${context.dealId}`;
    if (context?.fileId) return `Deal · ${context.fileId}`;
    if (context?.contactId) return `Contact · ${context.contactId}`;
    return null;
  }, [context]);

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

    setSaving(true);
    setError(null);
    try {
      const actor =
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
        user?.email ||
        "ui";
      const opportunityId = context?.opportunityId?.trim() || undefined;
      const contactId = context?.contactId?.trim() || undefined;
      const dealId = context?.dealId?.trim() || context?.fileId?.trim() || undefined;
      const fileId = context?.fileId?.trim() || undefined;

      const task = registerEteTask({
        taskType: opportunityId ? ETE_TASK_TYPES.OPPORTUNITY : ETE_TASK_TYPES.INDEPENDENT,
        opportunityRef: opportunityId,
        contactId,
        dealId,
        fileId,
        entityKind: dealId
          ? "EnterpriseDeal"
          : opportunityId
            ? "Opportunity"
            : contactId
              ? "Customer"
              : "Workflow",
        entityId: dealId || opportunityId || contactId || fileId || "org-workflow",
        entityLabel: contextSummary || undefined,
        title: name.trim(),
        workType: "Custom",
        status: "open",
        assigneeRef: `user:${assigneeId}`,
        assignedByRef: user?.id ? `user:${user.id}` : actor,
        predefinedDescription: ETE_PREDEFINED_DESCRIPTIONS.CUSTOM,
        description: description.trim()
          ? `${name}\n\n${description.trim()}`
          : name,
        priority,
        dueOn: dueOn ? new Date(dueOn).toISOString() : undefined,
        reminderAt: reminderAt ? new Date(reminderAt).toISOString() : undefined,
        borrowerName: context?.borrowerName ?? undefined,
        loanProduct: context?.loanProduct ?? undefined,
        lenderName: context?.lenderName ?? undefined,
        category: opportunityId || fileId || dealId ? "workflow" : "general",
        createdBy: actor,
        chanakyaMonitoring: true,
      });

      registerChanakyaTaskMonitoring(task);

      toast.success("Task created successfully.", {
        description: "I'll monitor this task and follow up until it's completed.",
      });
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
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          {lockedContext && contextSummary ? (
            <div className="rounded-lg border border-teal-500/25 bg-teal-500/5 px-3 py-2 text-[11px] text-muted-foreground">
              Linked to <span className="font-medium text-foreground">{contextSummary}</span>
              {context?.borrowerName ? ` · ${context.borrowerName}` : ""}
            </div>
          ) : null}

          {allowEntityPicker && !lockedContext ? (
            <div className="grid gap-2 rounded-lg border border-border/60 p-2.5">
              <Label className="text-[10px] uppercase text-muted-foreground">Link to</Label>
              <Select
                value={entityKind}
                onValueChange={(v) => setEntityKind(v as QuickTaskEntityKind)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="opportunity">Opportunity</SelectItem>
                  <SelectItem value="deal">Deal</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="h-9 text-xs"
                placeholder={`Search ${entityKind}…`}
                value={entitySearch}
                onChange={(e) => setEntitySearch(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Open Create Task from a workspace to auto-link. Neutral launch keeps this picker for
                future search wiring.
              </p>
            </div>
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
              <Label htmlFor="qt-due">Due Date</Label>
              <Input
                id="qt-due"
                type="datetime-local"
                className="h-9 text-xs"
                value={dueOn}
                onChange={(e) => setDueOn(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="qt-reminder">Reminder (optional)</Label>
              <Input
                id="qt-reminder"
                type="datetime-local"
                className="h-9 text-xs"
                value={reminderAt}
                onChange={(e) => setReminderAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Assign To</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.length === 0 ? (
                    <SelectItem value="__none" disabled className="text-xs">
                      No eligible employees
                    </SelectItem>
                  ) : (
                    employees.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Normal &amp; Hybrid Employees only — not Customers, Partners, or Lenders.
              </p>
            </div>
          </div>

          <div
            className={cn(
              "flex items-start gap-2.5 rounded-xl border border-teal-500/30 bg-teal-500/5 px-3 py-2.5",
            )}
          >
            <ChanakyaMark size="sm" className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">Chanakya Monitoring</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                I&apos;ll keep an eye on this task and follow up until it reaches closure.
              </p>
            </div>
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onSubmit} disabled={saving}>
            {saving ? "Creating…" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
