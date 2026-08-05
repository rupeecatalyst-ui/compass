"use client";

/**
 * CO-TASKS-PLANNER-003 — Enterprise Planner Workspace desk.
 * Calendar-first surface over Enterprise Task Registry (ETE SSOT).
 */

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutList,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { sameAssigneeRef } from "@/lib/enterprise-task-engine";
import type {
  EnterprisePlannerEvent,
  EnterprisePlannerSnapshot,
  PlannerViewMode,
} from "@/types/enterprise-planner";
import {
  PLANNER_AGENDA_SECTIONS,
  PLANNER_DND_MIME,
  PLANNER_SCOPE_FILTERS,
  PLANNER_VIEW_MODES,
  type PlannerCreateIntent,
  type PlannerScopeFilter,
} from "@/constants/enterprise-planner";
import { ETE_SCHEDULE_FILTERS, type EteScheduleFilterId } from "@/constants/enterprise-task-engine";
import {
  detectPlannerScheduleConflicts,
  isHighPriorityPlannerEvent,
} from "@/lib/enterprise-planner/schedule-intelligence";
import { reschedulePlannerActivity } from "@/lib/enterprise-planner/reschedule";
import {
  PlannerEventCard,
  type PlannerEventContextAction,
} from "@/components/catalyst-one/tasks/planner-event-card";
import { PlannerDateCreateMenu } from "@/components/catalyst-one/tasks/planner-date-create-menu";
import { PlannerDayActivitiesPanel } from "@/components/catalyst-one/tasks/planner-day-activities-panel";

