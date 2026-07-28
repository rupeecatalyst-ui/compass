/**
 * CO-ADMIN-004 — Production Reset API
 * SUPER_ADMIN only. Feature flag default OFF. No automatic deletion.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import {
  isProductionResetEnabled,
  PRODUCTION_RESET_FEATURE_PERMISSION,
  PRODUCTION_RESET_TYPED_CONFIRMATION,
} from "@/constants/production-reset";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import type { ApiResponse } from "@/types/api";
import type { ProductionResetExecuteRequest } from "@/types/production-reset";
import { prisma } from "@server/lib/prisma";
import { productionResetService } from "@server/services/production-reset";

function requireSuperAdmin(role: string) {
  if (role !== "SUPER_ADMIN") {
    throw Object.assign(
      new Error("Production Reset requires Super Administrator role and feature permission."),
      { statusCode: 403, code: "FORBIDDEN" },
    );
  }
}

async function resolveActor(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true },
  });
  const name = user ? `${user.firstName} ${user.lastName}`.trim() : undefined;
  return {
    userId,
    email: user?.email,
    name: name || user?.email,
  };
}

/** GET — status, analyse inventory, or recent runs */
export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireSuperAdmin(actor.role);

    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "status";

    if (view === "status") {
      return successResponse({
        featurePermission: PRODUCTION_RESET_FEATURE_PERMISSION,
        featureEnabled: isProductionResetEnabled(),
        persistenceReady: isEnterprisePersistencePrisma(),
        typedConfirmation: PRODUCTION_RESET_TYPED_CONFIRMATION,
        disabledByDefault: true,
        note:
          "Production Reset ships disabled. Enable PRODUCTION_RESET_ENABLED=true only for controlled Super Admin cutover.",
      });
    }

    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(
        503,
        "PERSISTENCE_REQUIRED",
        "Production Reset requires ENTERPRISE_PERSISTENCE_MODE=prisma",
      );
    }

    if (view === "analyse") {
      const analysis = await productionResetService.analyse();
      return successResponse(analysis);
    }

    if (view === "cutover") {
      const cutover = await productionResetService.analyseCutover();
      return successResponse(cutover);
    }

    if (view === "runs") {
      const limit = Number(url.searchParams.get("limit") ?? "25");
      const runs = await productionResetService.listRuns(limit);
      return successResponse({ runs });
    }

    if (view === "run") {
      const runId = url.searchParams.get("runId")?.trim();
      if (!runId) {
        return errorResponse(400, "RUN_ID_REQUIRED", "runId is required");
      }
      const run = await productionResetService.getRun(runId);
      if (!run) return errorResponse(404, "RUN_NOT_FOUND", "Reset run not found");
      return successResponse({ run });
    }

    return errorResponse(400, "INVALID_VIEW", "Unknown view parameter");
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Production Reset GET failed";
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? Number((err as { statusCode: number }).statusCode)
        : 500;
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code: string }).code)
        : "PRODUCTION_RESET_GET_FAILED";
    return errorResponse(statusCode, code, message);
  }
}

/** POST — impact preview, dry-run, or execute */
export async function POST(request: Request) {
  try {
    const tokenActor = requireAccessToken(request);
    requireSuperAdmin(tokenActor.role);
    const actor = await resolveActor(tokenActor.userId);

    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(
        503,
        "PERSISTENCE_REQUIRED",
        "Production Reset requires ENTERPRISE_PERSISTENCE_MODE=prisma",
      );
    }

    const body = (await request.json()) as ProductionResetExecuteRequest & {
      action?: string;
    };
    const action = String(body.action ?? body.mode ?? "impact");

    if (action === "impact") {
      const impact = await productionResetService.buildImpact(
        body.preset ?? "custom",
        body.selection,
        body.filters,
        "dry_run",
      );
      return successResponse({ impact });
    }

    if (action === "dry_run" || body.mode === "dry_run") {
      const result = await productionResetService.run(actor, {
        ...body,
        mode: "dry_run",
        preset: body.preset ?? "custom",
        selection: body.selection,
        filters: body.filters ?? {},
        reason: body.reason,
      });
      return successResponse(result);
    }

    if (action === "execute" || body.mode === "execute") {
      const result = await productionResetService.run(actor, {
        ...body,
        mode: "execute",
        preset: body.preset ?? "custom",
        selection: body.selection,
        filters: body.filters ?? {},
        reason: body.reason,
        typedConfirmation: body.typedConfirmation,
        password: body.password,
        acknowledgedIrreversible: body.acknowledgedIrreversible,
      });
      return successResponse(result);
    }

    return errorResponse(400, "INVALID_ACTION", "action must be impact, dry_run, or execute");
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Production Reset POST failed";
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? Number((err as { statusCode: number }).statusCode)
        : 500;
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code: string }).code)
        : "PRODUCTION_RESET_POST_FAILED";
    return errorResponse(statusCode, code, message);
  }
}
