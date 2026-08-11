/**
 * CO-RADAR-003 — Enterprise Deal Activity Timeline → LoanFile timeline projection.
 *
 * Operational activity SSOT for Radar / Activity Intelligence:
 * `EnterpriseDealTimelineEvent` (append-only Deal Timeline Registry).
 *
 * Does NOT change Radar scoring, Health formula, or thresholds.
 * Maps enterprise events into LoanFileTimelineEvent shapes that
 * CHANAKYA meaningful-work pattern matching can recognise.
 */

import type { LoanFileTimelineEvent } from "@/types/catalyst-one";

/** Serialized Deal Timeline event (API / service shape). */
export type EnterpriseDealActivityTimelineEvent = {
  id: string;
  dealId: string;
  eventType: string;
  occurredAt: string;
  summary: string;
  actorUserId?: string | null;
  payload?: unknown;
  createdAt?: string;
};

/** Event types that are not operational work for Activity Intelligence. */
const NON_OPERATIONAL_EVENT_TYPES = new Set([
  "soft_deleted",
  "archived",
]);

/**
 * Human titles that include Radar meaningful-work match patterns
 * (see CHANAKYA_RADAR_MEANINGFUL_WORK_ACTIVITIES).
 */
const EVENT_TYPE_TITLE: Record<string, string> = {
  deal_created: "Deal created — workflow stage started",
  stage_transition: "Workflow stage changed",
  // Intentional: plain updates must not inflate Activity Intelligence as meaningful work
  deal_updated: "Deal record updated",
  restored: "Deal restored — workflow stage resumed",
  counterparty_assigned: "Lender pipeline updated — counterparty assigned",
  counterparty_updated: "Lender pipeline updated — counterparty updated",
  counterparty_removed: "Lender pipeline updated — counterparty removed",
  document_attached: "Document uploaded",
  document_status_changed: "Document approved — status changed",
  task_created: "Task activity — task created",
  task_updated: "Task completed — task updated",
  activity_recorded: "Follow-up logged — activity recorded",
  activity_updated: "Follow-up logged — activity updated",
  note_added: "Note added — internal note",
  communication_sent: "Communication sent",
  contacted: "Customer meeting logged — contacted",
  approval_completed: "Approval completed",
};

function titleForEvent(event: EnterpriseDealActivityTimelineEvent): string {
  const typed = EVENT_TYPE_TITLE[event.eventType];
  const summary = (event.summary || "").trim();
  if (event.eventType === "stage_transition" && summary) {
    // Keep "Stage X → Y" text (matches stage / soft approved / final approved patterns)
    return `Workflow stage changed — ${summary}`;
  }
  if (typed && summary) return `${typed} — ${summary}`;
  if (typed) return typed;
  if (summary) return summary;
  return `Operational work — ${event.eventType}`;
}

/**
 * Project Enterprise Deal Timeline events → LoanFile timeline (newest first).
 */
export function mapEnterpriseDealActivityTimelineToLoanFileEvents(
  events: EnterpriseDealActivityTimelineEvent[],
): LoanFileTimelineEvent[] {
  return events
    .filter((e) => e && !NON_OPERATIONAL_EVENT_TYPES.has(e.eventType))
    .map((e) => ({
      id: e.id,
      title: titleForEvent(e),
      description: e.summary || e.eventType,
      timestamp: e.occurredAt,
      completed: true,
    }))
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
}

/**
 * Merge enterprise timeline with any local timeline marks (daily work / legacy),
 * preferring enterprise events; append unique local entries by id.
 */
export function mergeLoanFileTimelines(
  enterprise: LoanFileTimelineEvent[],
  local?: LoanFileTimelineEvent[] | null,
): LoanFileTimelineEvent[] {
  if (!local?.length) return enterprise;
  if (!enterprise.length) return [...local].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const seen = new Set(enterprise.map((e) => e.id));
  const merged = [...enterprise];
  for (const ev of local) {
    if (!ev?.id || seen.has(ev.id)) continue;
    seen.add(ev.id);
    merged.push(ev);
  }
  return merged.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}
