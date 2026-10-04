import { successResponse } from "@/lib/api/auth-route-utils";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { policyAdminService } from "@server/services/credit-risk-policy/policy-admin.service";
import { policyRouteError, requirePolicyAdmin } from "./_lib";

export async function GET(request: Request) {
  try {
    requirePolicyAdmin(request);
    return successResponse(await policyAdminService.list(await resolvePilotOrganizationId()));
  } catch (error) { return policyRouteError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = requirePolicyAdmin(request);
    const record = await policyAdminService.save(await resolvePilotOrganizationId(), actor.userId, await request.json());
    return successResponse(record, 201);
  } catch (error) { return policyRouteError(error); }
}
