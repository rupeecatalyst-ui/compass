/**
 * CO-C1-DIALOGUE-002 / 002A — Unified Transaction Activity Timeline projection.
 * Reads EAR (EnterpriseActivityEvent) only — no new chronology store.
 */

import { listEnterpriseActivity } from "@/lib/enterprise-activity-registry/api-client";
import { subscribeEarUpdated } from "@/lib/enterprise-activity-registry/session-registry";
import { composeDetailedTimelineRow } from "@/lib/enterprise-activity-registry/detailed-timeline";
import type { EnterpriseActivityEvent } from "@/types/enterprise-activity-registry";
import { stickyNoteMustNotEnterSharedActivity } from "@/lib/sticky-notes/owner-scope";

/** Presentation categories (mapped from existing EAR kinds — not new producers). */
export type TransactionTimelineCategory =
  | "note"
  | "activity"
  | "stage_change"
  | "document"
  | "task"
  | "lender"
  | "approval"
  | "disbursement"
  | "incoming_email"
  | "system";

export type TransactionTimelineFilterId =
  | "all"
  | "activities"
  | "notes"
  | "documents"
  | "tasks"
  | "stage_changes"
  | "communications"
  | "system";

export type TransactionTimelineItem = {
  id: string;
  occurredAt: string;
  category: TransactionTimelineCategory;
  categoryLabel: string;
  title: string;
  description: string;
  actorLabel: string;
  entityLabel: string;
  previousValue: string | null;
  newValue: string | null;
  opportunityId: string | null;
  dealId: string | null;
  sourceSystem: string;
  eventKind: string;
  payload: Record<string, unknown> | null;
  /** Inbound email ledger id when this row is an email_received event. */
  inboundEmailId: string | null;
  needsAttention: boolean;
};

export type TransactionTimelineScope =
  | { mode: "global" }
  | { mode: "opportunity"; opportunityId: string }
  | { mode: "deal"; dealId: string; opportunityId?: string | null }
  | { mode: "contact"; contactId: string }
  | { mode: "contact_graph"; contactId: string; opportunityIds: string[]; dealIds: string[] }
  | { mode: "lender"; dealIds: string[]; opportunityIds?: string[] };

const CATEGORY_LABELS: Record<TransactionTimelineCategory, string> = {
  note: "NOTE",
  activity: "ACTIVITY",
  stage_change: "STAGE CHANGE",
  document: "DOCUMENT",
  task: "TASK",
  lender: "LENDER",
  approval: "APPROVAL",
  disbursement: "DISBURSEMENT",
  incoming_email: "INCOMING EMAIL",
  system: "SYSTEM",
};

export const TRANSACTION_TIMELINE_FILTERS: ReadonlyArray<{
  id: TransactionTimelineFilterId;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "communications", label: "Communications" },
  { id: "activities", label: "Activities" },
  { id: "notes", label: "Notes" },
  { id: "documents", label: "Documents" },
  { id: "tasks", label: "Tasks" },
  { id: "stage_changes", label: "Stage Changes" },
  { id: "system", label: "System Events" },
];

/** Low-value / advisory telemetry — keep in EAR but hide from operational timeline. */
const NOISE_KINDS = new Set(["chanakya", "mission_control"]);
const NOISE_SOURCES = new Set(["chanakya", "mission_control"]);
const NOISE_TITLE_RE =
  /\b(hydrate|heartbeat|ping|debug|shadow|telemetry|radar vector|ops pulse)\b/i;

function asRecord(payload: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return payload && typeof payload === "object" ? payload : {};
}

