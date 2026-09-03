/**
 * CO-C1-CONTEXT-LOCKED-DOCUMENT-WORKSPACE-008 — lock Document Workspace to canonical IDs.
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import {
  parseDocumentWorkspaceContextRequest,
  resolveDocumentWorkspaceContext,
} from "@server/services/document-workspace/document-workspace-context.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const result = await resolveDocumentWorkspaceContext({
      actor: { userId: actor.userId, role: actor.role },
      request: parseDocumentWorkspaceContextRequest(new URL(request.url)),
    });
    const status = result.ok
      ? 200
      : result.code === "UNAUTHORIZED"
        ? 403
        : result.code === "NOT_FOUND" || result.code === "DELETED"
          ? 404
          : result.code === "CROSS_ORGANIZATION" || result.code === "OPPORTUNITY_DEAL_MISMATCH"
            ? 409
            : 400;
    return successResponse(result, status);
  } catch (err) {
    if (typeof err === "object" && err && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    const status = Number((err as { statusCode?: number }).statusCode) || 500;
    return errorResponse(
      status,
      (err as { code?: string }).code || "DOCUMENT_WORKSPACE_CONTEXT_FAILED",
      err instanceof Error ? err.message : "Failed to lock Document Workspace context",
    );
  }
}
