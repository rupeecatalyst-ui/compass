import { errorResponse, fromAuthError, requireAccessToken, successResponse } from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { durablePolicyRepository } from "@server/repositories/credit-risk-policy/durable-policy.repository";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  lenderRegistryPersistenceGuard,
  mapRouteError,
  requireLenderRegistryAdmin,
} from "../_lib/route-utils";

export async function GET(request: Request) {
  try {
    lenderRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireLenderRegistryAdmin(actor);
    const versions = await durablePolicyRepository.listPublishedVersions(await resolvePilotOrganizationId());
    return successResponse(versions.map((version) => ({
      id: version.id,
      policyId: version.policyId,
      policyCode: version.policyCode,
      name: version.name,
      versionNumber: version.versionNumber,
    })));
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(500, "PUBLISHED_POLICY_VERSIONS_QUERY_FAILED", "Failed to query published policy versions");
  }
}
