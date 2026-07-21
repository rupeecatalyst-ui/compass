import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { configureEcmPersistencePorts } from "@/lib/enterprise-persistence";
import { ecmCompanyService } from "@server/services/ecm/company.service";
import { softDeleteService } from "@server/services/soft-delete/soft-delete.service";
import { prisma } from "@server/lib/prisma";
import type { ApiResponse } from "@/types/api";

function persistenceGuard() {
  if (!isEnterprisePersistencePrisma()) {
    throw new Error("ECM REST API requires ENTERPRISE_PERSISTENCE_MODE=prisma");
  }
}

type RouteContext = { params: Promise<{ companyId: string }> };

async function actorDisplayName(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true },
  });
  if (!user) return undefined;
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    persistenceGuard();
    configureEcmPersistencePorts();
    requireAccessToken(_request);
    const { companyId } = await context.params;
    const company = await ecmCompanyService.getById(companyId);
    if (!company) return errorResponse(404, "NOT_FOUND", "Company not found");
    return successResponse(company);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(500, "ECM_COMPANY_GET_FAILED", "Failed to load company");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    persistenceGuard();
    configureEcmPersistencePorts();
    const tokenActor = requireAccessToken(request);
    const { companyId } = await context.params;
    const body = await request.json();

    if (body.action === "archive" || body.action === "soft_delete") {
      await softDeleteService.softDelete({
        module: "companies",
        entityId: companyId,
        actor: {
          userId: tokenActor.userId,
          role: tokenActor.role,
          displayName: await actorDisplayName(tokenActor.userId),
        },
        reason: body.reason ? String(body.reason) : undefined,
      });
      return successResponse({ id: companyId, status: "archived", isDeleted: true });
    }

    const updated = await ecmCompanyService.update(companyId, body, tokenActor.userId);
    return successResponse(updated);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to update company";
    return errorResponse(400, "ECM_COMPANY_UPDATE_FAILED", message);
  }
}
