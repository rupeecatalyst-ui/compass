/**
 * CO-ORG-003 — Client API for Enterprise Activity Registry.
 */

import { EAR_API_PATH } from "@/constants/enterprise-activity-registry";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  listSessionEarEvents,
  rememberEarEvent,
  rememberEarEvents,
} from "@/lib/enterprise-activity-registry/session-registry";
import type {
  EmitEnterpriseActivityInput,
  EnterpriseActivityEvent,
  ListEnterpriseActivityQuery,
} from "@/types/enterprise-activity-registry";
import type {
  DetailedTimelineCounts,
  DetailedTimelineFilters,
  DetailedTimelineRow,
} from "@/types/activity-dialogue-timeline";
import {
  emptyDetailedTimelineCounts,
  emptyDetailedTimelineFilters,
  paginateAuthorisedTimeline,
} from "@/lib/enterprise-activity-registry/detailed-timeline";
import { detailedTimelineFiltersToSearchParams } from "@/lib/enterprise-activity-registry/detailed-timeline-state";

function buildQuery(params: ListEnterpriseActivityQuery): string {
  const q = new URLSearchParams();
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.eventKind) q.set("eventKind", params.eventKind);
  if (params.opportunityId) q.set("opportunityId", params.opportunityId);
  if (params.dealId) q.set("dealId", params.dealId);
  if (params.contactId) q.set("contactId", params.contactId);
  if (params.sourceSystem) q.set("sourceSystem", params.sourceSystem);
  if (params.since) q.set("since", params.since);
  if (params.until) q.set("until", params.until);
  if (params.actorUserId) q.set("actorUserId", params.actorUserId);
  if (params.cursor) q.set("cursor", params.cursor);
  const s = q.toString();
  return s ? `?${s}` : "";
}

function sessionFallback(query: ListEnterpriseActivityQuery): EnterpriseActivityEvent[] {
  const limit = query.limit ?? 50;
  let rows = listSessionEarEvents();
  // CO-C1-DIALOGUE-002A — never surface unrelated session rows on soft fallback
  if (query.opportunityId) {
    rows = rows.filter((e) => e.opportunityId === query.opportunityId);
  }
  if (query.dealId) {
    rows = rows.filter((e) => e.dealId === query.dealId);
  }
  if (query.contactId) {
    rows = rows.filter((e) => e.contactId === query.contactId);
  }
  if (query.eventKind) {
    rows = rows.filter((e) => e.eventKind === query.eventKind);
  }
  if (query.sourceSystem) {
    rows = rows.filter((e) => e.sourceSystem === query.sourceSystem);
  }
  return rows.slice(0, limit);
}

export async function listEnterpriseActivity(
  query: ListEnterpriseActivityQuery = {},
): Promise<EnterpriseActivityEvent[]> {
  try {
    const res = await authenticatedJsonFetch(`${EAR_API_PATH}${buildQuery(query)}`, {
      cache: "no-store",
    });
    if (!res.ok) return sessionFallback(query);
    const payload = (await res.json()) as {
      data?: { items?: EnterpriseActivityEvent[]; durable?: boolean };
      items?: EnterpriseActivityEvent[];
    };
    const items = payload.data?.items ?? payload.items ?? [];
    if (items.length) rememberEarEvents(items);
    const session = sessionFallback(query);
    if (!items.length) return session;
    const limit = query.limit ?? 50;
    return mergeEarItems(items, session).slice(0, limit);
  } catch {
    return sessionFallback(query);
  }
}

