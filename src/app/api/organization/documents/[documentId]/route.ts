import {
  errorResponse,
  fromAuthError,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { organizationWorkspaceService } from "@server/services/organization-workspace/organization-workspace.service";
import type { OrganizationDocumentPatchBody } from "@/types/enterprise-organization-workspace";
import {
  guardOrganizationWorkspacePrisma,
  handleOrganizationRouteError,
  resolveOrganizationActor,
} from "../../_lib/route-utils";

type RouteContext = { params: Promise<{ documentId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    guardOrganizationWorkspacePrisma();
    await resolveOrganizationActor(request);
    const { documentId } = await context.params;
    const document = await organizationWorkspaceService.getDocument(documentId);
    return successResponse(document);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleOrganizationRouteError(err);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    guardOrganizationWorkspacePrisma();
    const actor = await resolveOrganizationActor(request);
    const { documentId } = await context.params;
    const body = (await request.json()) as OrganizationDocumentPatchBody;

    const document = await organizationWorkspaceService.patchDocument(documentId, body, actor);
    return successResponse(document);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleOrganizationRouteError(err);
  }
}

export async function DELETE() {
  return errorResponse(405, "METHOD_NOT_ALLOWED", "Organization documents are archived, not deleted");
}
