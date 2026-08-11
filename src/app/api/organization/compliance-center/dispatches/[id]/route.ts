import { fromAuthError, successResponse } from "@/lib/api/auth-route-utils";
import { cccService } from "@server/services/corporate-compliance-center/ccc.service";
import {
  guardCccPrisma,
  handleCccRouteError,
  resolveCccActor,
} from "@/app/api/organization/compliance-center/_lib/route-utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  try {
    guardCccPrisma();
    await resolveCccActor(request);
    const { id } = await params;
    const dispatch = await cccService.getDispatch(id);
    return successResponse({ dispatch });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleCccRouteError(err);
  }
}
