/**
 * CO-MARKETING-MKT-07 — Admin Marketing Sender Identities API.
 * No credentials exposed to frontend.
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { EnterpriseMarketingSafetyError } from "@/lib/enterprise-marketing-engine/safety";
import type { ApiResponse } from "@/types/api";
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
    code ?? "MARKETING_SENDER_FAILED",
    err instanceof Error ? err.message : "Marketing sender identity request failed",
  );
}

const orgId = () => "default";

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const url = new URL(request.url);
    const view = url.searchParams.get("view");
    if (view === "delivery-mode") {
      return successResponse({ mode: marketingEmailDeliveryService.getMode() });
    }
    const identities = marketingEmailDeliveryService.listSenderIdentities(orgId());
    return successResponse({ identities, mode: marketingEmailDeliveryService.getMode() });
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const body = (await request.json().catch(() => ({}))) as {
      action?: "upsert";
      id?: string;
      displayName?: string;
      fromAddress?: string;
      replyTo?: string | null;
      active?: boolean;
      verificationStatus?: "UNVERIFIED" | "PENDING" | "VERIFIED" | "FAILED";
      providerType?: "dry_run" | "resend" | "sendgrid" | "ses" | "smtp" | "other";
      providerProfileId?: string | null;
      /** Rejected if present — secrets must never be sent via API. */
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

    if (body.action === "upsert") {
      if (!body.displayName?.trim() || !body.fromAddress?.trim()) {
        return errorResponse(400, "INVALID_INPUT", "displayName and fromAddress are required");
      }
      const identity = marketingEmailDeliveryService.upsertSenderIdentity(orgId(), {
        id: body.id,
        organizationId: orgId(),
        displayName: body.displayName,
        fromAddress: body.fromAddress,
        replyTo: body.replyTo,
        active: body.active,
        verificationStatus: body.verificationStatus,
        providerType: body.providerType,
        providerProfileId: body.providerProfileId,
      });
      return successResponse({ identity });
    }

    return errorResponse(400, "INVALID_ACTION", "Unknown action");
  } catch (err) {
    return fromUnknown(err);
  }
}
