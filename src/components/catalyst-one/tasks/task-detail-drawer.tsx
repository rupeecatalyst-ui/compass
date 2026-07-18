"use client";

import { useState } from "react";
import Link from "next/link";
import { Paperclip, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  assigneeLabel,
  patchEteTask,
  resolveTaskCategory,
  taskTitle,
} from "@/lib/enterprise-task-engine";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import type { EteTask } from "@/types/enterprise-task-engine";

export function TaskDetailDrawer({
  task,
  open,
  onOpenChange,
  onUpdated,
}: {
  task: EteTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}) {
  const [note, setNote] = useState("");
  const [checkLabel, setCheckLabel] = useState("");

  if (!task) return null;

  const category = resolveTaskCategory(task);
  const checklist = task.checklist ?? [];
  const comments = task.comments ?? [];

  const persist = (patch: Parameters<typeof patchEteTask>[1]) => {
    patchEteTask(task.id, patch, "ui");
    onUpdated();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        <SheetHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                category === "workflow"
                  ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                  : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
              )}
            >
              {category === "workflow" ? "Workflow" : "General"}
            </span>
            {task.priority ? (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {task.priority} priority
              </span>
            ) : null}
          </div>
          <SheetTitle className="text-base leading-snug">{taskTitle(task)}</SheetTitle>
          <SheetDescription className="text-xs">
            {task.dueOn
              ? `Due ${new Date(task.dueOn).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "No schedule"}
            {" · "}
            {assigneeLabel(task.assigneeRef)}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-5 py-4">
          <section className="space-y-1.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </h3>
            <Textarea
              value={task.description ?? ""}
              onChange={(e) => persist({ description: e.target.value })}
              placeholder="Add description…"
              className="min-h-[72px] text-xs"
            />
          </section>

          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Checklist
            </h3>
            <ul className="space-y-1.5">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={(checked) =>
                      persist({
                        checklist: checklist.map((c) =>
                          c.id === item.id ? { ...c, done: Boolean(checked) } : c,
                        ),
                      })
                    }
                  />
                  <span className={cn(item.done && "line-through text-muted-foreground")}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                value={checkLabel}
                onChange={(e) => setCheckLabel(e.target.value)}
                placeholder="New checklist item"
                className="h-8 text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 shrink-0"
                disabled={!checkLabel.trim()}
                onClick={() => {
                  persist({
                    checklist: [
                      ...checklist,
                      { id: `chk-${Date.now()}`, label: checkLabel.trim(), done: false },
                    ],
                  });
                  setCheckLabel("");
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Comments
            </h3>
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 text-xs">
                  <p className="font-medium">{c.author}</p>
                  <p className="mt-0.5 text-muted-foreground">{c.body}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground/80">
                    {new Date(c.at).toLocaleString("en-IN")}
                  </p>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a comment…"
                className="h-8 text-xs"
              />
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0"
                disabled={!note.trim()}
                onClick={() => {
                  persist({
                    comments: [
                      {
                        id: `cmt-${Date.now()}`,
                        author: assigneeLabel("ui"),
                        body: note.trim(),
                        at: new Date().toISOString(),
                      },
                      ...comments,
                    ],
                  });
                  setNote("");
                }}
              >
                Post
              </Button>
            </div>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Timeline
            </h3>
            <p className="text-xs text-muted-foreground">
              Created {new Date(task.createdOn).toLocaleString("en-IN")} · Modified{" "}
              {new Date(task.modifiedOn).toLocaleString("en-IN")}
              {task.commitmentLevel ? ` · Commitment: ${task.commitmentLevel.replace(/_/g, " ")}` : ""}
              {task.postponeReason ? ` · Reason: ${task.postponeReason.replace(/_/g, " ")}` : ""}
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Attachments
            </h3>
            <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" />
              Drop files here (demo — no upload)
            </div>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Activity Log
            </h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>Task created by {assigneeLabel(task.createdBy)}</li>
              {task.escalated ? <li>Escalated {task.escalatedOn ? new Date(task.escalatedOn).toLocaleString("en-IN") : ""}</li> : null}
              {task.postponeComment ? <li>Postpone note: {task.postponeComment}</li> : null}
            </ul>
          </section>

          {category === "workflow" ? (
            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Linked entities
              </h3>
              <dl className="grid gap-1.5 text-xs">
                <LinkRow label="Customer" value={task.borrowerName ?? "—"} />
                <LinkRow label="Opportunity" value={task.opportunityRef ?? "—"} />
                <LinkRow label="Loan" value={task.loanProduct ?? "—"} href={ROUTES.LOAN_FILES} />
                <LinkRow label="Lender" value={task.lenderName ?? "—"} />
                <LinkRow label="Gross Stage" value={task.grossStage ?? "—"} />
              </dl>
            </section>
          ) : (
            <section className="space-y-1.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Organization
              </h3>
              <p className="text-xs">
                Department: <span className="font-medium">{task.department ?? "—"}</span>
              </p>
              <p className="text-xs">
                Assigned by:{" "}
                <span className="font-medium">
                  {assigneeLabel(task.assignedByRef ?? task.createdBy)}
                </span>
              </p>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LinkRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-right font-medium">
        {href && value !== "—" ? (
          <Link href={href} className="text-primary underline-offset-2 hover:underline">
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
