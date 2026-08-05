"use client";

/**
 * CO-TASKS-PLANNER-003 — Day capacity panel (+N more → all activities).
 */

import type { EnterprisePlannerEvent } from "@/types/enterprise-planner";
import {
  PlannerEventCard,
  type PlannerEventContextAction,
} from "@/components/catalyst-one/tasks/planner-event-card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function PlannerDayActivitiesPanel({
  open,
  onOpenChange,
  dateLabel,
  events,
  onSelect,
  onContextAction,
  conflictIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateLabel: string;
  events: EnterprisePlannerEvent[];
  onSelect?: (event: EnterprisePlannerEvent) => void;
  onContextAction?: (
    event: EnterprisePlannerEvent,
    action: PlannerEventContextAction,
  ) => void;
  conflictIds?: Set<string>;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-white/10 bg-[#0b1220] p-0 text-slate-100 sm:max-w-md"
      >
        <SheetHeader className="space-y-1 border-b border-white/10 px-5 py-4 text-left">
          <SheetTitle className="text-base text-slate-50">{dateLabel}</SheetTitle>
          <SheetDescription className="text-xs text-slate-400">
            {events.length} activit{events.length === 1 ? "y" : "ies"} ·{" "}
            Enterprise Task Registry
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {events.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              No activities on this day.
            </p>
          ) : (
            events.map((e) => (
              <PlannerEventCard
                key={e.id}
                event={e}
                onSelect={onSelect}
                onContextAction={onContextAction}
                conflict={conflictIds?.has(e.id)}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
