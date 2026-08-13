/**
 * CO-MARKETING-MKT-04 — Admin Marketing Asset Library API.
 * Separate from Document Registry. No campaign send.
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { EnterpriseMarketingSafetyError } from "@/lib/enterprise-marketing-engine/safety";
import type { MarketingAssetCategory } from "@/constants/enterprise-marketing-engine/content";
import type { ApiResponse } from "@/types/api";
import { marketingAssetService } from "@server/services/enterprise-marketing-engine";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can manage Marketing assets"), {
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
    code ?? "MARKETING_ASSET_FAILED",
    err instanceof Error ? err.message : "Marketing asset request failed",
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
    const includeArchived = url.searchParams.get("includeArchived") === "1";
    const assets = marketingAssetService.list(actorCtx(actor), includeArchived);
    return successResponse({ assets });
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const body = (await request.json().catch(() => ({}))) as {
      action?: "upload" | "archive" | "set_active";
      assetId?: string;
      title?: string;
      mimeType?: string;
      category?: MarketingAssetCategory;
      tags?: string[];
      url?: string;
      byteSize?: number;
      active?: boolean;
    };

    const action = body.action ?? "upload";
    const ctx = actorCtx(actor);

    if (action === "archive") {
      if (!body.assetId) {
        return errorResponse(400, "INVALID_INPUT", "assetId is required");
      }
      const asset = marketingAssetService.archive(ctx, body.assetId);
      return successResponse({ asset });
    }

    if (action === "set_active") {
      if (!body.assetId || typeof body.active !== "boolean") {
        return errorResponse(400, "INVALID_INPUT", "assetId and active are required");
      }
      const asset = marketingAssetService.setActive(ctx, body.assetId, body.active);
      return successResponse({ asset });
    }

    if (!body.title?.trim() || !body.url || !body.category) {
      return errorResponse(400, "INVALID_INPUT", "title, url, and category are required");
    }
    const asset = marketingAssetService.upload(ctx, {
      title: body.title,
      mimeType: body.mimeType ?? "application/octet-stream",
      category: body.category,
      tags: body.tags,
      url: body.url,
      byteSize: body.byteSize,
    });
    return successResponse({ asset });
  } catch (err) {
    return fromUnknown(err);
  }
}
