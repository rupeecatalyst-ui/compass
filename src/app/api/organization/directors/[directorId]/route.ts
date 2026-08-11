import {
  errorResponse,
  fromAuthError,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { organizationWorkspaceService } from "@server/services/organization-workspace/organization-workspace.service";
import type { OrganizationDirectorPatch } from "@/types/enterprise-organization-workspace";
import {
  guardOrganizationWorkspacePrisma,
  handleOrganizationRouteError,
  resolveOrganizationActor,
} from "../../_lib/route-utils";

type RouteContext = { params: Promise<{ directorId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    guardOrganizationWorkspacePrisma();
    const actor = await resolveOrganizationActor(request);
    const { directorId } = await context.params;
    const body = (await request.json()) as OrganizationDirectorPatch;
    const director = await organizationWorkspaceService.updateDirector(directorId, body, actor);
    return successResponse(director);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleOrganizationRouteError(err);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    guardOrganizationWorkspacePrisma();
    const actor = await resolveOrganizationActor(request);
    const { directorId } = await context.params;
    await organizationWorkspaceService.deleteDirector(directorId, actor);
    return successResponse({ deleted: true });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleOrganizationRouteError(err);
  }
}

export async function GET() {
  return errorResponse(405, "METHOD_NOT_ALLOWED", "Use GET /api/organization/directors");
}
