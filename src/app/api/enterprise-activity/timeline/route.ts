/**
 * CO-C1-ACTIVITY-DIALOGUE-TIMELINE-010
 * Authorised organisation-wide Activity & Dialogue timeline (EAR read compose).
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { emptyDetailedTimelineFilters } from "@/lib/enterprise-activity-registry/detailed-timeline";
import { parseDetailedTimelineFiltersFromSearch } from "@/lib/enterprise-activity-registry/detailed-timeline-state";
import { listDetailedActivityDialogueTimeline } from "@server/services/enterprise-activity/detailed-timeline.service";
import type { DetailedTimelineEventType, DetailedTimelineStatusFilter } from "@/types/activity-dialogue-timeline";

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const url = new URL(request.url);
    const parsed = parseDetailedTimelineFiltersFromSearch(url.searchParams);
    const filters = {
      ...emptyDetailedTimelineFilters(),
      ...parsed,
      eventType: (url.searchParams.get("eventType") || parsed.eventType) as
        | DetailedTimelineEventType
        | "all",
      status: (url.searchParams.get("status") || parsed.status) as DetailedTimelineStatusFilter,
    };
    const pageSize = Number(url.searchParams.get("limit") ?? "40") || 40;
    const result = await listDetailedActivityDialogueTimeline({
      actor: {
        userId: actor.userId,
        role: actor.role,
      },
      filters,
      cursor: url.searchParams.get("cursor"),
      pageSize,
    });
    return successResponse(result);
  } catch (err) {
    const e = err as { status?: number; statusCode?: number };
    if (e.status === 401 || e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(
      (err as { statusCode?: number }).statusCode || 500,
      (err as { code?: string }).code || "ACTIVITY_TIMELINE_ERROR",
      err instanceof Error ? err.message : "Failed to load Activity & Dialogue timeline",
    );
  }
}
