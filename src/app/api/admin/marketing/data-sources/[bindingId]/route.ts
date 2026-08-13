/**
 * CO-MARKETING-MKT-02 — Per-binding data source operations.
 * GET ?view=health|datasets|schema|preview|estimate
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { EnterpriseMarketingSafetyError } from "@/lib/enterprise-marketing-engine/safety";
import type { ApiResponse } from "@/types/api";
import { marketingDataSourceService } from "@server/services/enterprise-marketing-engine";

type Ctx = { params: Promise<{ bindingId: string }> };

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can manage Marketing data sources"), {
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
    code ?? "MARKETING_DATA_SOURCE_FAILED",
    err instanceof Error ? err.message : "Marketing data source request failed",
  );
}

export async function GET(request: Request, context: Ctx) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const { bindingId } = await context.params;
    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "health";
    const datasetId = url.searchParams.get("datasetId") ?? "";
    const actorCtx = { userId: actor.userId, organizationId: "default" as string | null };

    if (view === "health") {
      const health = await marketingDataSourceService.health(actorCtx, bindingId);
      return successResponse({ health });
    }

    if (view === "datasets") {
      const datasets = await marketingDataSourceService.discover(actorCtx, bindingId);
      return successResponse({ datasets });
    }

    if (!datasetId) {
      return errorResponse(400, "INVALID_INPUT", "datasetId is required for this view");
    }

    if (view === "schema") {
      const schema = await marketingDataSourceService.schema(actorCtx, bindingId, datasetId);
      return successResponse({ schema });
    }

    if (view === "preview") {
      const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
      const preview = await marketingDataSourceService.preview(
        actorCtx,
        bindingId,
        datasetId,
        Number.isFinite(limit) ? limit : 20,
      );
      return successResponse({ preview });
    }

    if (view === "estimate") {
      const estimate = await marketingDataSourceService.estimate(actorCtx, bindingId, datasetId);
      return successResponse({ estimate });
    }

    return errorResponse(
      400,
      "INVALID_VIEW",
      "view must be health | datasets | schema | preview | estimate",
    );
  } catch (err) {
    return fromUnknown(err);
  }
}
