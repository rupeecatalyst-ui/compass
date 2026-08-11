import {
  fromAuthError,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { organizationWorkspaceService } from "@server/services/organization-workspace/organization-workspace.service";
import {
  guardOrganizationWorkspacePrisma,
  handleOrganizationRouteError,
  resolveOrganizationActor,
} from "../_lib/route-utils";

export async function GET(request: Request) {
  try {
    guardOrganizationWorkspacePrisma();
    await resolveOrganizationActor(request);
    const templateTypes = await organizationWorkspaceService.listTemplateTypes();
    return successResponse({ templateTypes });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleOrganizationRouteError(err);
  }
}

export async function POST(request: Request) {
  try {
    guardOrganizationWorkspacePrisma();
    const actor = await resolveOrganizationActor(request);
    const body = await request.json();
    if (Array.isArray(body.orderedIds)) {
      const templateTypes = await organizationWorkspaceService.reorderTemplateTypes(
        body.orderedIds.map(String),
        actor,
      );
      return successResponse({ templateTypes });
    }
    const label = String(body.label ?? "").trim();
    if (!label) {
      return handleOrganizationRouteError(
        new Error("Template label is required"),
      );
    }
    const templateType = await organizationWorkspaceService.createTemplateType(label, actor);
    return successResponse(templateType, 201);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleOrganizationRouteError(err);
  }
}
