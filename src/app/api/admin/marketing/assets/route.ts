/**
 * CO-MARKETING-REDESIGN-011 — Admin Marketing Asset Library API.
 * Campaign collateral only. Separate from Document Registry. No campaign send.
 * Fixture storage only — never Hostinger or an external provider.
 */

import {
  errorResponse,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { fromMarketingUnknownError } from "@/lib/enterprise-marketing-engine/api-error";
import { MARKETING_PERMISSIONS } from "@/constants/enterprise-marketing-engine/permissions";
import { assertMarketingPermission } from "@/lib/enterprise-marketing-engine/permissions";
import type { MarketingAssetCategory } from "@/constants/enterprise-marketing-engine/content";
import type {
  MarketingAssetApprovalStatus,
  MarketingAssetProductCategory,
  MarketingAssetType,
} from "@/constants/enterprise-marketing-engine/assets";
import { resolveMarketingOrganizationId } from "@server/services/enterprise-marketing-engine/organization";
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
  return fromMarketingUnknownError(
    err,
    "MARKETING_ASSET_FAILED",
    err instanceof Error ? err.message : "Marketing asset request failed",
  );
}

async function actorCtx(actor: { userId: string; role: string }) {
  return {
    userId: actor.userId,
    role: actor.role,
    organizationId: await resolveMarketingOrganizationId(),
  };
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const url = new URL(request.url);
    const ctx = await actorCtx(actor);
    assertMarketingPermission(ctx, MARKETING_PERMISSIONS.ASSET_MANAGE);
    const assetId = url.searchParams.get("id");
    if (assetId) {
      const asset = marketingAssetService.get(ctx, assetId);
      if (url.searchParams.get("view") === "usage") {
        return successResponse({ asset, usage: asset.usageReferences });
      }
      return successResponse({ asset });
    }
    const assets = marketingAssetService.list(ctx, {
      includeArchived: url.searchParams.get("includeArchived") === "1",
      search: url.searchParams.get("search"),
      assetType: (url.searchParams.get("assetType") as MarketingAssetType | "all" | null) ?? "all",
      productCategory:
        (url.searchParams.get("productCategory") as MarketingAssetProductCategory | "all" | null) ??
        "all",
      approvalStatus:
        (url.searchParams.get("approvalStatus") as MarketingAssetApprovalStatus | "all" | null) ??
        "all",
    });
    return successResponse({ assets });
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const ctx = await actorCtx(actor);
    assertMarketingPermission(ctx, MARKETING_PERMISSIONS.ASSET_MANAGE);
    const body = (await request.json().catch(() => ({}))) as {
      action?:
        | "upload"
        | "archive"
        | "set_active"
        | "replace"
        | "version"
        | "select_for_campaign"
        | "set_approval"
        | "delete";
      assetId?: string;
      title?: string;
      name?: string;
      mimeType?: string;
      category?: MarketingAssetCategory;
      assetType?: MarketingAssetType;
      tags?: string[];
      url?: string;
      byteSize?: number;
      active?: boolean;
      altText?: string;
      productCategory?: MarketingAssetProductCategory;
      width?: number | null;
      height?: number | null;
      filename?: string;
      approvalStatus?: MarketingAssetApprovalStatus;
    };

    const action = body.action ?? "upload";

    if (action === "delete") {
      marketingAssetService.delete(ctx, body.assetId ?? "");
    }

    if (action === "archive") {
      if (!body.assetId) {
        return errorResponse(400, "INVALID_INPUT", "assetId is required");
      }
      assertMarketingPermission(ctx, MARKETING_PERMISSIONS.ASSET_MANAGE);
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

    if (action === "replace" || action === "version") {
      if (!body.assetId || !body.url) {
        return errorResponse(400, "INVALID_INPUT", "assetId and url are required");
      }
      const asset = marketingAssetService.replace(ctx, body.assetId, {
        url: body.url,
        mimeType: body.mimeType ?? "image/png",
        byteSize: body.byteSize,
        altText: body.altText,
        width: body.width,
        height: body.height,
        filename: body.filename,
      });
      return successResponse({ asset });
    }

    if (action === "select_for_campaign") {
      if (!body.assetId) {
        return errorResponse(400, "INVALID_INPUT", "assetId is required");
      }
      const selected = marketingAssetService.selectForCampaign(ctx, body.assetId);
      return successResponse({ selected });
    }

    if (action === "set_approval") {
      if (!body.assetId || !body.approvalStatus) {
        return errorResponse(400, "INVALID_INPUT", "assetId and approvalStatus are required");
      }
      const asset = marketingAssetService.setApproval(ctx, body.assetId, body.approvalStatus);
      return successResponse({ asset });
    }

    if (!(body.title?.trim() || body.name?.trim()) || !body.url || !body.category) {
      return errorResponse(400, "INVALID_INPUT", "title, url, and category are required");
    }
    const asset = marketingAssetService.upload(ctx, {
      title: body.title ?? body.name ?? "",
      name: body.name ?? body.title,
      mimeType: body.mimeType ?? "",
      category: body.category,
      assetType: body.assetType,
      tags: body.tags,
      url: body.url,
      byteSize: body.byteSize,
      altText: body.altText,
      productCategory: body.productCategory,
      width: body.width,
      height: body.height,
      filename: body.filename,
    });
    return successResponse({ asset });
  } catch (err) {
    return fromUnknown(err);
  }
}