const PLANNER_DAY_START_HOUR = 8;
const PLANNER_DAY_END_HOUR = 20;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function filterPlannerEvents(
  events: EnterprisePlannerEvent[],
  opts: {
    search: string;
    activityFilter: string;
    scheduleFilter: EteScheduleFilterId;
    scope: PlannerScopeFilter;
    userRef?: string;
  },
): EnterprisePlannerEvent[] {
  const q = opts.search.trim().toLowerCase();
  return events.filter((e) => {
    if (opts.scope === "mine" && opts.userRef) {
      // Match My Work identity rules (user: / employee: normalization).
      // Unassigned events remain visible so registry rows are never silently dropped.
      if (e.assigneeRef && !sameAssigneeRef(e.assigneeRef, opts.userRef)) return false;
    }
    if (opts.scheduleFilter === "one_time" && e.scheduleKind === "recurring") return false;
    if (opts.scheduleFilter === "recurring" && e.scheduleKind !== "recurring") return false;
    if (opts.scheduleFilter === "completed" && e.status !== "completed") return false;
    if (opts.scheduleFilter === "overdue" && e.status !== "overdue" && e.scheduleTone !== "overdue") {
      return false;
    }
    if (opts.scheduleFilter === "upcoming") {
      if (e.status === "completed" || e.status === "cancelled" || e.status === "overdue") {
        return false;
      }
    }
    if (opts.activityFilter !== "all") {
      const label = `${e.activityType} ${e.activityLabel} ${e.kind ?? ""}`.toLowerCase();
      if (opts.activityFilter === "task" && !label.includes("task") && e.source !== "ete_task") {
        /* keep ete tasks as tasks unless clearly meeting/reminder */
      }
      if (opts.activityFilter === "meeting") {
        if (
          e.activityType !== "customer_meeting" &&
          e.activityType !== "site_visit" &&
          e.source !== "meeting_registry"
        ) {
          return false;
        }
      } else if (opts.activityFilter === "reminder") {
        if (e.source !== "reminder_registry" && !label.includes("reminder")) return false;
      } else if (opts.activityFilter === "follow_up") {
        if (!label.includes("follow")) return false;
      } else if (opts.activityFilter === "task") {
        if (
          e.source === "meeting_registry" ||
          e.source === "reminder_registry" ||
          e.activityType === "customer_meeting"
        ) {
          return false;
        }
      }
    }
    if (!q) return true;
    const hay = [
      e.title,
      e.customerName,
      e.opportunityRef,
      e.activityLabel,
      e.assigneeLabel,
      e.notes,
      e.recurrenceLabel,
      e.seriesId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

type PlannerCardHandlers = {
  onSelect?: (e: EnterprisePlannerEvent) => void;
  onContextAction?: (
    event: EnterprisePlannerEvent,
    action: PlannerEventContextAction,
  ) => void;
  conflictIds: Set<string>;
};

function DropZone({
  active,
  onDropPayload,
  className,
  children,
}: {
  active: boolean;
  onDropPayload: (payload: { eventId?: string; taskId?: string }) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={cn(className, over && active && "ring-2 ring-teal-400/50 ring-inset")}
      onDragOver={(ev) => {
        if (!active) return;
        ev.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(ev) => {
        if (!active) return;
        ev.preventDefault();
        setOver(false);
        try {
          const raw =
            ev.dataTransfer.getData(PLANNER_DND_MIME) ||
            ev.dataTransfer.getData("application/x-catalyst-planner");
          if (!raw) return;
          const parsed = JSON.parse(raw) as {
            eventId?: string;
            taskId?: string;
          };
          onDropPayload(parsed);
        } catch {
          /* ignore */
        }
      }}
    >
      {children}
    </div>
  );
}

function AgendaView({
  events,
  cards,
}: {
  events: EnterprisePlannerEvent[];
  cards: PlannerCardHandlers;
}) {
  const sections = useMemo(() => {
    const now = startOfDay(new Date());
    const tomorrow = addDays(now, 1);
    const weekEnd = addDays(now, 7);
    const buckets: Record<string, EnterprisePlannerEvent[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      this_week: [],
      upcoming: [],
    };
    for (const e of events) {
      const d = startOfDay(new Date(e.startsAt));
      if (e.scheduleTone === "overdue" || e.status === "overdue" || d < now) {
        buckets.overdue!.push(e);
      } else if (dateKey(d) === dateKey(now)) {
        buckets.today!.push(e);
      } else if (dateKey(d) === dateKey(tomorrow)) {
        buckets.tomorrow!.push(e);
      } else if (d < weekEnd) {
        buckets.this_week!.push(e);
      } else {
        buckets.upcoming!.push(e);
      }
    }
    return PLANNER_AGENDA_SECTIONS.map((s) => ({
      ...s,
      events: buckets[s.id] ?? [],
    })).filter((s) => s.events.length > 0);
  }, [events]);

  if (sections.length === 0) {
    return (
      <p className="py-12 text-center text-xs text-slate-500">
        No operational work in Agenda.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <section key={section.id}>
          <h3
            className={cn(
              "mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em]",
              section.id === "overdue" && "text-rose-300",
              section.id === "today" && "text-amber-300",
              section.id === "tomorrow" && "text-orange-300",
              section.id === "this_week" && "text-sky-300",
              section.id === "upcoming" && "text-slate-400",
            )}
          >
            {section.label}
            <span className="rounded bg-white/5 px-1.5 py-0.5 tabular-nums text-[10px] text-slate-400">
              {section.events.length}
            </span>
          </h3>
          <div className="space-y-1.5">
            {section.events.map((e) => (
              <PlannerEventCard
                key={e.id}
                event={e}
                onSelect={cards.onSelect}
                onContextAction={cards.onContextAction}
                conflict={cards.conflictIds.has(e.id)}
                highlightHighPriority={isHighPriorityPlannerEvent(e)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function DayView({
  focusDate,
  events,
  cards,
  onReschedule,
  onCreateIntent,
}: {
  focusDate: Date;
  events: EnterprisePlannerEvent[];
  cards: PlannerCardHandlers;
  onReschedule: (payload: {
    eventId?: string;
    taskId?: string;
    targetDate: Date;
    targetHour?: number;
  }) => void;
  onCreateIntent: (intent: PlannerCreateIntent, date: Date) => void;
}) {
  const focus = startOfDay(focusDate);
  const key = dateKey(focus);
  const dayEvents = events.filter((e) => dateKey(new Date(e.startsAt)) === key);
  const hours = Array.from(
    { length: PLANNER_DAY_END_HOUR - PLANNER_DAY_START_HOUR },
    (_, i) => PLANNER_DAY_START_HOUR + i,
  );

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <PlannerDateCreateMenu
          dateLabel={formatDayLabel(focus)}
          onSelectIntent={(intent) => onCreateIntent(intent, focus)}
        />
      </div>
      <div className="overflow-hidden rounded-lg border border-white/10">
        {hours.map((h) => {
          const slotEvents = dayEvents.filter((e) => {
            const hour = new Date(e.startsAt).getHours();
            return hour === h || (e.allDay && h === PLANNER_DAY_START_HOUR);
          });
          return (
            <div
              key={h}
              className="grid grid-cols-[56px_1fr] border-b border-white/5 last:border-b-0"
            >
              <div className="bg-[#0a101c] px-2 py-3 text-right text-[10px] tabular-nums text-slate-500">
                {String(h).padStart(2, "0")}:00
              </div>
              <DropZone
                active
                className="min-h-[56px] space-y-1 bg-[#0b1220]/60 p-1.5"
                onDropPayload={(payload) =>
                  onReschedule({
                    ...payload,
                    targetDate: focus,
                    targetHour: h,
                  })
                }
              >
                {slotEvents.map((e) => (
                  <PlannerEventCard
                    key={e.id}
                    event={e}
                    dense
                    onSelect={cards.onSelect}
                    onContextAction={cards.onContextAction}
                    conflict={cards.conflictIds.has(e.id)}
                    highlightHighPriority={isHighPriorityPlannerEvent(e)}
                  />
                ))}
              </DropZone>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  focusDate,
  events,
  cards,
  onReschedule,
  onCreateIntent,
  onOpenDayPanel,
}: {
  focusDate: Date;
  events: EnterprisePlannerEvent[];
  cards: PlannerCardHandlers;
  onReschedule: (payload: {
    eventId?: string;
    taskId?: string;
    targetDate: Date;
  }) => void;
  onCreateIntent: (intent: PlannerCreateIntent, date: Date) => void;
  onOpenDayPanel: (date: Date, dayEvents: EnterprisePlannerEvent[]) => void;
}) {
  const focus = startOfDay(focusDate);
  const dow = focus.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = addDays(focus, mondayOffset);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const todayKey = dateKey(new Date());

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
      {days.map((d) => {
        const key = dateKey(d);
        const dayEvents = events.filter(
          (e) => dateKey(new Date(e.startsAt)) === key,
        );
        const visible = dayEvents.slice(0, 4);
        return (
          <DropZone
            key={key}
            active
            className={cn(
              "min-h-[160px] rounded-lg border border-white/10 bg-[#0b1220]/70 p-2",
              key === todayKey && "border-teal-500/40",
            )}
            onDropPayload={(payload) =>
              onReschedule({ ...payload, targetDate: d })
            }
          >
            <div className="mb-2 flex items-center justify-between gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {d.toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                })}
              </p>
              <PlannerDateCreateMenu
                dateLabel={formatDayLabel(d)}
                compact
                onSelectIntent={(intent) => onCreateIntent(intent, d)}
              />
            </div>
            <div className="space-y-1">
              {dayEvents.length === 0 ? (
                <p className="text-[10px] text-slate-600">Drop or add</p>
              ) : (
                visible.map((e) => (
                  <PlannerEventCard
                    key={e.id}
                    event={e}
                    dense
                    onSelect={cards.onSelect}
                    onContextAction={cards.onContextAction}
                    conflict={cards.conflictIds.has(e.id)}
                    highlightHighPriority={isHighPriorityPlannerEvent(e)}
                  />
                ))
              )}
              {dayEvents.length > 4 ? (
                <button
                  type="button"
                  className="w-full text-left text-[9px] font-medium text-teal-300/90 hover:text-teal-200"
                  onClick={() => onOpenDayPanel(d, dayEvents)}
                >
                  +{dayEvents.length - 4} more
                </button>
              ) : null}
            </div>
          </DropZone>
        );
      })}
    </div>
  );
}

function MonthView({
  focusDate,
  events,
  cards,
  onReschedule,
  onCreateIntent,
  onOpenDayPanel,
}: {
  focusDate: Date;
  events: EnterprisePlannerEvent[];
  cards: PlannerCardHandlers;
  onReschedule: (payload: {
    eventId?: string;
    taskId?: string;
    targetDate: Date;
  }) => void;
  onCreateIntent: (intent: PlannerCreateIntent, date: Date) => void;
  onOpenDayPanel: (date: Date, dayEvents: EnterprisePlannerEvent[]) => void;
}) {
  const focus = startOfDay(focusDate);
  const monthStart = new Date(focus.getFullYear(), focus.getMonth(), 1);
  const gridStartOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = addDays(monthStart, -gridStartOffset);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const todayKey = dateKey(new Date());
  const month = focus.getMonth();

  return (
    <div
      className="grid grid-cols-7 gap-1"
      style={{
        minHeight: "calc(100vh - 14rem)",
        gridTemplateRows: "auto repeat(6, minmax(0, 1fr))",
      }}
    >
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
        <div
          key={d}
          className="px-1 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500"
        >
          {d}
        </div>
      ))}
      {cells.map((d) => {
        const key = dateKey(d);
        const dayEvents = events.filter(
          (e) => dateKey(new Date(e.startsAt)) === key,
        );
        const inMonth = d.getMonth() === month;
        const visible = dayEvents.slice(0, 3);
        return (
          <DropZone
            key={key}
            active
            className={cn(
              "flex min-h-0 flex-col rounded-md border border-white/5 p-1",
              inMonth ? "bg-[#0b1220]/80" : "bg-[#070b14]/50 opacity-60",
              key === todayKey && "border-teal-500/50",
            )}
            onDropPayload={(payload) =>
              onReschedule({ ...payload, targetDate: d })
            }
          >
            <div className="mb-1 flex items-center justify-between gap-0.5">
              <p
                className={cn(
                  "text-[10px] tabular-nums",
                  key === todayKey ? "font-bold text-teal-300" : "text-slate-400",
                )}
              >
                {d.getDate()}
              </p>
              <PlannerDateCreateMenu
                dateLabel={formatDayLabel(d)}
                compact
                onSelectIntent={(intent) => onCreateIntent(intent, d)}
              />
            </div>
            <div className="space-y-0.5">
              {visible.map((e) => (
                <PlannerEventCard
                  key={e.id}
                  event={e}
                  dense
                  onSelect={cards.onSelect}
                  onContextAction={cards.onContextAction}
                  conflict={cards.conflictIds.has(e.id)}
                  highlightHighPriority={isHighPriorityPlannerEvent(e)}
                />
              ))}
              {dayEvents.length > 3 ? (
                <button
                  type="button"
                  className="w-full text-left text-[9px] font-medium text-teal-300/90 hover:text-teal-200"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onOpenDayPanel(d, dayEvents);
                  }}
                >
                  +{dayEvents.length - 3} more
                </button>
              ) : null}
            </div>
          </DropZone>
        );
      })}
    </div>
  );
}

export function PlannerRescheduleDialog({
  event,
  open,
  onOpenChange,
  actorRef,
  onChanged,
}: {
  event: EnterprisePlannerEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorRef: string;
  onChanged: () => void;
}) {
  const [dueLocal, setDueLocal] = useState("");

  const seed = event?.startsAt
    ? new Date(event.startsAt)
    : null;
  const defaultValue =
    seed && !Number.isNaN(seed.getTime())
      ? `${dateKey(seed)}T${String(seed.getHours()).padStart(2, "0")}:${String(seed.getMinutes()).padStart(2, "0")}`
      : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next && defaultValue) setDueLocal(defaultValue);
        onOpenChange(next);
      }}
    >
      <DialogContent className="border-white/10 bg-[#0b1220] text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule activity</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-400">
          {event?.customerName ?? event?.title ?? "Activity"} · updates Enterprise
          Task Registry
        </p>
        <Input
          type="datetime-local"
          className="h-9 border-white/10 bg-[#0a101c] text-xs text-slate-100"
          value={dueLocal || defaultValue}
          onChange={(e) => setDueLocal(e.target.value)}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-white/15 bg-transparent"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-teal-600 hover:bg-teal-500"
            onClick={() => {
              if (!event) return;
              const raw = dueLocal || defaultValue;
              if (!raw) {
                toast.error("Choose a date and time.");
                return;
              }
              const target = new Date(raw);
              const result = reschedulePlannerActivity({
                taskId: event.taskId,
                eventId: event.id,
                targetDate: target,
                targetHour: target.getHours(),
                targetMinute: target.getMinutes(),
                actorId: actorRef,
              });
              if (!result.ok) {
                toast.error(result.reason);
                return;
              }
              toast.success("Activity rescheduled.");
              onChanged();
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TasksPlannerDesk({
  snapshot,
  actorRef,
  userRef,
  canManageTeam = false,
  onViewModeChange,
  onFocusDateChange,
  onSelectEvent,
  onCreateIntent,
  onContextAction,
  onChanged,
}: {
  snapshot: EnterprisePlannerSnapshot;
  actorRef: string;
  userRef?: string;
  canManageTeam?: boolean;
  onViewModeChange: (mode: PlannerViewMode) => void;
  onFocusDateChange: (focusDate: string) => void;
  onSelectEvent?: (e: EnterprisePlannerEvent) => void;
  onCreateIntent: (intent: PlannerCreateIntent, dueOn: string) => void;
  onContextAction: (
    event: EnterprisePlannerEvent,
    action: PlannerEventContextAction,
  ) => void;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [scheduleFilter, setScheduleFilter] = useState<EteScheduleFilterId>("all");
  const [scope, setScope] = useState<PlannerScopeFilter>(canManageTeam ? "team" : "mine");
  const [dayPanel, setDayPanel] = useState<{
    open: boolean;
    date: Date;
    events: EnterprisePlannerEvent[];
  }>({ open: false, date: new Date(), events: [] });

  const focus = startOfDay(new Date(snapshot.focusDate));
  const filteredEvents = useMemo(
    () =>
      filterPlannerEvents(snapshot.events, {
        search,
        activityFilter,
        scheduleFilter,
        scope: canManageTeam ? scope : "mine",
        userRef,
      }),
    [snapshot.events, search, activityFilter, scheduleFilter, scope, canManageTeam, userRef],
  );

  const conflictMap = useMemo(
    () => detectPlannerScheduleConflicts(filteredEvents),
    [filteredEvents],
  );
  const conflictIds = useMemo(
    () => new Set(conflictMap.keys()),
    [conflictMap],
  );

  const cards: PlannerCardHandlers = {
    onSelect: onSelectEvent,
    onContextAction,
    conflictIds,
  };

  const overdueCount = filteredEvents.filter(
    (e) => e.scheduleTone === "overdue" || e.status === "overdue",
  ).length;
  const conflictCount = conflictIds.size;
  const highPriorityCount = filteredEvents.filter((e) =>
    isHighPriorityPlannerEvent(e),
  ).length;

  const shift = (days: number) => {
    const next = addDays(focus, days);
    startTransition(() => onFocusDateChange(next.toISOString()));
  };

  const goToday = () => {
    startTransition(() => onFocusDateChange(new Date().toISOString()));
  };

  const handleCreate = (intent: PlannerCreateIntent, date: Date) => {
    onCreateIntent(intent, dateKey(date));
  };

  const openDayPanel = (date: Date, events: EnterprisePlannerEvent[]) => {
    setDayPanel({ open: true, date, events });
  };

  const handleRescheduleDrop = (payload: {
    eventId?: string;
    taskId?: string;
    targetDate: Date;
    targetHour?: number;
  }) => {
    const result = reschedulePlannerActivity({
      taskId: payload.taskId,
      eventId: payload.eventId,
      targetDate: payload.targetDate,
      targetHour: payload.targetHour,
      actorId: actorRef,
    });
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    toast.success("Activity moved.");
    onChanged();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-[#0b1220]/90 px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 border-white/15 bg-transparent px-2 text-[11px] text-slate-200"
            onClick={goToday}
            disabled={pending}
          >
            Today
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-slate-300"
            onClick={() => shift(snapshot.viewMode === "month" ? -28 : -7)}
            disabled={pending}
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-slate-300"
            onClick={() => shift(snapshot.viewMode === "month" ? 28 : 7)}
            disabled={pending}
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <p className="min-w-[9rem] text-sm font-semibold tracking-tight text-slate-100">
          {focus.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
            ...(snapshot.viewMode === "day" || snapshot.viewMode === "agenda"
              ? { day: "numeric" }
              : {}),
          })}
        </p>

        <div className="relative min-w-[10rem] max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search planner…"
            className="h-7 border-white/10 bg-[#0a101c] pl-7 text-[11px] text-slate-100 placeholder:text-slate-500"
          />
        </div>

        <Select value={activityFilter} onValueChange={setActivityFilter}>
          <SelectTrigger className="h-7 w-[8.5rem] border-white/10 bg-[#0a101c] text-[11px] text-slate-200">
            <Filter className="mr-1 h-3 w-3 text-slate-500" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All activities</SelectItem>
            <SelectItem value="task">Tasks</SelectItem>
            <SelectItem value="meeting">Meetings</SelectItem>
            <SelectItem value="follow_up">Follow-ups</SelectItem>
            <SelectItem value="reminder">Reminders</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={scheduleFilter}
          onValueChange={(v) => setScheduleFilter(v as EteScheduleFilterId)}
        >
          <SelectTrigger className="h-7 w-[8.5rem] border-white/10 bg-[#0a101c] text-[11px] text-slate-200">
            <SelectValue placeholder="Schedule" />
          </SelectTrigger>
          <SelectContent>
            {ETE_SCHEDULE_FILTERS.map((f) => (
              <SelectItem key={f.id} value={f.id} className="text-xs">
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-0.5 rounded-md border border-white/10 bg-[#0a101c] p-0.5">
          {PLANNER_SCOPE_FILTERS.filter((s) => s.id === "mine" || canManageTeam).map(
            (s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScope(s.id)}
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded px-2 text-[10px] font-medium",
                  scope === s.id
                    ? "bg-teal-500/20 text-teal-100"
                    : "text-slate-400 hover:text-slate-200",
                )}
              >
                {s.id === "team" ? (
                  <Users className="h-3 w-3" />
                ) : (
                  <LayoutList className="h-3 w-3" />
                )}
                {s.label}
              </button>
            ),
          )}
        </div>

        <div className="ml-auto flex flex-wrap gap-0.5">
          {PLANNER_VIEW_MODES.map((m) => (
            <Button
              key={m.id}
              type="button"
              size="sm"
              variant={snapshot.viewMode === m.id ? "default" : "ghost"}
              className={cn(
                "h-7 px-2 text-[11px]",
                snapshot.viewMode === m.id
                  ? "bg-teal-600 text-white hover:bg-teal-500"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
              onClick={() => onViewModeChange(m.id)}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      {(overdueCount > 0 || conflictCount > 0 || highPriorityCount > 0) && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-violet-500/25 bg-violet-500/10 px-2.5 py-1.5 text-[11px] text-violet-100">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-300" />
          <span className="font-semibold tracking-wide text-violet-200">
            CHANAKYA
          </span>
          {overdueCount > 0 ? (
            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-rose-200">
              {overdueCount} overdue
            </span>
          ) : null}
          {conflictCount > 0 ? (
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-100">
              {conflictCount} schedule conflict
              {conflictCount === 1 ? "" : "s"}
            </span>
          ) : null}
          {highPriorityCount > 0 ? (
            <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-orange-100">
              {highPriorityCount} high-priority
            </span>
          ) : null}
          <span className="text-violet-200/80">
            Right-click or long-press an activity for quick actions.
          </span>
        </div>
      )}

      {snapshot.viewMode === "agenda" ? (
        <div className="space-y-2">
          <div className="flex justify-end">
            <PlannerDateCreateMenu
              dateLabel={formatDayLabel(focus)}
              onSelectIntent={(intent) => handleCreate(intent, focus)}
            />
          </div>
          <AgendaView events={filteredEvents} cards={cards} />
        </div>
      ) : null}
      {snapshot.viewMode === "day" ? (
        <DayView
          focusDate={focus}
          events={filteredEvents}
          cards={cards}
          onReschedule={handleRescheduleDrop}
          onCreateIntent={handleCreate}
        />
      ) : null}
      {snapshot.viewMode === "week" ? (
        <WeekView
          focusDate={focus}
          events={filteredEvents}
          cards={cards}
          onReschedule={handleRescheduleDrop}
          onCreateIntent={handleCreate}
          onOpenDayPanel={openDayPanel}
        />
      ) : null}
      {snapshot.viewMode === "month" ? (
        <MonthView
          focusDate={focus}
          events={filteredEvents}
          cards={cards}
          onReschedule={handleRescheduleDrop}
          onCreateIntent={handleCreate}
          onOpenDayPanel={openDayPanel}
        />
      ) : null}

      <PlannerDayActivitiesPanel
        open={dayPanel.open}
        onOpenChange={(open) => setDayPanel((s) => ({ ...s, open }))}
        dateLabel={formatDayLabel(dayPanel.date)}
        events={dayPanel.events}
        onSelect={onSelectEvent}
        onContextAction={onContextAction}
        conflictIds={conflictIds}
      />
    </div>
  );
}
