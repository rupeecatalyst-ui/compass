/**
 * SUPER_ADMIN COMPASS Advantage commercial configuration.
 * GET  /api/admin/compass-advantage?productCode=
 * POST /api/admin/compass-advantage  { action, ... }
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  createDraftVersion,
  getAdvantageWorkspace,
  listAdvantageProductSummaries,
  previewAdvantageCalculation,
  publishSchedule,
  saveDraftSchedule,
  setScheduleLifecycle,
} from "@server/services/compass-advantage/compass-advantage-commercial.service";
import { validateScheduleForPublication } from "@/lib/compass-advantage/validate";
import type { CompassAdvantageRangeInput } from "@/types/compass-advantage-commercial";

function requireSuperAdmin(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN") {
    throw Object.assign(new Error("Only Super Admin / Product Owner may configure COMPASS Advantage."), {
      status: 403,
      body: {
        success: false,
        error: { code: "FORBIDDEN", message: "Super Admin required" },
      },
    });
  }
}

function actorOf(token: { userId: string; email?: string }) {
  return { userId: token.userId, label: token.email || token.userId };
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireSuperAdmin(actor);
    const organizationId = await resolvePilotOrganizationId();
    const productCode = new URL(request.url).searchParams.get("productCode");
    if (!productCode) {
      const products = await listAdvantageProductSummaries(organizationId);
      return successResponse({ products });
    }
    const workspace = await getAdvantageWorkspace(organizationId, productCode);
    const editing = workspace.draft ?? workspace.current;
    const validation = editing ? validateScheduleForPublication(editing) : null;
    return successResponse({ ...workspace, validation });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to load COMPASS Advantage configuration";
    return errorResponse(500, "ADVANTAGE_LOAD_FAILED", message);
  }
}

export async function POST(request: Request) {
  try {
    const actorToken = requireAccessToken(request);
    requireSuperAdmin(actorToken);
    const actor = actorOf(actorToken);
    const organizationId = await resolvePilotOrganizationId();
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");

    if (action === "create_draft") {
      const data = await createDraftVersion({
        organizationId,
        productCode: String(body.productCode ?? ""),
        copyFromScheduleId: typeof body.copyFromScheduleId === "string" ? body.copyFromScheduleId : null,
        copyFromProductCode: typeof body.copyFromProductCode === "string" ? body.copyFromProductCode : null,
        actor,
        reason: typeof body.reason === "string" ? body.reason : undefined,
      });
      return successResponse({ schedule: data });
    }

    if (action === "save_draft") {
      const data = await saveDraftSchedule({
        organizationId,
        scheduleId: String(body.scheduleId ?? ""),
        advantageActive: Boolean(body.advantageActive),
        changeReason: typeof body.changeReason === "string" ? body.changeReason : null,
        ranges: (Array.isArray(body.ranges) ? body.ranges : []) as CompassAdvantageRangeInput[],
        actor,
      });
      return successResponse({
        schedule: data,
        validation: validateScheduleForPublication(data),
      });
    }

    if (action === "publish") {
      const data = await publishSchedule({
        organizationId,
        scheduleId: String(body.scheduleId ?? ""),
        effectiveFrom: body.effectiveFrom ? new Date(String(body.effectiveFrom)) : new Date(),
        changeReason: String(body.changeReason ?? ""),
        actor,
      });
      return successResponse({ schedule: data });
    }

    if (action === "suspend" || action === "retire") {
      const data = await setScheduleLifecycle({
        organizationId,
        scheduleId: String(body.scheduleId ?? ""),
        status: action === "suspend" ? "suspended" : "retired",
        reason: String(body.reason ?? action),
        actor,
      });
      return successResponse({ schedule: data });
    }

    if (action === "preview") {
      const preview = await previewAdvantageCalculation({
        organizationId,
        productCode: String(body.productCode ?? ""),
        requestedLoanAmount: String(body.requestedLoanAmount ?? ""),
        caseReceivedAt: body.caseReceivedAt ? new Date(String(body.caseReceivedAt)) : new Date(),
        actor,
      });
      return successResponse(preview);
    }

    return errorResponse(400, "INVALID_ACTION", "Unknown COMPASS Advantage action");
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "COMPASS Advantage action failed";
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? Number((err as { statusCode: number }).statusCode)
        : 400;
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code: string }).code)
        : "ADVANTAGE_ACTION_FAILED";
    return errorResponse(statusCode, code, message);
  }
}
