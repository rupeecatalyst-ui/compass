"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useLoanFiles } from "@/components/catalyst-one/loan-files/loan-files-context";
import { StatusPill } from "@/components/design-system/status-pill";
import { cn } from "@/lib/utils";
import type { LoanFileTask } from "@/types/catalyst-one";

const priorityVariant = {
  urgent: "error" as const,
  high: "warning" as const,
  medium: "info" as const,
  low: "muted" as const,
};

interface TaskPanelProps {
  fileId: string;
  tasks: LoanFileTask[];
}

export function TaskPanel({ fileId, tasks }: TaskPanelProps) {
  const { updateTask } = useLoanFiles();
  const pending = tasks.filter((t) => !t.completed);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Tasks</h4>
        <span className="text-xs text-muted-foreground">{pending.length} pending</span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              "rounded-lg border p-3 transition-colors",
              task.completed ? "bg-muted/30 opacity-70" : "bg-card",
            )}
          >
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => updateTask(fileId, task.id, { completed: !task.completed })}
                className="shrink-0 mt-0.5"
              >
                {task.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", task.completed && "line-through text-muted-foreground")}>
                  {task.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <StatusPill variant={priorityVariant[task.priority]} className="text-[10px] capitalize">
                    {task.priority}
                  </StatusPill>
                  <span className="text-[10px] text-muted-foreground">
                    Due {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                  <span className="text-[10px] text-muted-foreground">· {task.assignedTo}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
