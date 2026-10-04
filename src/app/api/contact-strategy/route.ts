/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007 — Contact Strategy workspace API.
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { loadContactStrategySnapshot } from "@server/services/contact-strategy/contact-strategy.service";
import type { ContactStrategyActivityBand, ContactStrategyFilters, ContactStrategyKpiId } from "@/types/contact-strategy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BANDS = new Set(["very_active", "active", "moderate", "needs_attention", "dormant"]);
const KPIS = new Set(["strategic", "due_today", "needs_attention", "dormant", "upcoming_meetings"]);

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const url = new URL(request.url);
    const band = url.searchParams.get("activityBand") || url.searchParams.get("relationshipState");
    const kpi = url.searchParams.get("kpi");
    const filters: ContactStrategyFilters = {
      q: url.searchParams.get("q") ?? undefined,
      relationshipState: BANDS.has(band || "")
        ? (band as ContactStrategyActivityBand)
        : "all",
      activityBand: BANDS.has(band || "") ? (band as ContactStrategyActivityBand) : "all",
      contactRole: url.searchParams.get("contactRole") || "all",
      assignedEmployeeId: url.searchParams.get("assignedEmployeeId") || "all",
      companyId: url.searchParams.get("companyId") || "all",
      linkedTransaction:
        (url.searchParams.get("linkedTransaction") as ContactStrategyFilters["linkedTransaction"]) ||
        "all",
      nextActionDue:
        (url.searchParams.get("nextActionDue") as ContactStrategyFilters["nextActionDue"]) || "all",
      kpi: KPIS.has(kpi || "") ? (kpi as ContactStrategyKpiId) : null,
    };
    const snapshot = await loadContactStrategySnapshot({
      actor: {
        userId: actor.userId,
        role: actor.role,
      },
      filters,
    });
    return successResponse(snapshot);
  } catch (err) {
    if (typeof err === "object" && err && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    const status = Number((err as { statusCode?: number }).statusCode) || 500;
    return errorResponse(
      status,
      (err as { code?: string }).code || "CONTACT_STRATEGY_FAILED",
      err instanceof Error ? err.message : "Failed to load Contact Strategy",
    );
  }
}
