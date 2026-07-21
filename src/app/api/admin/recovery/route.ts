import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { softDeleteService } from "@server/services/soft-delete/soft-delete.service";
import type { ApiResponse } from "@/types/api";
import type { SoftDeleteModuleId } from "@/types/enterprise-soft-delete";
import { prisma } from "@server/lib/prisma";

function persistenceGuard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(
      new Error("Enterprise Recovery Center requires ENTERPRISE_PERSISTENCE_MODE=prisma"),
      { statusCode: 503, code: "PERSISTENCE_REQUIRED" },
    );
  }
}

async function resolveActorDisplayName(userId: string): Promise<string | undefined> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true },
  });
  if (!user) return undefined;
  const name = `${user.firstName} ${user.lastName}`.trim();
  return name || user.email;
}

export async function GET(request: Request) {
  try {
    persistenceGuard();
    const actor = requireAccessToken(request);
    const url = new URL(request.url);
    const view = url.searchParams.get("view");
    const moduleId = url.searchParams.get("module") as SoftDeleteModuleId | null;

    if (view === "audits") {
      const audits = await softDeleteService.listAudits(100);
      return successResponse({ audits });
    }

    if (view === "modules") {
      return successResponse({ modules: softDeleteService.listModules() });
    }

    const records = await softDeleteService.listRecovery(moduleId ?? undefined);
    return successResponse({
      records,
      actorRole: actor.role,
    });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to load recovery center";
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? Number((err as { statusCode: number }).statusCode)
        : 500;
    return errorResponse(statusCode, "RECOVERY_LIST_FAILED", message);
  }
}

export async function POST(request: Request) {
  try {
    persistenceGuard();
    const tokenActor = requireAccessToken(request);
    const displayName = await resolveActorDisplayName(tokenActor.userId);
    const actor = {
      userId: tokenActor.userId,
      role: tokenActor.role,
      displayName,
    };
    const body = await request.json();
    const action = String(body.action ?? "");
    const moduleId = body.module as SoftDeleteModuleId;
    const entityId = String(body.entityId ?? "").trim();

    if (!moduleId || !entityId) {
      return errorResponse(400, "INVALID_INPUT", "module and entityId are required");
    }

    if (action === "soft_delete") {
      const record = await softDeleteService.softDelete({
        module: moduleId,
        entityId,
        actor,
        reason: body.reason ? String(body.reason) : undefined,
      });
      return successResponse(record);
    }

    if (action === "restore") {
      const record = await softDeleteService.restore({ module: moduleId, entityId, actor });
      return successResponse(record);
    }

    if (action === "permanent_delete") {
      const result = await softDeleteService.permanentlyDelete({
        module: moduleId,
        entityId,
        actor,
        confirmation: String(body.confirmation ?? ""),
      });
      return successResponse(result);
    }

    return errorResponse(400, "INVALID_ACTION", "Unknown recovery action");
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Recovery action failed";
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? Number((err as { statusCode: number }).statusCode)
        : 400;
    return errorResponse(statusCode, "RECOVERY_ACTION_FAILED", message);
  }
}
