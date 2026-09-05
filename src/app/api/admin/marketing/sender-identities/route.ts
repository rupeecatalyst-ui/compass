/**
 * CO-MARKETING-REDESIGN-013 — Admin sender identity registry API.
 * No credentials. No verification emails. No DNS mutation.
 */

import {
  errorResponse,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { fromMarketingUnknownError } from "@/lib/enterprise-marketing-engine/api-error";
import { MARKETING_PERMISSIONS } from "@/constants/enterprise-marketing-engine/permissions";
import { assertMarketingPermission } from "@/lib/enterprise-marketing-engine/permissions";
import { resolveMarketingOrganizationId } from "@server/services/enterprise-marketing-engine/organization";
import { marketingSenderService } from "@server/services/enterprise-marketing-engine";
import { marketingEmailDeliveryService } from "@server/services/enterprise-marketing-engine/email-delivery.service";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can manage Marketing sender identities"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

function fromUnknown(err: unknown) {
  return fromMarketingUnknownError(
    err,
    "MARKETING_SENDER_FAILED",
    err instanceof Error ? err.message : "Marketing sender identity request failed",
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
    assertMarketingPermission(ctx, MARKETING_PERMISSIONS.SENDER_MANAGE);
    if (url.searchParams.get("view") === "delivery-mode") {
      return successResponse({ mode: marketingEmailDeliveryService.getMode() });
    }
    const identities = marketingSenderService.list(ctx);
    return successResponse({ identities, mode: marketingEmailDeliveryService.getMode() });
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
      action?: "upsert" | "approve" | "verify_email" | "dns_lookup";
      id?: string;
      displayName?: string;
      fromAddress?: string;
      replyTo?: string | null;
      channel?: "EMAIL" | "WHATSAPP" | "ALL";
      active?: boolean;
      isDefault?: boolean;
      simulated?: boolean;
      permittedCampaignCategories?: string[];
      providerType?: "dry_run" | "resend" | "sendgrid" | "ses" | "smtp" | "other";
      providerProfileId?: string | null;
      verificationStatus?: "UNVERIFIED" | "PENDING" | "VERIFIED" | "FAILED";
      apiKey?: string;
      smtpPassword?: string;
      password?: string;
    };

    if (body.apiKey || body.smtpPassword || body.password) {
      return errorResponse(
        400,
        "SECRETS_NOT_ALLOWED",
        "Provider credentials cannot be submitted via API. Configure server environment variables only.",
      );
    }

    if (body.action === "approve") {
      assertMarketingPermission(ctx, MARKETING_PERMISSIONS.SENDER_APPROVE);
    } else {
      assertMarketingPermission(ctx, MARKETING_PERMISSIONS.SENDER_MANAGE);
    }

    if (body.action === "verify_email") {
      marketingSenderService.triggerVerificationEmail(ctx, body.id ?? "");
    }

    if (body.action === "dns_lookup") {
      marketingSenderService.lookupDns(ctx);
    }

    if (body.action === "approve") {
      if (!body.id) return errorResponse(400, "INVALID_INPUT", "id is required");
      const identity = marketingSenderService.approve(ctx, body.id);
      return successResponse({ identity });
    }

    if (body.action === "upsert") {
      if (!body.displayName?.trim() || !body.fromAddress?.trim()) {
        return errorResponse(400, "INVALID_INPUT", "displayName and fromAddress are required");
      }
      const identity = marketingSenderService.upsert(ctx, {
        organizationId: ctx.organizationId,
        id: body.id,
        displayName: body.displayName,
        fromAddress: body.fromAddress,
        replyTo: body.replyTo,
        channel: body.channel,
        active: body.active,
        isDefault: body.isDefault,
        simulated: body.simulated ?? true,
        permittedCampaignCategories: body.permittedCampaignCategories,
        providerType: body.providerType,
        providerProfileId: body.providerProfileId,
        verificationStatus: body.verificationStatus,
      });
      return successResponse({ identity });
    }

    return errorResponse(400, "INVALID_ACTION", "Unknown action");
  } catch (err) {
    return fromUnknown(err);
  }
}
