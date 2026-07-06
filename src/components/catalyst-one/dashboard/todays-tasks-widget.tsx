"use client";

import Link from "next/link";
import {
  Calendar,
  FileText,
  HelpCircle,
  Phone,
  Wallet,
} from "lucide-react";
import { dashboardTasks } from "@/data/catalyst-one/dashboard";
import { cn } from "@/lib/utils";
import {
  DashboardCard,
  DashboardCardContent,
  DashboardCardHeader,
} from "@/components/catalyst-one/dashboard/dashboard-card";
import type { DashboardTaskItem } from "@/types/catalyst-one";

const typeIcon: Record<DashboardTaskItem["type"], React.ComponentType<{ className?: string }>> = {
  call: Phone,
  meeting: Calendar,
  document: FileText,
  credit: HelpCircle,
  disbursement: Wallet,
};

const bucketConfig = {
  overdue: { label: "Overdue", className: "text-red-400" },
  today: { label: "Today", className: "text-amber-400" },
  upcoming: { label: "Upcoming", className: "text-blue-400" },
} as const;

const buckets: DashboardTaskItem["bucket"][] = ["overdue", "today", "upcoming"];

export function TodaysTasksWidget() {
  return (
    <DashboardCard className="h-full">
      <DashboardCardHeader
        title="Today's Tasks"
        description="Prioritized by urgency"
        action={
          <Link href="/tasks" className="text-[10px] font-medium text-teal-400 hover:underline">
            All tasks
          </Link>
        }
      />
      <DashboardCardContent className="pt-0 space-y-3">
        {buckets.map((bucket) => {
          const tasks = dashboardTasks.filter((t) => t.bucket === bucket);
          if (tasks.length === 0) return null;
          const { label, className } = bucketConfig[bucket];

          return (
            <div key={bucket}>
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1", className)}>
                {label}
              </p>
              <div className="space-y-0.5">
                {tasks.map((task) => {
                  const Icon = typeIcon[task.type];
                  return (
                    <Link
                      key={task.id}
                      href={task.href}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-800/40 transition-colors group",
                        bucket === "overdue" && "bg-red-950/10 hover:bg-red-950/20",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-600 group-hover:text-teal-500/80" />
                      <span className="flex-1 text-xs text-slate-300 truncate group-hover:text-slate-100">
                        {task.title}
                      </span>
                      <span className="text-[10px] text-slate-600 tabular-nums shrink-0">{task.time}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </DashboardCardContent>
    </DashboardCard>
  );
}
