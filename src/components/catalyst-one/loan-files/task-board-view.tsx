"use client";

import { useMemo } from "react";
import { useLoanFiles } from "@/components/catalyst-one/loan-files/loan-files-context";
import { StatusPill } from "@/components/design-system/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TaskWithFile = {
  id: string;
  title: string;
  priority: "urgent" | "high" | "medium" | "low";
  dueDate: string;
  assignedTo: string;
  completed: boolean;
  fileId: string;
  fileNumber: string;
  customerName: string;
};

function bucketTasks(tasks: TaskWithFile[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const overdue: TaskWithFile[] = [];
  const todayList: TaskWithFile[] = [];
  const tomorrowList: TaskWithFile[] = [];
  const upcoming: TaskWithFile[] = [];

  tasks
    .filter((t) => !t.completed)
    .forEach((t) => {
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due < today) overdue.push(t);
      else if (due.getTime() === today.getTime()) todayList.push(t);
      else if (due.getTime() === tomorrow.getTime()) tomorrowList.push(t);
      else upcoming.push(t);
    });

  return { overdue, today: todayList, tomorrow: tomorrowList, upcoming };
}

const priorityVariant = {
  urgent: "error" as const,
  high: "warning" as const,
  medium: "info" as const,
  low: "muted" as const,
};

export function TaskBoardView() {
  const { allTasks, setSelectedFileId } = useLoanFiles();
  const buckets = useMemo(() => bucketTasks(allTasks as TaskWithFile[]), [allTasks]);

  const sections = [
    { key: "today", label: "Today", tasks: buckets.today, accent: "border-primary/30" },
    { key: "tomorrow", label: "Tomorrow", tasks: buckets.tomorrow, accent: "border-accent/30" },
    { key: "upcoming", label: "Upcoming", tasks: buckets.upcoming, accent: "border-border" },
    { key: "overdue", label: "Overdue", tasks: buckets.overdue, accent: "border-destructive/30" },
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {sections.map((section) => (
        <Card key={section.key} className={cn("glass-card border-2", section.accent)}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center justify-between">
              {section.label}
              <span className="text-xs font-normal text-muted-foreground">{section.tasks.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4 max-h-[420px] overflow-auto scrollbar-thin">
            {section.tasks.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No tasks</p>
            )}
            {section.tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelectedFileId(task.fileId)}
                className="w-full text-left rounded-lg border bg-background/60 p-2.5 hover:bg-muted/40 transition-colors"
              >
                <p className="text-sm font-medium truncate">{task.title}</p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {task.customerName} · {task.fileNumber}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <StatusPill variant={priorityVariant[task.priority]} className="text-[10px] capitalize">
                    {task.priority}
                  </StatusPill>
                  <span className="text-[10px] text-muted-foreground">{task.assignedTo}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
