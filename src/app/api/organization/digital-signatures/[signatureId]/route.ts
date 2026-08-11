import {
  fromAuthError,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { organizationWorkspaceService } from "@server/services/organization-workspace/organization-workspace.service";
import type { OrganizationDigitalSignaturePatch } from "@/types/enterprise-organization-workspace";
import {
  guardOrganizationWorkspacePrisma,
  handleOrganizationRouteError,
  resolveOrganizationActor,
} from "../../_lib/route-utils";

type RouteContext = { params: Promise<{ signatureId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    guardOrganizationWorkspacePrisma();
    const actor = await resolveOrganizationActor(request);
    const { signatureId } = await context.params;
    const body = (await request.json()) as OrganizationDigitalSignaturePatch;
    const signature = await organizationWorkspaceService.updateDigitalSignature(
      signatureId,
      body,
      actor,
    );
    return successResponse(signature);
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
    const { signatureId } = await context.params;
    await organizationWorkspaceService.deleteDigitalSignature(signatureId, actor);
    return successResponse({ deleted: true });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleOrganizationRouteError(err);
  }
}
