/**
 * CO-TASKS-PLANNER-002 — Derive CHANAKYA LIVE ticker items from Planner / ETE events.
 * Presentation only — no second task store; no invented business facts.
 */

import type { EnterprisePlannerEvent } from "@/types/enterprise-planner";

export type PlannerChanakyaLiveItem = {
  id: string;
  /** Primary identity line (customer / lender / subject) */
  subject: string;
  /** Operational attention line */
  attention: string;
  priority: "critical" | "action" | "info";
};

function daysOverdue(startsAt: string, now: Date): number {
  const due = new Date(startsAt);
  due.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((today.getTime() - due.getTime()) / 86_400_000));
}

function subjectOf(event: EnterprisePlannerEvent): string {
  return (
    event.customerName?.trim() ||
    event.entityLabel?.trim() ||
    event.opportunityRef?.trim() ||
    event.title.trim() ||
    "Activity"
  );
}

function attentionFor(event: EnterprisePlannerEvent, now: Date): string {
  const time = event.timeLabel;
  const activity = event.activityLabel;

  if (event.scheduleTone === "overdue") {
    const n = daysOverdue(event.startsAt, now);
    if (event.activityType === "document_collection") {
      return `Documents pending — overdue by ${n} day${n === 1 ? "" : "s"}`;
    }
    if (event.activityType === "sanction_follow_up" || event.activityType === "bank_follow_up") {
      return `Follow-up overdue by ${n} day${n === 1 ? "" : "s"}`;
    }
    return `${activity} overdue by ${n} day${n === 1 ? "" : "s"}`;
  }

  if (event.scheduleTone === "due_today") {
    if (event.activityType === "customer_meeting" || event.activityType === "customer_call") {
      return `Customer meeting today at ${time}`;
    }
    if (event.activityType === "document_collection") {
      return `Document collection due today · ${time}`;
    }
    if (event.activityType === "site_visit") {
      return `Site visit today at ${time}`;
    }
    return `${activity} today at ${time}`;
  }

  if (event.scheduleTone === "due_tomorrow") {
    return `${activity} tomorrow at ${time}`;
  }

  if (event.activityType === "sanction_follow_up") {
    return `Awaiting sanction response · ${event.dueDateLabel}`;
  }
  if (event.activityType === "document_collection") {
    return `Upload / collect documents · due ${event.dueDateLabel}`;
  }
  if (event.activityType === "disbursement") {
    return `Disbursement coordination · ${event.dueDateLabel}`;
  }
  if (event.activityType === "bank_follow_up") {
    return `Bank follow-up · ${event.dueDateLabel}`;
  }

  return `${activity} · ${event.dueDateLabel} · ${time}`;
}

function priorityOf(event: EnterprisePlannerEvent): PlannerChanakyaLiveItem["priority"] {
  if (event.scheduleTone === "overdue" || event.priority === "critical") return "critical";
  if (event.scheduleTone === "due_today" || event.priority === "high") return "action";
  return "info";
}

/**
 * Build scrolling CHANAKYA LIVE items from open planner events.
 * Priority: overdue → due today → tomorrow → upcoming (cap 12).
 */
export function buildPlannerChanakyaLiveItems(
  events: EnterprisePlannerEvent[],
  nowInput?: Date,
): PlannerChanakyaLiveItem[] {
  const now = nowInput ?? new Date();
  const open = events.filter(
    (e) => e.scheduleTone !== "completed" && e.scheduleTone !== "cancelled",
  );

  const rank = (e: EnterprisePlannerEvent) => {
    if (e.scheduleTone === "overdue") return 0;
    if (e.scheduleTone === "due_today") return 1;
    if (e.scheduleTone === "due_tomorrow") return 2;
    if (e.priority === "critical") return 3;
    if (e.priority === "high") return 4;
    return 5;
  };

  return [...open]
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
    .slice(0, 12)
    .map((e) => ({
      id: e.id,
      subject: subjectOf(e),
      attention: attentionFor(e, now),
      priority: priorityOf(e),
    }));
}
