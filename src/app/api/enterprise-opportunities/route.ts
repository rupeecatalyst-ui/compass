import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { enterpriseOpportunityService } from "@server/services/enterprise-opportunity";
import {
  enterpriseOpportunityApiGuard,
  mapOpportunityRouteError,
} from "./_lib/route-utils";

/** GET — Search Opportunities · POST — Create Opportunity (never creates Deal) */
export async function GET(request: Request) {
  try {
    enterpriseOpportunityApiGuard();
    const actor = requireAccessToken(request);
    void actor;
    const url = new URL(request.url);
    const primaryContactId = url.searchParams.get("primaryContactId") ?? undefined;
    const companyId = url.searchParams.get("companyId") ?? undefined;
    const findActive = url.searchParams.get("findActive") === "1";
    const findOpenDraft = url.searchParams.get("findOpenDraft") === "1";
    if (findOpenDraft && companyId) {
      const draft = await enterpriseOpportunityService.findOpenDraftForCompany({
        companyId,
      });
      return successResponse({ item: draft });
    }
    if (findOpenDraft && primaryContactId) {
      const draft = await enterpriseOpportunityService.findOpenDraftForContact({
        primaryContactId,
      });
      return successResponse({ item: draft });
    }
    if (findActive && companyId) {
      const active = await enterpriseOpportunityService.findActiveForCompanyProduct({
        companyId,
        productId: url.searchParams.get("productId"),
        productCode: url.searchParams.get("productCode"),
        productLabel: url.searchParams.get("productLabel"),
      });
      return successResponse({ item: active });
    }
    if (findActive && primaryContactId) {
      const active = await enterpriseOpportunityService.findActiveForContactProduct({
        primaryContactId,
        productId: url.searchParams.get("productId"),
        productCode: url.searchParams.get("productCode"),
        productLabel: url.searchParams.get("productLabel"),
      });
      return successResponse({ item: active });
    }
    const result = await enterpriseOpportunityService.searchOpportunities({
      q: url.searchParams.get("q") ?? undefined,
      primaryContactId,
      companyId,
      requirementStage: url.searchParams.get("requirementStage") ?? undefined,
      sourceCode: url.searchParams.get("sourceCode") ?? undefined,
      sourceBucket: (url.searchParams.get("sourceBucket") as
        | "direct"
        | "channel_partner"
        | "referral"
        | "other"
        | null) ?? undefined,
      freshLoginToday: url.searchParams.get("freshLogin") === "today",
      limit: url.searchParams.get("limit")
        ? Number(url.searchParams.get("limit"))
        : undefined,
      offset: url.searchParams.get("offset")
        ? Number(url.searchParams.get("offset"))
        : undefined,
    });
    return successResponse(result);
  } catch (err) {
    const mapped = mapOpportunityRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      mapped.status,
      "OPPORTUNITY_SEARCH_FAILED",
      mapped.body.error?.message ?? "Search failed",
    );
  }
}

export async function POST(request: Request) {
  try {
    enterpriseOpportunityApiGuard();
    const actor = requireAccessToken(request);
    const body = (await request.json()) as Record<string, unknown>;
    const created = await enterpriseOpportunityService.createOpportunity(
      body,
      actor.userId,
    );
    return successResponse(created, 201);
  } catch (err) {
    const mapped = mapOpportunityRouteError(err);
    if (
      mapped.status === 401 ||
      mapped.status === 403 ||
      mapped.status === 404 ||
      mapped.status === 503
    ) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    if (mapped.status === 409) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      mapped.status,
      mapped.body.error?.code ?? "OPPORTUNITY_CREATE_FAILED",
      mapped.body.error?.message ?? "Failed to create Opportunity",
    );
  }
}
