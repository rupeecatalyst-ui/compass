"use client";

/**
 * CO-TASKS-PLANNER-001A — Quick preview for planner events.
 */

import Link from "next/link";
import { CalendarClock, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PLANNER_SCHEDULE_TONE_META } from "@/constants/enterprise-planner";
import { ROUTES } from "@/constants/routes";
import { completeEteTask } from "@/lib/enterprise-task-engine";
import type { EnterprisePlannerEvent } from "@/types/enterprise-planner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 text-xs">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-100">{value?.trim() || "—"}</dd>
    </div>
  );
}

export function PlannerEventPreview({
  event,
  open,
  onOpenChange,
  actorRef,
  onChanged,
  onRequestReschedule,
}: {
  event: EnterprisePlannerEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorRef: string;
  onChanged: () => void;
  onRequestReschedule: (event: EnterprisePlannerEvent) => void;
}) {
  if (!event) return null;
  const tone = PLANNER_SCHEDULE_TONE_META[event.scheduleTone];

  const opportunityHref = event.opportunityId
    ? `${ROUTES.OPPORTUNITY_WORKSPACE}?opportunityId=${encodeURIComponent(event.opportunityId)}`
    : null;
  const customerHref = event.contactId
    ? `${ROUTES.CONTACTS}?contactId=${encodeURIComponent(event.contactId)}`
    : event.customerName
      ? `${ROUTES.CONTACTS}?q=${encodeURIComponent(event.customerName)}`
      : null;

  const complete = () => {
    if (!event.taskId) {
      toast.error("This activity is not linked to the Enterprise Task Registry.");
      return;
    }
    try {
      completeEteTask(event.taskId, actorRef);
      toast.success("Activity completed.");
      onChanged();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete activity.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-white/10 bg-[#0b1220] p-0 text-slate-100 sm:max-w-md"
      >
        <SheetHeader className="space-y-2 border-b border-white/10 px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>
              {event.activityIcon}
            </span>
            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", tone.chipClass)}>
              {tone.swatch} {tone.label}
            </span>
            {event.priority ? (
              <span className="text-[10px] uppercase tracking-wide text-slate-400">
                {event.priority}
              </span>
            ) : null}
          </div>
          <SheetTitle className="text-base text-slate-50">
            {event.customerName ?? event.title}
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-400">
            {event.activityLabel}
            {event.opportunityRef ? ` · ${event.opportunityRef}` : ""}
          </SheetDescription>
        </SheetHeader>

        <dl className="space-y-2.5 px-5 py-4">
          <Row label="Customer" value={event.customerName} />
          <Row label="Opportunity" value={event.opportunityRef} />
          <Row label="Activity" value={`${event.activityIcon} ${event.activityLabel}`} />
          <Row label="Notes" value={event.notes} />
          <Row label="Due Date" value={`${event.dueDateLabel} · ${event.timeLabel}`} />
          <Row label="Assigned To" value={event.assigneeLabel} />
          <Row label="Status" value={tone.label} />
          {event.source === "ete_task" ? (
            <Row label="Registry" value="Enterprise Task Registry" />
          ) : null}
        </dl>

        <div className="mt-auto space-y-2 border-t border-white/10 px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            {opportunityHref ? (
              <Button asChild size="sm" variant="secondary" className="h-9 text-xs">
                <Link href={opportunityHref}>
                  <ExternalLink className="mr-1.5 size-3.5" />
                  Open Opportunity
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="secondary" className="h-9 text-xs" disabled>
                Open Opportunity
              </Button>
            )}
            {customerHref ? (
              <Button asChild size="sm" variant="secondary" className="h-9 text-xs">
                <Link href={customerHref}>
                  <ExternalLink className="mr-1.5 size-3.5" />
                  Open Customer
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="secondary" className="h-9 text-xs" disabled>
                Open Customer
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 bg-teal-600 text-xs text-white hover:bg-teal-500"
              disabled={!event.taskId || event.scheduleTone === "completed"}
              onClick={complete}
            >
              <Check className="mr-1.5 size-3.5" />
              Complete Activity
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 border-white/15 bg-transparent text-xs text-slate-100 hover:bg-white/5"
              disabled={!event.canReschedule}
              title={event.rescheduleBlockReason}
              onClick={() => onRequestReschedule(event)}
            >
              <CalendarClock className="mr-1.5 size-3.5" />
              Reschedule
            </Button>
          </div>
          {!event.canReschedule && event.rescheduleBlockReason ? (
            <p className="text-[10px] text-amber-300/90">{event.rescheduleBlockReason}</p>
          ) : (
            <p className="text-[10px] text-slate-500">
              Drag onto a day or time slot to reschedule · updates Enterprise Task Registry
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
