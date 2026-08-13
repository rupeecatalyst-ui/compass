/**
 * CO-MARKETING-MKT-04 / MKT-05 — Admin Marketing Campaigns API.
 * Authoring + lifecycle. SAVE never publishes. No send / test send.
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
  MarketingContentDocument,
  MarketingNotificationPlaceholder,
  MarketingRoutingPlaceholder,
  MarketingSchedulePlaceholder,
  MarketingSenderIdentityDraft,
} from "@/types/enterprise-marketing-campaign";
import type {
  MarketingCampaignAction,
  MarketingChannel,
} from "@/constants/enterprise-marketing-engine";
import { marketingCampaignService } from "@server/services/enterprise-marketing-engine";
import { marketingCampaignStore } from "@server/services/enterprise-marketing-engine/campaign-store";
import { marketingExecutionService } from "@server/services/enterprise-marketing-engine/execution.service";
import type { MarketingBatchPolicy } from "@/types/enterprise-marketing-execution";
import {
  MARKETING_CONTROLLED_TEST_BATCH_SIZES,
  MARKETING_DEFAULT_BATCH_POLICY,
} from "@/constants/enterprise-marketing-engine/execution";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can manage Marketing campaigns"), {
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
    code ?? "MARKETING_CAMPAIGN_FAILED",
    err instanceof Error ? err.message : "Marketing campaign request failed",
  );
}

const actorCtx = (
  actor: { userId: string; role: string },
  marketingPermissions?: string[],
) => ({
  userId: actor.userId,
  role: actor.role,
  organizationId: "default" as string | null,
  marketingPermissions,
});

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const url = new URL(request.url);
    const campaignId = url.searchParams.get("id");
    const view = url.searchParams.get("view");
    const ctx = actorCtx(actor);

    if (view === "templates") {
      const templates = marketingCampaignService.listTemplates(ctx);
      return successResponse({ templates });
    }
    if (view === "reusable-blocks") {
      const blocks = marketingCampaignService.listReusableBlocks(ctx);
      return successResponse({ blocks });
    }
    if (view === "pre-publish" && campaignId) {
      const checks = marketingCampaignService.prePublishChecks(ctx, campaignId);
      return successResponse({ checks });
    }
    if (campaignId) {
      const detail = marketingCampaignService.get(ctx, campaignId);
      if (view === "execution") {
        const summary = marketingExecutionService.getSummary(campaignId);
        return successResponse({ ...detail, execution: summary });
      }
      return successResponse(detail);
    }
    const campaigns = marketingCampaignService.list(ctx);
    return successResponse({ campaigns });
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const body = (await request.json().catch(() => ({}))) as {
      action?:
        | "create"
        | "save"
        | "clone"
        | "preview"
        | "save_template"
        | "save_reusable_block"
        | "transition"
        | "pre_publish_checks"
        | "restore_version"
        | "configure_execution"
        | "run_test_batch"
        | "run_next_batch"
        | "execution_summary";
      /** Lifecycle action when action=transition */
      lifecycleAction?: MarketingCampaignAction;
      campaignId?: string;
      versionId?: string;
      name?: string;
      objective?: string | null;
      internalDescription?: string | null;
      product?: string | null;
      audienceId?: string | null;
      channel?: MarketingChannel;
      templateId?: string;
      sender?: MarketingSenderIdentityDraft;
      schedulePlaceholder?: MarketingSchedulePlaceholder;
      routingPlaceholder?: MarketingRoutingPlaceholder;
      notificationPlaceholder?: MarketingNotificationPlaceholder;
      batchPolicy?: MarketingBatchPolicy | null;
      testBatchSize?: number;
      resetCursor?: boolean;
      subject?: string;
      previewText?: string;
      content?: MarketingContentDocument;
      disclaimer?: string | null;
      trackingEnabled?: boolean;
      plainTextOverride?: string | null;
      utm?: {
        source: string;
        medium: string;
        campaign: string;
        content?: string | null;
        term?: string | null;
      } | null;
      ctaLabel?: string | null;
      ctaUrl?: string | null;
      templateName?: string;
      personalization?: Record<string, string>;
      block?: MarketingContentDocument["blocks"][number];
      blockName?: string;
      resumeTarget?: "RUNNING" | "SCHEDULED";
      note?: string;
      /** Test / EUM grant overrides — never enables send. */
      marketingPermissions?: string[];
      /** Rejected if present — SAVE must not publish. */
      status?: string;
    };

    const action = body.action ?? "create";
    const ctx = actorCtx(actor, body.marketingPermissions);

    if (body.status !== undefined && action === "save") {
      return errorResponse(
        400,
        "SAVE_CANNOT_PUBLISH",
        "SAVE cannot change lifecycle status. Use action=transition with an explicit lifecycleAction (e.g. APPROVE).",
      );
    }

    if (action === "create") {
      if (!body.name?.trim()) {
        return errorResponse(400, "INVALID_INPUT", "name is required");
      }
      const detail = marketingCampaignService.create(ctx, {
        name: body.name,
        objective: body.objective,
        product: body.product,
        audienceId: body.audienceId,
        channel: body.channel,
        templateId: body.templateId,
      });
      return successResponse(detail);
    }

    if (action === "save") {
      if (!body.campaignId) {
        return errorResponse(400, "INVALID_INPUT", "campaignId is required");
      }
      const detail = marketingCampaignService.save(ctx, body.campaignId, {
        name: body.name,
        objective: body.objective,
        internalDescription: body.internalDescription,
        product: body.product,
        audienceId: body.audienceId,
        channel: body.channel,
        sender: body.sender,
        schedulePlaceholder: body.schedulePlaceholder,
        routingPlaceholder: body.routingPlaceholder,
        notificationPlaceholder: body.notificationPlaceholder,
        batchPolicy: body.batchPolicy,
        subject: body.subject,
        previewText: body.previewText,
        content: body.content,
        disclaimer: body.disclaimer,
        trackingEnabled: body.trackingEnabled,
        plainTextOverride: body.plainTextOverride,
        utm: body.utm,
        ctaLabel: body.ctaLabel,
        ctaUrl: body.ctaUrl,
      });
      return successResponse(detail);
    }

    if (action === "restore_version") {
      if (!body.campaignId || !body.versionId) {
        return errorResponse(
          400,
          "INVALID_INPUT",
          "campaignId and versionId are required",
        );
      }
      const detail = marketingCampaignService.restoreVersionAsDraft(
        ctx,
        body.campaignId,
        body.versionId,
      );
      return successResponse(detail);
    }

    if (action === "transition") {
      if (!body.campaignId || !body.lifecycleAction) {
        return errorResponse(
          400,
          "INVALID_INPUT",
          "campaignId and lifecycleAction are required",
        );
      }
      if (body.lifecycleAction === "SAVE") {
        return errorResponse(
          400,
          "USE_SAVE",
          "Use action=save for persistence. SAVE never publishes.",
        );
      }
      const detail = marketingCampaignService.transition(
        ctx,
        body.campaignId,
        body.lifecycleAction,
        { resumeTarget: body.resumeTarget, note: body.note },
      );
      return successResponse(detail);
    }

    if (action === "pre_publish_checks") {
      if (!body.campaignId) {
        return errorResponse(400, "INVALID_INPUT", "campaignId is required");
      }
      const checks = marketingCampaignService.prePublishChecks(ctx, body.campaignId);
      return successResponse({ checks });
    }

    if (action === "clone") {
      if (!body.campaignId) {
        return errorResponse(400, "INVALID_INPUT", "campaignId is required");
      }
      const detail = marketingCampaignService.clone(ctx, body.campaignId, body.name);
      return successResponse(detail);
    }

    if (action === "preview") {
      if (!body.campaignId) {
        return errorResponse(400, "INVALID_INPUT", "campaignId is required");
      }
      const preview = marketingCampaignService.preview(
        ctx,
        body.campaignId,
        body.personalization,
      );
      return successResponse({ preview });
    }

    if (action === "save_template") {
      if (!body.campaignId || !body.templateName?.trim()) {
        return errorResponse(400, "INVALID_INPUT", "campaignId and templateName are required");
      }
      const template = marketingCampaignService.saveAsTemplate(
        ctx,
        body.campaignId,
        body.templateName,
      );
      return successResponse({ template });
    }

    if (action === "configure_execution") {
      if (!body.campaignId) {
        return errorResponse(400, "INVALID_INPUT", "campaignId is required");
      }
      const detail = marketingCampaignService.get(ctx, body.campaignId);
      const campaign = detail.campaign;
      const org = ctx.organizationId ?? "default";
      const base = body.batchPolicy ?? campaign.batchPolicy ?? MARKETING_DEFAULT_BATCH_POLICY;
      const startAt =
        body.schedulePlaceholder?.startAt ??
        campaign.schedulePlaceholder?.startAt ??
        base.startAt ??
        null;
      const policy: MarketingBatchPolicy = {
        ...MARKETING_DEFAULT_BATCH_POLICY,
        ...base,
        startAt,
      };
      const lease = marketingExecutionService.configure(body.campaignId, org, policy, {
        resetCursor: body.resetCursor === true,
      });
      marketingCampaignStore.updateCampaign(body.campaignId, org, {
        schedulePlaceholder: {
          enabled: true,
          startAt,
          notes:
            body.schedulePlaceholder?.notes ??
            campaign.schedulePlaceholder?.notes ??
            "Schedule intent for dry-run / controlled test pacing",
        },
      });
      return successResponse({
        lease,
        campaign: marketingCampaignService.get(ctx, body.campaignId).campaign,
        deliveryLabel: "SIMULATED",
        actuallySent: false,
      });
    }

    if (action === "run_test_batch" || action === "run_next_batch") {
      if (!body.campaignId) {
        return errorResponse(400, "INVALID_INPUT", "campaignId is required");
      }
      const org = ctx.organizationId ?? "default";
      if (action === "run_next_batch") {
        const tick = await marketingExecutionService.runNextBatch(body.campaignId, org);
        return successResponse({
          tick,
          execution: marketingExecutionService.getSummary(body.campaignId),
          deliveryLabel: "SIMULATED",
          actuallySent: false,
        });
      }
      const requested = Number(body.testBatchSize ?? 5);
      const allowed = MARKETING_CONTROLLED_TEST_BATCH_SIZES as readonly number[];
      const testBatchSize = allowed.includes(requested) ? requested : Math.min(20, Math.max(1, requested));
      const tick = await marketingExecutionService.runControlledTestBatch(
        body.campaignId,
        org,
        testBatchSize,
      );
      return successResponse({
        tick,
        execution: marketingExecutionService.getSummary(body.campaignId),
        deliveryLabel: tick.deliveryLabel,
        actuallySent: tick.actuallySent,
      });
    }

    if (action === "execution_summary") {
      if (!body.campaignId) {
        return errorResponse(400, "INVALID_INPUT", "campaignId is required");
      }
      return successResponse({
        execution: marketingExecutionService.getSummary(body.campaignId),
      });
    }

    if (action === "save_reusable_block") {
      if (!body.block || !body.blockName?.trim()) {
        return errorResponse(400, "INVALID_INPUT", "block and blockName are required");
      }
      const block = marketingCampaignService.saveReusableBlock(ctx, {
        name: body.blockName,
        block: body.block,
      });
      return successResponse({ block });
    }

    return errorResponse(400, "INVALID_ACTION", `Unknown action: ${action}`);
  } catch (err) {
    return fromUnknown(err);
  }
}
