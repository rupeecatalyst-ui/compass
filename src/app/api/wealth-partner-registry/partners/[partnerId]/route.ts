import {
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import type { UpdateWealthPartnerInput } from "@/types/enterprise-wealth-partner-registry";
import { wealthPartnerRegistryService } from "@server/services/wealth-partner-registry";
import {
  mapRouteError,
  requireWealthPartnerWriteAccess,
  respondMappedError,
  wealthPartnerPersistenceGuard,
} from "../../_lib/route-utils";

type Ctx = { params: Promise<{ partnerId: string }> };

export async function GET(request: Request, ctx: Ctx) {
  try {
    wealthPartnerPersistenceGuard();
    requireAccessToken(request);
    const { partnerId } = await ctx.params;
    const partner = await wealthPartnerRegistryService.getPartner(partnerId);
    if (!partner) {
      return Response.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Wealth Partner not found" },
        },
        { status: 404 },
      );
    }
    return successResponse(partner);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped?.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return respondMappedError(err);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    wealthPartnerPersistenceGuard();
    const actor = requireAccessToken(request);
    requireWealthPartnerWriteAccess(actor);
    const { partnerId } = await ctx.params;
    const body = (await request.json()) as Omit<UpdateWealthPartnerInput, "modifiedBy">;
    const updated = await wealthPartnerRegistryService.updatePartner(partnerId, {
      ...body,
      modifiedBy: actor.userId,
    });
    return successResponse(updated);
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
