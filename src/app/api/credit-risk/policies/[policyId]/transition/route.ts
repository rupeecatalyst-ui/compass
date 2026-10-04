import { z } from "zod";
import { successResponse } from "@/lib/api/auth-route-utils";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { policyAdminService } from "@server/services/credit-risk-policy/policy-admin.service";
import { policyRouteError, requirePolicyAdmin } from "../../_lib";

type Context = { params: Promise<{ policyId: string }> };
const input = z.object({ to: z.enum(["validated", "testing", "approved", "published"]) });

export async function POST(request: Request, context: Context) {
  try {
    const actor = requirePolicyAdmin(request);
    const { policyId } = await context.params;
    const { to } = input.parse(await request.json());
    return successResponse(await policyAdminService.transition(await resolvePilotOrganizationId(), actor.userId, policyId, to));
  } catch (error) { return policyRouteError(error); }
}
