"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { LoanFileTimelineEvent } from "@/types/catalyst-one";

interface FileTimelineProps {
  events: LoanFileTimelineEvent[];
}

export function FileTimeline({ events }: FileTimelineProps) {
  return (
    <div className="space-y-0">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className="relative flex gap-3 pb-6 last:pb-0"
          >
            {!isLast && <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />}
            <div
              className={cn(
                "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                event.completed
                  ? "bg-accent/10 border-accent text-accent"
                  : "bg-muted border-border text-muted-foreground",
              )}
            >
              {event.completed ? <Check className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-current" />}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <p className={cn("text-sm font-medium", !event.completed && "text-muted-foreground")}>
                  {event.title}
                </p>
                {event.completed && (
                  <time className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(event.timestamp)}
                  </time>
                )}
              </div>
              {event.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