function mergeEarItems(
  api: EnterpriseActivityEvent[],
  session: EnterpriseActivityEvent[],
): EnterpriseActivityEvent[] {
  if (!session.length) return api;
  const byKey = new Map<string, EnterpriseActivityEvent>();
  for (const event of session) {
    byKey.set(earMergeKey(event), event);
  }
  for (const event of api) {
    byKey.set(earMergeKey(event), event);
  }
  return [...byKey.values()].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

function earMergeKey(event: EnterpriseActivityEvent): string {
  if (event.sourceSystem && event.sourceEventId) {
    return `${event.sourceSystem}:${event.sourceEventId}`;
  }
  return event.id;
}

export async function emitEnterpriseActivity(
  input: EmitEnterpriseActivityInput,
): Promise<EnterpriseActivityEvent | null> {
  const provisional: EnterpriseActivityEvent = {
    id: input.id ?? crypto.randomUUID(),
    organizationId: "session",
    eventKind: input.eventKind,
    sourceSystem: input.sourceSystem,
    sourceEventId: input.sourceEventId,
    title: input.title,
    summary: input.summary ?? null,
    payload: input.payload ?? null,
    opportunityId: input.opportunityId ?? null,
    dealId: input.dealId ?? null,
    contactId: input.contactId ?? null,
    taskId: input.taskId ?? null,
    documentId: input.documentId ?? null,
    actorUserId: input.actorUserId ?? null,
    actorName: input.actorName ?? null,
    occurredAt:
      input.occurredAt instanceof Date
        ? input.occurredAt.toISOString()
        : (input.occurredAt ?? new Date().toISOString()),
    createdAt: new Date().toISOString(),
  };
  rememberEarEvent(provisional);

  try {
    const res = await authenticatedJsonFetch(EAR_API_PATH, {
      method: "POST",
      body: JSON.stringify({
        ...input,
        id: provisional.id,
        occurredAt: provisional.occurredAt,
      }),
    });
    if (!res.ok) return provisional;
    const payload = (await res.json()) as {
      data?: { item?: EnterpriseActivityEvent };
      item?: EnterpriseActivityEvent;
    };
    const saved = payload.data?.item ?? payload.item;
    if (saved?.id) return rememberEarEvent(saved);
  } catch {
    /* session cache remains */
  }
  return provisional;
}

/** Fire-and-forget emit — never blocks the business workflow. */
export function emitEnterpriseActivityBestEffort(input: EmitEnterpriseActivityInput): void {
  void emitEnterpriseActivity(input);
}

export async function listDetailedActivityDialogueTimeline(input: {
  filters?: DetailedTimelineFilters;
  cursor?: string | null;
  limit?: number;
} = {}): Promise<{
  items: DetailedTimelineRow[];
  counts: DetailedTimelineCounts;
  pageInfo: { nextCursor: string | null; hasNextPage: boolean };
  summary: DetailedTimelineCounts;
  nextCursor: string | null;
  hasMore: boolean;
  durable: boolean;
}> {
  const filters = input.filters ?? emptyDetailedTimelineFilters();
  const params = detailedTimelineFiltersToSearchParams(filters);
  if (input.cursor) params.set("cursor", input.cursor);
  if (input.limit != null) params.set("limit", String(input.limit));
  const qs = params.toString();
  try {
    const res = await authenticatedJsonFetch(
      `${EAR_API_PATH}/timeline${qs ? `?${qs}` : ""}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error("timeline_unavailable");
    const payload = (await res.json()) as {
      data?: {
        items?: DetailedTimelineRow[];
        counts?: DetailedTimelineCounts;
        summary?: DetailedTimelineCounts;
        pageInfo?: { nextCursor?: string | null; hasNextPage?: boolean };
        nextCursor?: string | null;
        hasMore?: boolean;
        durable?: boolean;
      };
    };
    const data = payload.data;
    if (!data) throw new Error("timeline_unavailable");
    const summary = data.summary ?? data.counts ?? emptyDetailedTimelineCounts(Boolean(data.durable));
    const nextCursor = data.pageInfo?.nextCursor ?? data.nextCursor ?? null;
    const hasNextPage = data.pageInfo?.hasNextPage ?? Boolean(data.hasMore);
    return {
      items: data.items ?? [],
      counts: summary,
      summary,
      pageInfo: { nextCursor, hasNextPage },
      nextCursor,
      hasMore: hasNextPage,
      durable: Boolean(data.durable),
    };
  } catch {
    const session = sessionFallback({
      limit: 500,
      opportunityId: filters.opportunityId || undefined,
      dealId: filters.dealId || undefined,
      contactId: filters.contactId || undefined,
      since: filters.since || undefined,
    });
    const page = paginateAuthorisedTimeline(session, {
      filters,
      includeTechnical: false,
      pageSize: input.limit ?? 40,
      cursor: input.cursor,
      complete: false,
    });
    return {
      items: page.items,
      counts: page.summary,
      summary: page.summary,
      pageInfo: page.pageInfo,
      nextCursor: page.pageInfo.nextCursor,
      hasMore: page.pageInfo.hasNextPage,
      durable: false,
    };
  }
}
