"use client";

/**
 * CO-BIZ-001 — Entity-scoped tasks panel (Deal / Opportunity / Customer / Lender).
 */

import { useMemo, useState } from "react";
import {
  assigneeLabel,
  completeEteTask,
  listTasksForEntity,
  taskTitle,
} from "@/lib/enterprise-task-engine";
import type { EteEntityKind } from "@/types/enterprise-task-engine";
import { CreateTaskActionButton } from "@/components/catalyst-one/tasks/create-task-action-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getStoredUser } from "@/lib/auth";

export function EntityTasksPanel(props: {
  entityKind: EteEntityKind;
  entityId: string;
  entityLabel?: string;
  opportunityId?: string;
  dealId?: string;
  contactId?: string;
  lenderId?: string;
  borrowerName?: string;
  loanProduct?: string;
  className?: string;
  compact?: boolean;
}) {
  const user = getStoredUser();
  const userRef = user?.id ? `user:${user.id}` : "ui";
  const [tick, setTick] = useState(0);

  const tasks = useMemo(
    () =>
      listTasksForEntity({
        entityKind: props.entityKind,
        entityId: props.entityId,
        opportunityRef: props.opportunityId,
        dealId: props.dealId,
        contactId: props.contactId,
        lenderId: props.lenderId,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.entityId, props.opportunityId, props.dealId, props.contactId, props.lenderId, tick],
  );

  const open = tasks.filter((t) => t.enabled !== false && t.status !== "completed");
  const done = tasks.filter((t) => t.enabled === false || t.status === "completed");

  return (
    <section
      className={cn(
        "rounded-lg border border-border/60 bg-card/40",
        props.compact ? "p-2.5" : "p-3",
        props.className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-foreground">Tasks</h3>
          <p className="text-[10px] text-muted-foreground">
            {open.length} open · {done.length} completed
            {props.entityLabel ? ` · ${props.entityLabel}` : ""}
          </p>
        </div>
        <CreateTaskActionButton
          context={{
            opportunityId: props.opportunityId,
            dealId: props.dealId,
            contactId: props.contactId,
            fileId: props.dealId,
            borrowerName: props.borrowerName,
            loanProduct: props.loanProduct,
          }}
        />
      </div>

      {open.length === 0 ? (
        <p className="py-3 text-center text-[11px] text-muted-foreground">
          No open tasks for this {props.entityKind.toLowerCase()}.
        </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {open.slice(0, 8).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
              <div className="min-w-0">
                <p className="truncate font-medium">{taskTitle(t)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {t.workType ?? t.predefinedDescription}
                  {t.dueOn ? ` · ${new Date(t.dueOn).toLocaleDateString()}` : ""}
                  {` · ${assigneeLabel(t.assigneeRef)}`}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 text-[10px]"
                onClick={() => {
                  completeEteTask(t.id, userRef);
                  setTick((n) => n + 1);
                }}
              >
                Done
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
