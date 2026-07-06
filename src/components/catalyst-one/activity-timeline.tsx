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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ActivityEvent } from "@/types/catalyst-one";

const typeConfig: Record<
  ActivityEvent["type"],
  { icon: React.ComponentType<{ className?: string }>; color: string; href: string }
> = {
  loan: { icon: Workflow, color: "bg-primary/10 text-primary border-primary/20", href: ROUTES.LOAN_FILES },
  customer: { icon: UserPlus, color: "bg-info/10 text-info border-info/20", href: ROUTES.CUSTOMERS },
  document: { icon: FileText, color: "bg-warning/10 text-warning border-warning/20", href: ROUTES.DOCUMENTS },
  disbursement: { icon: Banknote, color: "bg-accent/10 text-accent border-accent/20", href: ROUTES.PIPELINE },
  task: { icon: ListTodo, color: "bg-muted text-muted-foreground border-border", href: ROUTES.TASKS },
  system: { icon: Bot, color: "bg-primary/10 text-primary border-primary/20", href: ROUTES.DASHBOARD },
};

export function ActivityTimeline() {
  const { dateRange } = useDashboardFilter();
  const events = filterActivityByRange(activityTimeline, dateRange);
  const displayEvents = events.length > 0 ? events : activityTimeline.slice(0, 5);

  return (
    <Card className="glass-card border-border/60 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>{dateRange.label}</CardDescription>
          </div>
          <Link href={ROUTES.TASKS} className="text-xs font-medium text-primary hover:underline shrink-0">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {displayEvents.map((event, index) => {
            const config = typeConfig[event.type];
            const Icon = config.icon;
            const isLast = index === displayEvents.length - 1;

            return (
              <Link key={event.id} href={config.href} className="block group">
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative flex gap-4 pb-6 last:pb-0 group-hover:opacity-90"
                >
                  {!isLast && (
                    <div className="absolute left-[19px] top-10 bottom-0 w-px bg-border" />
                  )}
                  <div
                    className={cn(
                      "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-transform group-hover:scale-105",
                      config.color,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">
                        {event.title}
                      </p>
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(event.timestamp)}
                      </time>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                    {event.actor && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        by <span className="font-medium text-foreground">{event.actor}</span>
                      </p>
                    )}
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
