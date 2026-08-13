/**
 * CO-MARKETING-MKT-03 — Admin Marketing Audiences API.
 * Definitions + preview counts. No send. No Contact/Opportunity/Lead.
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { EnterpriseMarketingSafetyError } from "@/lib/enterprise-marketing-engine/safety";
import type { ApiResponse } from "@/types/api";
import type {
  MarketingEligibilityRules,
  MarketingFilterDefinition,
  MarketingSuppressionPolicy,
} from "@/types/enterprise-marketing-audience";
import { marketingAudienceService } from "@server/services/enterprise-marketing-engine";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can manage Marketing audiences"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

function fromUnknown(err: unknown) {
  if (err instanceof EnterpriseMarketingSafetyError) {
    return errorResponse(403, err.code, err.message);
  }
  const statusCode = (err as { statusCode?: number }).statusCode;
  const code = (err as { code?: string }).code;
  if (statusCode === 401 || statusCode === 403) {
    return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
  }
  return errorResponse(
    statusCode && statusCode >= 400 && statusCode < 600 ? statusCode : 500,
    code ?? "MARKETING_AUDIENCE_FAILED",
    err instanceof Error ? err.message : "Marketing audience request failed",
  );
}

const actorCtx = (actor: { userId: string }) => ({
  userId: actor.userId,
  organizationId: "default" as string | null,
});

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "list";

    if (view === "suppressions") {
      const suppressions = marketingAudienceService.listSuppressions(actorCtx(actor));
      return successResponse({ suppressions });
    }

    const audiences = marketingAudienceService.list(actorCtx(actor));
    return successResponse({ audiences });
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const body = (await request.json().catch(() => ({}))) as {
      action?: "upsert" | "preview" | "delete";
      id?: string;
      name?: string;
      description?: string | null;
      bindingId?: string;
      datasetId?: string;
      datasetDisplayName?: string | null;
      filterDefinition?: MarketingFilterDefinition;
      suppressionPolicy?: MarketingSuppressionPolicy;
      eligibilityRules?: MarketingEligibilityRules;
      audienceId?: string;
    };

    const action = body.action ?? "upsert";

    if (action === "delete") {
      if (!body.audienceId && !body.id) {
        return errorResponse(400, "INVALID_INPUT", "audienceId is required");
      }
      const result = marketingAudienceService.remove(
        actorCtx(actor),
        (body.audienceId ?? body.id) as string,
      );
      return successResponse(result);
    }

    if (action === "preview") {
      if (body.audienceId) {
        const preview = await marketingAudienceService.previewSaved(
          actorCtx(actor),
          body.audienceId,
        );
        return successResponse({ preview });
      }
      if (!body.bindingId || !body.datasetId || !body.filterDefinition) {
        return errorResponse(
          400,
          "INVALID_INPUT",
          "preview requires audienceId OR bindingId + datasetId + filterDefinition",
        );
      }
      const preview = await marketingAudienceService.previewDraft(actorCtx(actor), {
        bindingId: body.bindingId,
        datasetId: body.datasetId,
        filterDefinition: body.filterDefinition,
        suppressionPolicy: body.suppressionPolicy,
        eligibilityRules: body.eligibilityRules,
      });
      return successResponse({ preview });
    }

    // upsert
    if (!body.name || !body.bindingId || !body.datasetId) {
      return errorResponse(400, "INVALID_INPUT", "name, bindingId, and datasetId are required");
    }
    const audience = marketingAudienceService.upsert(actorCtx(actor), {
      id: body.id,
      name: body.name,
      description: body.description,
      bindingId: body.bindingId,
      datasetId: body.datasetId,
      datasetDisplayName: body.datasetDisplayName,
      filterDefinition: body.filterDefinition,
      suppressionPolicy: body.suppressionPolicy,
      eligibilityRules: body.eligibilityRules,
    });
    return successResponse({ audience });
  } catch (err) {
    return fromUnknown(err);
  }
}
