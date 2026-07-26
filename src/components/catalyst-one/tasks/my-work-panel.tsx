"use client";

/**
 * CO-BIZ-001 — My Work consolidated buckets.
 */

import { useMemo, useState } from "react";
import {
  assigneeLabel,
  buildMyWorkView,
  completeEteTask,
  taskTitle,
} from "@/lib/enterprise-task-engine";
import type { EteMyWorkBucket, EteTask } from "@/types/enterprise-task-engine";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getStoredUser } from "@/lib/auth";

const BUCKETS: { id: EteMyWorkBucket; label: string }[] = [
  { id: "overdue", label: "Overdue" },
  { id: "due_today", label: "Due Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "assigned_to_me", label: "Assigned To Me" },
  { id: "assigned_by_me", label: "Assigned By Me" },
];

function tasksForBucket(
  view: ReturnType<typeof buildMyWorkView>,
  bucket: EteMyWorkBucket,
): EteTask[] {
  switch (bucket) {
    case "overdue":
      return view.overdue;
    case "due_today":
      return view.dueToday;
    case "upcoming":
      return view.upcoming;
    case "completed":
      return view.completed;
    case "assigned_by_me":
      return view.assignedByMe;
    case "assigned_to_me":
      return view.assignedToMe;
  }
}

export function MyWorkPanel({ onChanged }: { onChanged?: () => void }) {
  const user = getStoredUser();
  const userRef = user?.id ? `user:${user.id}` : "employee:rm-001";
  const [bucket, setBucket] = useState<EteMyWorkBucket>("overdue");
  const [tick, setTick] = useState(0);

  const view = useMemo(() => buildMyWorkView(userRef), [userRef, tick]);
  const rows = tasksForBucket(view, bucket);

  const refresh = () => {
    setTick((n) => n + 1);
    onChanged?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {BUCKETS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBucket(b.id)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
              bucket === b.id
                ? "border-teal-600/40 bg-teal-500/10 text-teal-900 dark:text-teal-100"
                : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40",
            )}
          >
            {b.label}
            <span className="ml-1 tabular-nums text-foreground/80">
              {view.counts[b.id]}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border/60">
        {rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            No tasks in this bucket.
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {rows.map((t) => (
              <li
                key={t.id}
                className="flex items-start justify-between gap-3 px-3 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{taskTitle(t)}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {t.workType ?? t.predefinedDescription}
                    {t.entityKind ? ` · ${t.entityKind}` : ""}
                    {t.dueOn ? ` · Due ${new Date(t.dueOn).toLocaleDateString()}` : ""}
                    {` · ${assigneeLabel(t.assigneeRef)}`}
                  </p>
                </div>
                {t.enabled !== false && t.status !== "completed" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 text-[10px]"
                    onClick={() => {
                      completeEteTask(t.id, userRef, "Completed from My Work");
                      refresh();
                    }}
                  >
                    Complete
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
