import {
  errorResponse,
  fromAuthError,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { organizationWorkspaceService } from "@server/services/organization-workspace/organization-workspace.service";
import type {
  OrganizationDocumentPatchBody,
  OrganizationDocumentUploadBody,
} from "@/types/enterprise-organization-workspace";
import type { OrgDocCategoryId } from "@/types/organization-documents";
import {
  guardOrganizationWorkspacePrisma,
  handleOrganizationRouteError,
  resolveOrganizationActor,
} from "../_lib/route-utils";

export async function GET(request: Request) {
  try {
    guardOrganizationWorkspacePrisma();
    await resolveOrganizationActor(request);
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const documents = await organizationWorkspaceService.listDocuments(status ?? undefined);
    return successResponse({ documents });
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
    const body = (await request.json()) as OrganizationDocumentUploadBody;
    const documents = await organizationWorkspaceService.uploadDocuments(body, actor);
    return successResponse({ documents }, 201);
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
    const body = (await request.json()) as {
      action?: "archive" | "move";
      documentIds?: string[];
      categoryId?: OrgDocCategoryId;
      documentTypeId?: string;
      documentTypeLabel?: string;
    };

    if (body.action === "archive" && Array.isArray(body.documentIds)) {
      const archived = await organizationWorkspaceService.archiveDocuments(body.documentIds, actor);
      return successResponse({ archived });
    }

    if (
      body.action === "move" &&
      Array.isArray(body.documentIds) &&
      body.categoryId &&
      body.documentTypeId &&
      body.documentTypeLabel
    ) {
      let moved = 0;
      for (const id of body.documentIds) {
        await organizationWorkspaceService.patchDocument(
          id,
          {
            categoryId: body.categoryId,
            documentTypeId: body.documentTypeId,
            documentTypeLabel: body.documentTypeLabel,
          },
          actor,
        );
        moved += 1;
      }
      return successResponse({ moved });
    }

    return errorResponse(400, "INVALID_BULK_ACTION", "Unsupported bulk document action");
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleOrganizationRouteError(err);
  }
}
