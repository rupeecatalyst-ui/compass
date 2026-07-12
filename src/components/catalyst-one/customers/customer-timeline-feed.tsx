"use client";

import { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
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

type TimelineFilter = "all" | CustomerTimelineEvent["type"];

const FILTERS: TimelineFilter[] = [
  "all",
  "call",
  "email",
  "meeting",
  "stage_move",
  "note",
  "task",
  "document",
];

interface CustomerTimelineFeedProps {
  events: CustomerTimelineEvent[];
  onOpenLoan?: (fileId: string) => void;
  limit?: number;
  showFilters?: boolean;
}

export function CustomerTimelineFeed({
  events,
  onOpenLoan,
  limit,
  showFilters = false,
}: CustomerTimelineFeedProps) {
  const [filter, setFilter] = useState<TimelineFilter>("all");

  const filtered = useMemo(() => {
    const base = filter === "all" ? events : events.filter((e) => e.type === filter);
    return limit ? base.slice(0, limit) : base;
  }, [events, filter, limit]);

  return (
    <div className="space-y-3">
      {showFilters && (
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              className="h-7 text-xs capitalize"
              onClick={() => setFilter(f)}
            >
              {f === "stage_move" ? "Stage" : f}
            </Button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
      ) : (
        filtered.map((event, i) => {
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
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(event.timestamp), "dd MMM yyyy · HH:mm")}
                  </span>
                </div>
                {event.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{event.description}</p>
                )}
                {event.actor && (
                  <p className="mt-1 text-[10px] text-muted-foreground">by {event.actor}</p>
                )}
                {event.loanFileId && onOpenLoan && (
                  <EntityButtonLink
                    label="Open linked loan"
                    className="mt-1 text-xs"
                    onClick={() => onOpenLoan(event.loanFileId!)}
                  />
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
