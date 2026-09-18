import { successResponse } from "@/lib/api/auth-route-utils";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { policyAdminService } from "@server/services/credit-risk-policy/policy-admin.service";
import { policyRouteError, requirePolicyAdmin } from "../_lib";

type Context = { params: Promise<{ policyId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    requirePolicyAdmin(request);
    const { policyId } = await context.params;
    return successResponse(await policyAdminService.get(await resolvePilotOrganizationId(), policyId));
  } catch (error) { return policyRouteError(error); }
}

export async function PUT(request: Request, context: Context) {
  try {
    const actor = requirePolicyAdmin(request);
    const { policyId } = await context.params;
    return successResponse(await policyAdminService.save(await resolvePilotOrganizationId(), actor.userId, await request.json(), policyId));
  } catch (error) { return policyRouteError(error); }
}
