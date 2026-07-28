import {
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { wealthPartnerRegistryService } from "@server/services/wealth-partner-registry";
import {
  mapRouteError,
  respondMappedError,
  wealthPartnerPersistenceGuard,
} from "../../../_lib/route-utils";

type Ctx = { params: Promise<{ partnerId: string }> };

export async function GET(request: Request, ctx: Ctx) {
  try {
    wealthPartnerPersistenceGuard();
    requireAccessToken(request);
    const { partnerId } = await ctx.params;
    const bundle = await wealthPartnerRegistryService.getWorkspace(partnerId);
    return successResponse(bundle);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped?.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    if (mapped?.status === 400) {
      return Response.json(mapped.body, { status: 400 });
    }
    return respondMappedError(err);
  }
}
