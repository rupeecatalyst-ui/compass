/**
 * CO-GOV-001 — Governance history / timeline / compliance (administrators).
 */

import { formatAuthError } from "@server/validators/auth.validators";
import {
  fromAuthError,
  requireAccessToken,
  successResponse,
  errorResponse,
} from "@/lib/api/auth-route-utils";
import {
  assessGovernanceCompliance,
  buildEntityGovernanceTimeline,
  listEntityChanges,
  listEntityChangesFor,
  listFieldAudits,
  listFieldAuditsFor,
} from "@/lib/enterprise-governance";
import type { GovernanceEntityType } from "@/types/enterprise-governance";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can view Governance APIs"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

/** GET — entity history, timeline, or compliance assessment */
export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "summary";
    const entityType = (url.searchParams.get("entityType") ?? "Other") as GovernanceEntityType;
    const entityId = url.searchParams.get("entityId") ?? "";
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 100) || 100, 500);

    if (view === "compliance") {
      return successResponse(assessGovernanceCompliance());
    }

    if (view === "timeline") {
      if (!entityId) {
        return errorResponse(400, "ENTITY_ID_REQUIRED", "entityId is required for timeline view");
      }
      return successResponse({
        entityType,
        entityId,
        events: buildEntityGovernanceTimeline({ entityType, entityId, limit }),
      });
    }

    if (view === "history") {
      if (!entityId) {
        return errorResponse(400, "ENTITY_ID_REQUIRED", "entityId is required for history view");
      }
      return successResponse({
        entityType,
        entityId,
        changes: listEntityChangesFor(entityType, entityId, limit),
        fields: listFieldAuditsFor(entityType, entityId, limit),
      });
    }

    return successResponse({
      asOf: new Date().toISOString(),
      recentChanges: listEntityChanges(limit),
      recentFieldAudits: listFieldAudits(Math.min(limit, 100)),
      compliance: assessGovernanceCompliance(),
    });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(err));
  }
}
