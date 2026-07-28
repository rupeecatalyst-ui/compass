import {
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import type { CreateWealthPartnerCommissionInput } from "@/types/enterprise-wealth-partner-registry";
import { wealthPartnerRegistryService } from "@server/services/wealth-partner-registry";
import {
  mapRouteError,
  requireWealthPartnerWriteAccess,
  respondMappedError,
  wealthPartnerPersistenceGuard,
} from "../../../_lib/route-utils";

type Ctx = { params: Promise<{ partnerId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    wealthPartnerPersistenceGuard();
    const actor = requireAccessToken(request);
    requireWealthPartnerWriteAccess(actor);
    const { partnerId } = await ctx.params;
    const body = (await request.json()) as Omit<
      CreateWealthPartnerCommissionInput,
      "createdBy"
    >;
    const created = await wealthPartnerRegistryService.createCommission(partnerId, {
      ...body,
      createdBy: actor.userId,
    });
    return successResponse(created);
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
