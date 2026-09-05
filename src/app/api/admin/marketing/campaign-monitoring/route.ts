/**
 * CO-MARKETING-REDESIGN-015 — Campaign monitoring workspace API.
 * Durable records only. No live send. No fabricated provider metrics.
 */

import {
  errorResponse,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { fromMarketingUnknownError } from "@/lib/enterprise-marketing-engine/api-error";
import { resolveMarketingOrganizationId } from "@server/services/enterprise-marketing-engine/organization";
import { marketingCampaignMonitoringService } from "@server/services/enterprise-marketing-engine/campaign-monitoring.service";
import type { MarketingCampaignRecipientExplorerFilters } from "@/types/enterprise-marketing-campaign-monitoring";
import type { MarketingDurableLedgerStatus } from "@/types/enterprise-marketing-durability";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can open campaign monitoring"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

function fromUnknown(err: unknown) {
  return fromMarketingUnknownError(
    err,
    "MARKETING_CAMPAIGN_MONITORING_FAILED",
    err instanceof Error ? err.message : "Campaign monitoring request failed",
  );
}

async function actorCtx(actor: { userId: string; role: string }) {
  return {
    userId: actor.userId,
    role: actor.role,
    organizationId: await resolveMarketingOrganizationId(),
  };
}

function parseFilters(url: URL): MarketingCampaignRecipientExplorerFilters {
  const batchRaw = url.searchParams.get("batch");
  const batchNumber = batchRaw && batchRaw !== "all" ? Number.parseInt(batchRaw, 10) : null;
  return {
    deliveryState: (url.searchParams.get("deliveryState") as MarketingDurableLedgerStatus | "snapshotted" | "all" | null) ?? "all",
    batch: Number.isFinite(batchNumber) ? batchNumber : "all",
    attempt: (url.searchParams.get("attempt") as MarketingCampaignRecipientExplorerFilters["attempt"]) ?? "all",
    bounceCategory: (url.searchParams.get("bounceCategory") as MarketingCampaignRecipientExplorerFilters["bounceCategory"]) ?? "all",
    engagement: (url.searchParams.get("engagement") as MarketingCampaignRecipientExplorerFilters["engagement"]) ?? "all",
    suppression: (url.searchParams.get("suppression") as MarketingCampaignRecipientExplorerFilters["suppression"]) ?? "all",
    qualification: (url.searchParams.get("qualification") as MarketingCampaignRecipientExplorerFilters["qualification"]) ?? "all",
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  };
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const ctx = await actorCtx(actor);
    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "summary";
    const campaignId = url.searchParams.get("campaignId");
    const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
    const pageSize = Number.parseInt(url.searchParams.get("pageSize") ?? "50", 10);

    if (view === "recipients") {
      const result = await marketingCampaignMonitoringService.listRecipients(ctx, {
        campaignId,
        page: Number.isFinite(page) ? page : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : 50,
        filters: parseFilters(url),
      });
      return successResponse(result);
    }

    if (view === "timeline") {
      const recipientId = url.searchParams.get("recipientId") ?? "";
      if (!recipientId.trim()) {
        return errorResponse(400, "INVALID_INPUT", "recipientId is required");
      }
      const timeline = await marketingCampaignMonitoringService.getTimeline(ctx, recipientId);
      return successResponse(timeline);
    }

    if (view === "suppression-history") {
      const recipientId = url.searchParams.get("recipientId") ?? "";
      if (!recipientId.trim()) {
        return errorResponse(400, "INVALID_INPUT", "recipientId is required");
      }
      const history = await marketingCampaignMonitoringService.suppressionHistory(ctx, recipientId);
      return successResponse({ history });
    }

    if (view === "qualification") {
      const qualificationId = url.searchParams.get("qualificationId") ?? "";
      return successResponse(
        marketingCampaignMonitoringService.openQualification(ctx, { qualificationId }),
      );
    }

    const summary = await marketingCampaignMonitoringService.getSummary(ctx, { campaignId });
    return successResponse(summary);
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const ctx = await actorCtx(actor);
    const body = (await request.json().catch(() => ({}))) as {
      action?: "retry" | "suppress" | "open_qualification";
      campaignId?: string;
      ledgerId?: string;
      recipientId?: string;
      qualificationId?: string;
      reason?: string;
      confirmed?: boolean;
      confirmationPhrase?: string;
    };

    if (body.action === "retry") {
      if (!body.campaignId?.trim() || !body.ledgerId?.trim()) {
        return errorResponse(400, "INVALID_INPUT", "campaignId and ledgerId are required");
      }
      const result = await marketingCampaignMonitoringService.retryRecipient(ctx, {
        campaignId: body.campaignId,
        ledgerId: body.ledgerId,
        confirmed: body.confirmed,
        confirmationPhrase: body.confirmationPhrase,
      });
      return successResponse(result);
    }

    if (body.action === "suppress") {
      if (!body.recipientId?.trim()) {
        return errorResponse(400, "INVALID_INPUT", "recipientId is required");
      }
      const record = await marketingCampaignMonitoringService.suppressRecipient(ctx, {
        recipientId: body.recipientId,
        reason: body.reason ?? "",
      });
      return successResponse({ record });
    }

    if (body.action === "open_qualification") {
      return successResponse(
        marketingCampaignMonitoringService.openQualification(ctx, {
          qualificationId: body.qualificationId,
          recipientId: body.recipientId,
        }),
      );
    }

    return errorResponse(400, "INVALID_INPUT", "Unknown campaign monitoring action");
  } catch (err) {
    return fromUnknown(err);
  }
}
