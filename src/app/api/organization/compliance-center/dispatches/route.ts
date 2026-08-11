import { fromAuthError, successResponse } from "@/lib/api/auth-route-utils";
import type { CccDispatchCreateBody } from "@/types/corporate-compliance-center";
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
    const dispatches = await cccService.listDispatches();
    return successResponse({ dispatches });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleCccRouteError(err);
  }
}

export async function POST(request: Request) {
  try {
    guardCccPrisma();
    const actor = await resolveCccActor(request);
    const body = (await request.json()) as CccDispatchCreateBody;
    const dispatch = await cccService.createDispatch(body, actor);
    return successResponse({ dispatch }, 201);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return handleCccRouteError(err);
  }
}
