import { requireAccessToken, successResponse, errorResponse } from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { enterpriseOpportunityApiGuard, mapOpportunityRouteError } from "@/app/api/enterprise-opportunities/_lib/route-utils";
import { resolveDocumentWorkspaceAccess } from "@server/services/document-workspace/document-workspace-access.service";
import { searchEmailRecipientDirectory } from "@server/services/enterprise-communication-center/recipient-directory.service";

/** Read-only autocomplete, scoped to the currently authorized workspace. */
export async function GET(request: Request) {
  try {
    if (!isEnterprisePersistencePrisma()) return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma persistence");
    enterpriseOpportunityApiGuard();
    const actor = requireAccessToken(request), url = new URL(request.url);
    const context = await resolveDocumentWorkspaceAccess({
      userId: actor.userId, capability: "share", opportunityId: url.searchParams.get("opportunityId"),
      dealId: url.searchParams.get("dealId"),
    });
    return successResponse(await searchEmailRecipientDirectory(context.organizationId, url.searchParams.get("search") || ""));
  } catch (error) {
    const mapped = mapOpportunityRouteError(error);
    return errorResponse(mapped.status, mapped.body.error?.code || "RECIPIENT_SEARCH_FAILED", mapped.body.error?.message || "Recipient search failed");
  }
}
