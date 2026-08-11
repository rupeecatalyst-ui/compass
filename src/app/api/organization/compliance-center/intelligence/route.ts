import { fromAuthError, successResponse } from "@/lib/api/auth-route-utils";
import { cccService } from "@server/services/corporate-compliance-center/ccc.service";
import {
  guardCccPrisma,
  handleCccRouteError,
  resolveCccActor,
} from "@/app/api/organization/compliance-center/_lib/route-utils";

export async function GET(request: Request) {
  try {
    guardCccPrisma();
    await resolveCccActor(request);
    const intelligence = await cccService.deriveComplianceIntelligence();
    return successResponse({ intelligence });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleCccRouteError(err);
  }
}
