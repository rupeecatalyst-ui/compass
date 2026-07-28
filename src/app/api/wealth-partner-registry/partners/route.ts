import {
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import type { CreateWealthPartnerInput } from "@/types/enterprise-wealth-partner-registry";
import { wealthPartnerRegistryService } from "@server/services/wealth-partner-registry";
import {
  mapRouteError,
  parseListQuery,
  requireWealthPartnerWriteAccess,
  respondMappedError,
  wealthPartnerPersistenceGuard,
} from "../_lib/route-utils";

export async function GET(request: Request) {
  try {
    wealthPartnerPersistenceGuard();
    requireAccessToken(request);
    const url = new URL(request.url);
    const result = await wealthPartnerRegistryService.queryPartners(parseListQuery(url));
    return successResponse(result);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped?.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return respondMappedError(err);
  }
}

export async function POST(request: Request) {
  const endpoint = "/api/wealth-partner-registry/partners";
  let payload: unknown;
  try {
    wealthPartnerPersistenceGuard();
    const actor = requireAccessToken(request);
    requireWealthPartnerWriteAccess(actor);
    const body = (await request.json()) as Omit<CreateWealthPartnerInput, "createdBy">;
    payload = {
      identityKind: body.identityKind,
      contactId: body.contactId ?? null,
      companyId: body.companyId ?? null,
      partnerType: body.partnerType,
      displayName: body.displayName,
    };
    console.info("[wealth-partner-registry] create request", {
      endpoint,
      method: "POST",
      payload,
      actorUserId: actor.userId,
    });
    const created = await wealthPartnerRegistryService.createPartner({
      ...body,
      createdBy: actor.userId,
    });
    console.info("[wealth-partner-registry] create success", {
      endpoint,
      status: 200,
      partnerId: created.id,
      code: created.code,
    });
    return successResponse(created);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped?.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    if (mapped?.status === 400 || mapped?.status === 409) {
      console.warn("[wealth-partner-registry] create rejected", {
        endpoint,
        status: mapped.status,
        payload,
        message: mapped.body?.error?.message,
      });
      return Response.json(mapped.body, { status: mapped.status });
    }
    return respondMappedError(err, { endpoint, method: "POST", payload });
  }
}
