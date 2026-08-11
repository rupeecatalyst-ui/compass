import { fromAuthError } from "@/lib/api/auth-route-utils";
import { organizationWorkspaceService } from "@server/services/organization-workspace/organization-workspace.service";
import {
  guardOrganizationWorkspacePrisma,
  handleOrganizationRouteError,
  resolveOrganizationActor,
} from "../../../_lib/route-utils";

type RouteContext = { params: Promise<{ documentId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    guardOrganizationWorkspacePrisma();
    await resolveOrganizationActor(request);
    const { documentId } = await context.params;
    const content = await organizationWorkspaceService.getDocumentContent(documentId);
    return new Response(new Uint8Array(content.buffer), {
      status: 200,
      headers: {
        "Content-Type": content.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(content.originalFilename)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleOrganizationRouteError(err);
  }
}
