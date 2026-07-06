"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Banknote,
  Bot,
  FileText,
  ListTodo,
  UserPlus,
  Workflow,
} from "lucide-react";
import { activityTimeline } from "@/data/catalyst-one/dashboard";
import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import { filterActivityByRange } from "@/lib/dashboard-metrics";
import { ROUTES } from "@/constants/routes";
import { formatRelativeTime } from "@/lib/utils";
import {
  DashboardCard,
  DashboardCardContent,
  DashboardCardHeader,
} from "@/components/catalyst-one/dashboard/dashboard-card";
import { cn } from "@/lib/utils";
import type { ActivityEvent } from "@/types/catalyst-one";

const typeConfig: Record<
  ActivityEvent["type"],
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  loan: { icon: Workflow, color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
  customer: { icon: UserPlus, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  document: { icon: FileText, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  disbursement: { icon: Banknote, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  task: { icon: ListTodo, color: "text-slate-400 bg-slate-500/10 border-slate-600/30" },
  system: { icon: Bot, color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
};

function resolveHref(event: ActivityEvent): string {
  if (event.href) return event.href;
  if (event.fileId) return `${ROUTES.LOAN_FILES}?file=${event.fileId}`;
  switch (event.type) {
    case "customer":
      return ROUTES.CUSTOMERS;
    case "document":
      return ROUTES.DOCUMENTS;
    case "disbursement":
      return ROUTES.PIPELINE;
    case "task":
      return ROUTES.TASKS;
    default:
      return ROUTES.LOAN_FILES;
  }
}

export function DashboardActivityPanel() {
  const { dateRange } = useDashboardFilter();
  const events = filterActivityByRange(activityTimeline, dateRange);
  const displayEvents = events.length > 0 ? events.slice(0, 6) : activityTimeline.slice(0, 6);

  return (
    <DashboardCard className="h-full">
      <DashboardCardHeader
        title="Recent Activity"
        description={dateRange.label}
        action={
          <Link href={ROUTES.TASKS} className="text-[10px] font-medium text-teal-400 hover:underline">
            View all
          </Link>
        }
      />
      <DashboardCardContent className="pt-0">
        <div className="space-y-0">
          {displayEvents.map((event, index) => {
            const config = typeConfig[event.type];
            const Icon = config.icon;
            const isLast = index === displayEvents.length - 1;

            return (
              <Link key={event.id} href={resolveHref(event)} className="block group">
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={cn("relative flex gap-3 py-3", !isLast && "border-b border-slate-800/80")}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-transform group-hover:scale-105",
                      config.color,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-slate-200 group-hover:text-teal-300 transition-colors leading-snug">
                        {event.title}
                      </p>
                      <time className="text-[10px] text-slate-500 shrink-0 tabular-nums">
                        {formatRelativeTime(event.timestamp)}
                      </time>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{event.description}</p>
                    {event.actor && (
                      <p className="text-[10px] text-slate-600 mt-1">
                        {event.actor}
                      </p>
                    )}
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </DashboardCardContent>
    </DashboardCard>
  );
}
