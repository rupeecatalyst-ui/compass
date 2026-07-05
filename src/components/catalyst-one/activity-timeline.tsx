"use client";

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
import { formatRelativeTime } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ActivityEvent } from "@/types/catalyst-one";

const typeConfig: Record<
  ActivityEvent["type"],
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  loan: { icon: Workflow, color: "bg-primary/10 text-primary border-primary/20" },
  customer: { icon: UserPlus, color: "bg-info/10 text-info border-info/20" },
  document: { icon: FileText, color: "bg-warning/10 text-warning border-warning/20" },
  disbursement: { icon: Banknote, color: "bg-accent/10 text-accent border-accent/20" },
  task: { icon: ListTodo, color: "bg-muted text-muted-foreground border-border" },
  system: { icon: Bot, color: "bg-primary/10 text-primary border-primary/20" },
};

export function ActivityTimeline() {
  return (
    <Card className="glass-card border-border/60">
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
        <CardDescription>Recent actions across your loan operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {activityTimeline.map((event, index) => {
            const config = typeConfig[event.type];
            const Icon = config.icon;
            const isLast = index === activityTimeline.length - 1;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative flex gap-4 pb-8 last:pb-0"
              >
                {!isLast && (
                  <div className="absolute left-[19px] top-10 bottom-0 w-px bg-border" />
                )}
                <div
                  className={cn(
                    "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                    config.color,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-medium">{event.title}</p>
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
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
