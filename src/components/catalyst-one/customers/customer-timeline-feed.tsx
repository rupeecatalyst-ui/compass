"use client";

import { format } from "date-fns";
import {
  ArrowRightLeft,
  Calendar,
  FileUp,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
} from "lucide-react";
import { EntityButtonLink } from "@/components/catalyst-one/shared/entity-link";
import { cn } from "@/lib/utils";
import type { CustomerTimelineEvent } from "@/types/catalyst-one";

const ICONS: Record<CustomerTimelineEvent["type"], { icon: typeof Phone; color: string }> = {
  call: { icon: Phone, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  email: { icon: Mail, color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  meeting: { icon: Calendar, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  stage_move: { icon: ArrowRightLeft, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  note: { icon: StickyNote, color: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
  task: { icon: MessageSquare, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  document: { icon: FileUp, color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
};

interface CustomerTimelineFeedProps {
  events: CustomerTimelineEvent[];
  onOpenLoan?: (fileId: string) => void;
  limit?: number;
}

export function CustomerTimelineFeed({
  events,
  onOpenLoan,
  limit,
}: CustomerTimelineFeedProps) {
  const items = limit ? events.slice(0, limit) : events;

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((event, i) => {
        const meta = ICONS[event.type] ?? ICONS.note;
        const Icon = meta.icon;
        return (
          <div
            key={event.id}
            className={cn(
              "flex gap-3 rounded-xl border border-border bg-card p-3",
              "animate-in fade-in slide-in-from-bottom-1 duration-300",
            )}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-sm text-foreground">{event.title}</p>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(event.timestamp), "dd MMM yyyy · HH:mm")}
                </span>
              </div>
              {event.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
              )}
              {event.actor && (
                <p className="text-[10px] text-muted-foreground mt-1">by {event.actor}</p>
              )}
              {event.loanFileId && onOpenLoan && (
                <EntityButtonLink
                  label="Open linked loan"
                  className="text-xs mt-1"
                  onClick={() => onOpenLoan(event.loanFileId!)}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
