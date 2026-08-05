/**
 * CO-TASKS-PLANNER-003 — CHANAKYA schedule intelligence for Planner cards.
 */

import type { EnterprisePlannerEvent } from "@/types/enterprise-planner";

export type PlannerScheduleConflict = {
  eventId: string;
  conflictingWithId: string;
  reason: string;
};

function sameDayHour(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate() &&
    da.getHours() === db.getHours()
  );
}

/**
 * Detect double-bookings (same assignee, same day+hour) among open events.
 */
export function detectPlannerScheduleConflicts(
  events: EnterprisePlannerEvent[],
): Map<string, PlannerScheduleConflict> {
  const open = events.filter(
    (e) => e.scheduleTone !== "completed" && e.scheduleTone !== "cancelled",
  );
  const map = new Map<string, PlannerScheduleConflict>();

  for (let i = 0; i < open.length; i++) {
    for (let j = i + 1; j < open.length; j++) {
      const a = open[i]!;
      const b = open[j]!;
      const sameAssignee =
        Boolean(a.assigneeRef) && a.assigneeRef === b.assigneeRef;
      if (!sameAssignee) continue;
      if (!sameDayHour(a.startsAt, b.startsAt)) continue;
      const reason = `Double booking · ${a.timeLabel}`;
      map.set(a.id, {
        eventId: a.id,
        conflictingWithId: b.id,
        reason,
      });
      map.set(b.id, {
        eventId: b.id,
        conflictingWithId: a.id,
        reason,
      });
    }
  }
  return map;
}

export function isHighPriorityPlannerEvent(event: EnterprisePlannerEvent): boolean {
  return event.priority === "critical" || event.priority === "high";
}
