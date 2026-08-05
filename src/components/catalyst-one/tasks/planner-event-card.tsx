"use client";

/**
 * CO-TASKS-PLANNER-003 — Operational event card + context actions.
 */

import { useRef, useState } from "react";
import { PLANNER_DND_MIME, PLANNER_SCHEDULE_TONE_META } from "@/constants/enterprise-planner";
import type { EnterprisePlannerEvent } from "@/types/enterprise-planner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const PRIORITY_CLASS: Record<string, string> = {
  critical: "text-rose-300",
  high: "text-orange-300",
  medium: "text-amber-200",
  low: "text-slate-400",
};

export type PlannerEventContextAction =
  | "complete"
  | "reschedule"
  | "reassign"
  | "edit"
  | "open_deal"
  | "open_customer"
  | "delete"
  | "preview";

export function PlannerEventCard({
  event,
  dense,
  onSelect,
  onContextAction,
  draggable = true,
  conflict,
  highlightHighPriority,
}: {
  event: EnterprisePlannerEvent;
  dense?: boolean;
  onSelect?: (event: EnterprisePlannerEvent) => void;
  onContextAction?: (event: EnterprisePlannerEvent, action: PlannerEventContextAction) => void;
  draggable?: boolean;
  conflict?: boolean;
  highlightHighPriority?: boolean;
}) {
  const tone = PLANNER_SCHEDULE_TONE_META[event.scheduleTone];
  const canDrag = draggable && event.canReschedule;
  const customer = event.customerName?.trim() || event.title;
  const [menuOpen, setMenuOpen] = useState(false);
  const longPressTimer = useRef<number | null>(null);

  const fire = (action: PlannerEventContextAction) => {
    onContextAction?.(event, action);
    setMenuOpen(false);
  };

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          draggable={canDrag}
          onDragStart={(e) => {
            if (!canDrag) {
              e.preventDefault();
              return;
            }
            e.dataTransfer.setData(
              PLANNER_DND_MIME,
              JSON.stringify({
                eventId: event.id,
                taskId: event.taskId,
              }),
            );
            e.dataTransfer.effectAllowed = "move";
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(event);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen(true);
          }}
          onTouchStart={() => {
            longPressTimer.current = window.setTimeout(() => setMenuOpen(true), 520);
          }}
          onTouchEnd={() => {
            if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
          }}
          onTouchMove={() => {
            if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
          }}
          className={cn(
            "w-full rounded-md border text-left transition",
            tone.cardClass,
            dense ? "px-2 py-1.5" : "px-2.5 py-2",
            canDrag && "cursor-grab active:cursor-grabbing",
            !event.canReschedule && "cursor-pointer",
            conflict && "ring-1 ring-rose-400/70",
            highlightHighPriority && !conflict && "ring-1 ring-amber-400/50",
          )}
          title={
            event.canReschedule
              ? "Drag to reschedule · Click preview · Right-click actions"
              : (event.rescheduleBlockReason ?? "Click for preview · Right-click actions")
          }
        >
          <div className="flex items-start justify-between gap-2">
            <p className={cn("min-w-0 font-semibold leading-snug", dense ? "text-[11px]" : "text-xs")}>
              {customer}
            </p>
            <span
              className={cn(
                "shrink-0 rounded px-1 py-0.5 text-[9px] font-medium",
                tone.chipClass,
              )}
            >
              {tone.swatch}
            </span>
          </div>

          <p className={cn("mt-0.5 text-white/80", dense ? "text-[9px]" : "text-[10px]")}>
            <span aria-hidden>{event.activityIcon}</span> {event.activityLabel}
            {event.scheduleKind === "recurring" ? (
              <span className="text-teal-200/90">
                {" "}
                · Recurring
                {event.occurrenceNumber ? ` #${event.occurrenceNumber}` : ""}
              </span>
            ) : null}
            {event.opportunityRef ? (
              <span className="text-white/60"> · {event.opportunityRef}</span>
            ) : null}
          </p>

          {dense ? (
            <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-[9px] text-white/65">
              <span>{event.timeLabel}</span>
              {event.priority ? (
                <span className={PRIORITY_CLASS[event.priority] ?? ""}>{event.priority}</span>
              ) : null}
              {conflict ? <span className="text-rose-300">· conflict</span> : null}
            </p>
          ) : (
            <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-white/70">
              <div className="flex gap-1">
                <dt className="text-white/45">Time</dt>
                <dd>{event.timeLabel}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="text-white/45">Priority</dt>
                <dd className={PRIORITY_CLASS[event.priority ?? ""] ?? ""}>
                  {event.priority ?? "—"}
                </dd>
              </div>
              <div className="flex gap-1">
                <dt className="text-white/45">Due</dt>
                <dd>{event.dueDateLabel}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="text-white/45">Executive</dt>
                <dd className="truncate">{event.assigneeLabel}</dd>
              </div>
            </dl>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-48 border-white/10 bg-[#0b1220] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem className="text-xs" onSelect={() => fire("preview")}>
          Open preview
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-xs"
          disabled={!event.taskId || event.scheduleTone === "completed"}
          onSelect={() => fire("complete")}
        >
          Mark Complete
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-xs"
          disabled={!event.canReschedule}
          onSelect={() => fire("reschedule")}
        >
          Reschedule
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-xs"
          disabled={!event.taskId}
          onSelect={() => fire("reassign")}
        >
          Reassign
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs" disabled={!event.taskId} onSelect={() => fire("edit")}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          className="text-xs"
          disabled={!event.opportunityId && !event.opportunityRef}
          onSelect={() => fire("open_deal")}
        >
          Open Deal / Opportunity
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-xs"
          disabled={!event.contactId && !event.customerName}
          onSelect={() => fire("open_customer")}
        >
          Open Customer
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          className="text-xs text-rose-300 focus:text-rose-200"
          disabled={!event.taskId}
          onSelect={() => fire("delete")}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
