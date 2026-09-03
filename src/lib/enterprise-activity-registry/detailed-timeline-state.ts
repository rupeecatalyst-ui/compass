/**
 * CO-C1-ACTIVITY-DIALOGUE-TIMELINE-010
 * Persist filters, scroll, and expanded date groups across transaction hops.
 */

import { ROUTES } from "@/constants/routes";
import { ACTIVITY_DIALOGUE_TIMELINE_RESTORE_KEY } from "@/constants/activity-dialogue-timeline";
import { emptyDetailedTimelineFilters } from "@/lib/enterprise-activity-registry/detailed-timeline";
import type {
  DetailedTimelineEventType,
  DetailedTimelineFilters,
  DetailedTimelineRestoreState,
  DetailedTimelineStatusFilter,
} from "@/types/activity-dialogue-timeline";

const EVENT_TYPES = new Set<DetailedTimelineEventType>([
  "communications",
  "activities",
  "notes",
  "documents",
  "tasks",
  "stage_changes",
  "assignment_changes",
  "accounting",
  "system_events",
]);

const STATUSES = new Set<DetailedTimelineStatusFilter>([
  "all",
  "needs_attention",
  "queued",
  "delivered",
  "completed",
  "pending_review",
  "failed",
]);

function readParam(
  search: URLSearchParams | { get: (key: string) => string | null },
  key: string,
): string | null {
  const value = search.get(key)?.trim() || "";
  return value || null;
}

export function parseDetailedTimelineFiltersFromSearch(
  search: URLSearchParams | { get: (key: string) => string | null },
): DetailedTimelineFilters {
  const eventTypeRaw = readParam(search, "eventType") || "all";
  const eventType = EVENT_TYPES.has(eventTypeRaw as DetailedTimelineEventType)
    ? (eventTypeRaw as DetailedTimelineEventType)
    : "all";
  const statusRaw = (readParam(search, "status") || "all") as DetailedTimelineStatusFilter;
  return {
    since: readParam(search, "since"),
    until: readParam(search, "until"),
    opportunityId: readParam(search, "opportunityId"),
    dealId: readParam(search, "dealId"),
    contactId: readParam(search, "contactId"),
    companyId: readParam(search, "companyId"),
    actorUserId: readParam(search, "actorUserId"),
    lenderId: readParam(search, "lenderId"),
    product: readParam(search, "product"),
    eventType,
    sourceWorkspace: readParam(search, "sourceWorkspace"),
    status: STATUSES.has(statusRaw) ? statusRaw : "all",
    search: search.get("q")?.trim() || "",
  };
}

export function detailedTimelineFiltersToSearchParams(
  filters: DetailedTimelineFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  const put = (key: string, value?: string | null) => {
    const trimmed = value?.trim();
    if (trimmed) params.set(key, trimmed);
  };
  put("since", filters.since);
  put("until", filters.until);
  put("opportunityId", filters.opportunityId);
  put("dealId", filters.dealId);
  put("contactId", filters.contactId);
  put("companyId", filters.companyId);
  put("actorUserId", filters.actorUserId);
  put("lenderId", filters.lenderId);
  put("product", filters.product);
  if (filters.eventType !== "all") params.set("eventType", filters.eventType);
  put("sourceWorkspace", filters.sourceWorkspace);
  if (filters.status !== "all") params.set("status", filters.status);
  put("q", filters.search);
  return params;
}

export function buildActivityTimelineHref(
  filters: DetailedTimelineFilters,
  extras?: { eventId?: string | null; inboundEmailId?: string | null },
): string {
  const params = detailedTimelineFiltersToSearchParams(filters);
  if (extras?.eventId) params.set("eventId", extras.eventId);
  if (extras?.inboundEmailId) params.set("inboundEmailId", extras.inboundEmailId);
  const q = params.toString();
  return q ? `${ROUTES.ACTIVITY}?${q}` : ROUTES.ACTIVITY;
}

export function saveDetailedTimelineRestoreState(
  state: DetailedTimelineRestoreState,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ACTIVITY_DIALOGUE_TIMELINE_RESTORE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function loadDetailedTimelineRestoreState(): DetailedTimelineRestoreState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ACTIVITY_DIALOGUE_TIMELINE_RESTORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DetailedTimelineRestoreState;
    if (!parsed?.filters) return null;
    return {
      filters: { ...emptyDetailedTimelineFilters(), ...parsed.filters },
      scrollY: Number(parsed.scrollY) || 0,
      expandedDays: Array.isArray(parsed.expandedDays) ? parsed.expandedDays.map(String) : [],
      selectedEventId: parsed.selectedEventId || null,
    };
  } catch {
    return null;
  }
}

export function withReturnToActivityTimeline(href: string): string {
  if (!href || href.startsWith("#")) return href;
  try {
    const url = new URL(href, "https://local.invalid");
    url.searchParams.set("from", "activity-timeline");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}
