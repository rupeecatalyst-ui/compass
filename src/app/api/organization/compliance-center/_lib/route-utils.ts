/**
 * CO-CCC-001 — Corporate Compliance Center API route helpers.
 */
export {
  guardOrganizationWorkspacePrisma as guardCccPrisma,
  resolveOrganizationActor as resolveCccActor,
} from "@/app/api/organization/_lib/route-utils";

import { errorResponse } from "@/lib/api/auth-route-utils";
import { handleOrganizationRouteError } from "@/app/api/organization/_lib/route-utils";
import { CccServiceError } from "@server/services/corporate-compliance-center/ccc.service";

export function handleCccRouteError(err: unknown) {
  if (err instanceof CccServiceError) {
    return errorResponse(err.statusCode, err.code, err.message);
  }
  return handleOrganizationRouteError(err);
}
