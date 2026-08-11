import {
  fromAuthError,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { organizationWorkspaceService } from "@server/services/organization-workspace/organization-workspace.service";
import type { OrganizationSealPatch } from "@/types/enterprise-organization-workspace";
import {
  guardOrganizationWorkspacePrisma,
  handleOrganizationRouteError,
  resolveOrganizationActor,
} from "../_lib/route-utils";

export async function GET(request: Request) {
  try {
    guardOrganizationWorkspacePrisma();
    const actor = await resolveOrganizationActor(request);
    const seal = await organizationWorkspaceService.getOrBootstrapSeal(actor);
    return successResponse(seal);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleOrganizationRouteError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    guardOrganizationWorkspacePrisma();
    const actor = await resolveOrganizationActor(request);
    const body = (await request.json()) as OrganizationSealPatch;
    const seal = await organizationWorkspaceService.updateSeal(body, actor);
    return successResponse(seal);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleOrganizationRouteError(err);
  }
}
