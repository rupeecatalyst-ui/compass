/**
 * CO-C1-CONTEXT-LOCKED-DOCUMENT-WORKSPACE-008 / 014B — lock Document Workspace to canonical IDs.
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { parseDocumentWorkspaceContextRequest } from "@server/services/document-workspace/document-workspace-context.service";
import { resolveDocumentWorkspaceAccess } from "@server/services/document-workspace/document-workspace-access.service";
import {
  documentWorkspaceHttpError,
  isTokenAuthFailure,
} from "@/lib/document-workspace/access-decision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const parsed = parseDocumentWorkspaceContextRequest(new URL(request.url));
    const authorised = await resolveDocumentWorkspaceAccess({
      userId: actor.userId,
      capability: "view",
      claimedOrganizationId: parsed.organizationId,
      opportunityId: parsed.opportunityId,
      dealId: parsed.dealId,
      contactId: parsed.contactId,
      companyId: parsed.companyId,
      documentId: parsed.documentId,
    });
    return successResponse({ ok: true, context: authorised.lock });
  } catch (err) {
    if (isTokenAuthFailure(err)) {
      return fromAuthError(err);
    }
    const mapped = documentWorkspaceHttpError(err);
    return errorResponse(mapped.status, mapped.code, mapped.message);
  }
}