function stringField(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = payload[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/**
 * CO-C1-DIALOGUE-002A — Operational relevance gate.
 * Suppresses low-value technical events while preserving notes, stages, docs, tasks, deals.
 */
export function isOperationalTimelineEvent(event: EnterpriseActivityEvent): boolean {
  const kind = (event.eventKind || "").toLowerCase();
  const source = (event.sourceSystem || "").toLowerCase();
  const title = (event.title || "").trim();
  if (!title) return false;
  if (NOISE_KINDS.has(kind) || NOISE_SOURCES.has(source)) return false;
  if (stickyNoteMustNotEnterSharedActivity(event.sourceSystem)) return false;
  if (NOISE_TITLE_RE.test(title) || NOISE_TITLE_RE.test(event.summary || "")) return false;
  return true;
}

export function classifyEarEvent(
  event: EnterpriseActivityEvent,
): TransactionTimelineCategory {
  const kind = (event.eventKind || "").toLowerCase();
  const source = (event.sourceSystem || "").toLowerCase();
  const title = `${event.title || ""} ${event.summary || ""}`.toLowerCase();
  const payload = asRecord(event.payload);

  if (
    source === "inbound_email" ||
    stringField(payload, ["kind", "eventType"]) === "email_received"
  ) {
    return "incoming_email";
  }

  if (title.includes("disburs") || kind.includes("disburs")) return "disbursement";
  if (title.includes("approv") || stringField(payload, ["approvalStatus"])) return "approval";

  if (kind === "notes" || source === "business_notes") return "note";
  if (kind === "dialogue" && source === "ecie") return "activity";
  if (kind === "dialogue") return "activity";
  if (kind === "communications" || source === "ecie") return "activity";
  if (kind === "stage_change") return "stage_change";
  if (kind === "documents" || source === "document" || source === "document_request") {
    return "document";
  }
  if (kind === "tasks" || source === "ete") return "task";
  if (
    source === "deal_timeline" ||
    source === "deal_activity" ||
    title.includes("lender")
  ) {
    if (kind === "stage_change") return "stage_change";
    return "lender";
  }
  if (kind === "workflow" || kind === "opportunity" || kind === "chanakya" || kind === "mission_control") {
    return "system";
  }
  return "system";
}

function resolveEntityLabel(
  event: EnterpriseActivityEvent,
  scope?: TransactionTimelineScope,
): string {
  if (scope?.mode === "deal") {
    if (event.dealId && event.dealId === scope.dealId) return "This Deal";
    if (!event.dealId && event.opportunityId) return "Opportunity";
  }
  if (event.dealId) return "Deal";
  if (event.opportunityId) return "Opportunity";
  if (event.documentId) return "Document";
  if (event.taskId) return "Task";
  if (event.contactId) return "Contact";
  return "Enterprise";
}

function resolveStagePair(event: EnterpriseActivityEvent): {
  previousValue: string | null;
  newValue: string | null;
} {
  const payload = asRecord(event.payload);
  const previousValue = stringField(payload, [
    "fromStage",
    "previousStage",
    "from",
    "oldStage",
    "previousValue",
  ]);
  const newValue = stringField(payload, [
    "toStage",
    "newStage",
    "to",
    "stage",
    "newValue",
  ]);
  return { previousValue, newValue };
}

export function mapEarEventToTimelineItem(
  event: EnterpriseActivityEvent,
  scope?: TransactionTimelineScope,
): TransactionTimelineItem {
  const category = classifyEarEvent(event);
  const stageCapable =
    category === "stage_change" ||
    category === "approval" ||
    category === "disbursement";
  const pair = stageCapable
    ? resolveStagePair(event)
    : { previousValue: null, newValue: null };
  const payload = asRecord(event.payload);
  const inboundEmailId = stringField(payload, ["inboundEmailId"]);
  const detailed = composeDetailedTimelineRow(event);
  const needsAttention =
    detailed.needsAttention ||
    payload.needsAttention === true ||
    stringField(payload, ["matchStatus"]) === "needs_review" ||
    stringField(payload, ["matchStatus"]) === "unmatched" ||
    stringField(payload, ["matchStatus"]) === "received";
  return {
    id: event.id,
    occurredAt: event.occurredAt,
    category,
    categoryLabel: CATEGORY_LABELS[category],
    title: detailed.title,
    description: detailed.explanation,
    actorLabel: detailed.actorLabel,
    entityLabel: resolveEntityLabel(event, scope),
    previousValue: detailed.beforeValue || pair.previousValue,
    newValue: detailed.afterValue || pair.newValue,
    opportunityId: event.opportunityId,
    dealId: event.dealId,
    sourceSystem: String(event.sourceSystem || ""),
    eventKind: String(event.eventKind || ""),
    payload: event.payload,
    inboundEmailId,
    needsAttention,
  };
}

/**
 * Opportunity mode: all EAR rows for that opportunityId.
 * Deal mode: this deal's rows + parent Opportunity rows with no other dealId
 * (excludes sibling-deal-only events).
 * Global mode: no entity filter (org-wide chronology).
 */
export function filterEventsForScope(
  events: EnterpriseActivityEvent[],
  scope: TransactionTimelineScope,
): EnterpriseActivityEvent[] {
  if (scope.mode === "global") {
    return events;
  }
  if (scope.mode === "opportunity") {
    return events.filter((e) => e.opportunityId === scope.opportunityId);
  }
  if (scope.mode === "contact") {
    return events.filter((e) => e.contactId === scope.contactId);
  }
  if (scope.mode === "contact_graph") {
    const dealSet = new Set(scope.dealIds.filter(Boolean));
    const oppSet = new Set(scope.opportunityIds.filter(Boolean));
    return events.filter((e) => {
      if (e.contactId === scope.contactId) return true;
      if (e.dealId && dealSet.has(e.dealId)) return true;
      if (e.opportunityId && oppSet.has(e.opportunityId)) return true;
      return false;
    });
  }
  if (scope.mode === "lender") {
    const dealSet = new Set(scope.dealIds.filter(Boolean));
    const oppSet = new Set((scope.opportunityIds ?? []).filter(Boolean));
    return events.filter((e) => {
      if (e.dealId && dealSet.has(e.dealId)) return true;
      if (e.opportunityId && oppSet.has(e.opportunityId) && !e.dealId) return true;
      return false;
    });
  }
  const dealId = scope.dealId;
  const opportunityId = scope.opportunityId?.trim() || null;
  return events.filter((e) => {
    if (e.dealId && e.dealId === dealId) return true;
    if (e.dealId && e.dealId !== dealId) return false;
    if (opportunityId && e.opportunityId === opportunityId && !e.dealId) return true;
    return false;
  });
}

export function matchesTimelineFilter(
  item: TransactionTimelineItem,
  filter: TransactionTimelineFilterId,
): boolean {
  if (filter === "all") return true;
  if (filter === "notes") return item.category === "note";
  if (filter === "communications") {
    return item.category === "incoming_email" || item.eventKind === "communications";
  }
  if (filter === "activities") {
    return (
      item.category === "activity" ||
      item.category === "note" ||
      item.category === "incoming_email"
    );
  }
  if (filter === "documents") return item.category === "document";
  if (filter === "tasks") return item.category === "task";
  if (filter === "stage_changes") {
    return (
      item.category === "stage_change" ||
      item.category === "approval" ||
      item.category === "disbursement"
    );
  }
  if (filter === "system") {
    return (
      item.category === "system" ||
      item.category === "lender" ||
      item.category === "approval" ||
      item.category === "disbursement"
    );
  }
  return true;
}

export async function loadTransactionActivityTimeline(
  scope: TransactionTimelineScope,
  options?: { limit?: number },
): Promise<TransactionTimelineItem[]> {
  const limit = Math.min(Math.max(options?.limit ?? 80, 1), 200);
  let raw: EnterpriseActivityEvent[] = [];

  if (scope.mode === "global") {
    raw = await listEnterpriseActivity({ limit });
  } else if (scope.mode === "opportunity") {
    raw = await listEnterpriseActivity({
      opportunityId: scope.opportunityId,
      limit,
    });
  } else if (scope.mode === "contact") {
    raw = await listEnterpriseActivity({
      contactId: scope.contactId,
      limit,
    });
  } else if (scope.mode === "contact_graph") {
    const dealIds = scope.dealIds.filter(Boolean).slice(0, 24);
    const opportunityIds = scope.opportunityIds.filter(Boolean).slice(0, 24);
    const batches = await Promise.all([
      listEnterpriseActivity({ contactId: scope.contactId, limit: 80 }),
      ...dealIds.map((dealId) => listEnterpriseActivity({ dealId, limit: 40 })),
      ...opportunityIds.map((opportunityId) =>
        listEnterpriseActivity({ opportunityId, limit: 40 }),
      ),
    ]);
    const map = new Map<string, EnterpriseActivityEvent>();
    const sourceSeen = new Set<string>();
    for (const batch of batches) {
      for (const e of batch) {
        if (map.has(e.id)) continue;
        const sourceKey =
          e.sourceEventId && e.sourceSystem ? `${e.sourceSystem}:${e.sourceEventId}` : "";
        if (sourceKey && sourceSeen.has(sourceKey)) continue;
        if (sourceKey) sourceSeen.add(sourceKey);
        map.set(e.id, e);
      }
    }
    raw = Array.from(map.values());
  } else if (scope.mode === "lender") {
    const dealIds = scope.dealIds.filter(Boolean).slice(0, 40);
    const opportunityIds = (scope.opportunityIds ?? []).filter(Boolean).slice(0, 40);
    const batches = await Promise.all([
      ...dealIds.map((dealId) => listEnterpriseActivity({ dealId, limit: 40 })),
      ...opportunityIds.map((opportunityId) =>
        listEnterpriseActivity({ opportunityId, limit: 40 }),
      ),
    ]);
    const map = new Map<string, EnterpriseActivityEvent>();
    for (const batch of batches) {
      for (const e of batch) map.set(e.id, e);
    }
    raw = Array.from(map.values());
  } else {
    const [byDeal, byOpp] = await Promise.all([
      listEnterpriseActivity({ dealId: scope.dealId, limit }),
      scope.opportunityId
        ? listEnterpriseActivity({ opportunityId: scope.opportunityId, limit })
        : Promise.resolve([] as EnterpriseActivityEvent[]),
    ]);
    const map = new Map<string, EnterpriseActivityEvent>();
    for (const e of [...byDeal, ...byOpp]) map.set(e.id, e);
    raw = Array.from(map.values());
  }

  const filtered = filterEventsForScope(raw, scope).filter(isOperationalTimelineEvent);
  return filtered
    .map((e) => mapEarEventToTimelineItem(e, scope))
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
}

export { subscribeEarUpdated };

export function formatTimelineWhen(iso: string): { day: string; time: string } {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { day: "—", time: "" };
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round(
      (startToday.getTime() - startThat.getTime()) / 86_400_000,
    );
    let day: string;
    if (diffDays === 0) day = "Today";
    else if (diffDays === 1) day = "Yesterday";
    else {
      day = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    return { day, time };
  } catch {
    return { day: "—", time: "" };
  }
}
