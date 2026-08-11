import {
  fromAuthError,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { organizationWorkspaceService } from "@server/services/organization-workspace/organization-workspace.service";
import {
  guardOrganizationWorkspacePrisma,
  handleOrganizationRouteError,
  resolveOrganizationActor,
} from "../../_lib/route-utils";

type RouteContext = { params: Promise<{ templateId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    guardOrganizationWorkspacePrisma();
    const actor = await resolveOrganizationActor(request);
    const { templateId } = await context.params;
    const body = await request.json();
    const label = String(body.label ?? "").trim();
    if (!label) {
      return handleOrganizationRouteError(new Error("Template label is required"));
    }
    const templateType = await organizationWorkspaceService.updateTemplateType(
      templateId,
      label,
      actor,
    );
    return successResponse(templateType);
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
    const { templateId } = await context.params;
    await organizationWorkspaceService.deleteTemplateType(templateId, actor);
    return successResponse({ deleted: true });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleOrganizationRouteError(err);
  }
}
