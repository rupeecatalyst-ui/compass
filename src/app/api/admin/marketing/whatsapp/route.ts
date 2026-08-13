/**
 * CO-MARKETING-MKT-09 — Admin WhatsApp templates + dry-run delivery API.
 * No real WhatsApp send. Secrets never accepted via API.
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
  MarketingWhatsAppTemplateApprovalState,
  MarketingWhatsAppTemplateCategory,
  MarketingWhatsAppTemplateVariable,
} from "@/types/enterprise-marketing-whatsapp-delivery";
import { marketingWhatsAppDeliveryService } from "@server/services/enterprise-marketing-engine/whatsapp-delivery.service";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can manage Marketing WhatsApp"), {
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
    code ?? "MARKETING_WHATSAPP_FAILED",
    err instanceof Error ? err.message : "Marketing WhatsApp request failed",
  );
}

const orgId = () => "default";

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const url = new URL(request.url);
    const view = url.searchParams.get("view");
    if (view === "mode") {
      return successResponse({
        mode: marketingWhatsAppDeliveryService.getMode(),
        channelPolicy: marketingWhatsAppDeliveryService.getChannelPolicy(orgId()),
      });
    }
    if (view === "channel-policy") {
      return successResponse({
        policy: marketingWhatsAppDeliveryService.getChannelPolicy(orgId()),
      });
    }
    const activeOnly = url.searchParams.get("activeOnly") === "1";
    const templates = marketingWhatsAppDeliveryService.listTemplates(orgId(), activeOnly);
    return successResponse({
      templates,
      mode: marketingWhatsAppDeliveryService.getMode(),
      channelPolicy: marketingWhatsAppDeliveryService.getChannelPolicy(orgId()),
    });
  } catch (err) {
    return fromUnknown(err);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const body = (await request.json().catch(() => ({}))) as {
      action?: "upsert_template" | "preview_render" | "dry_run_deliver";
      id?: string;
      name?: string;
      category?: MarketingWhatsAppTemplateCategory;
      language?: string;
      body?: string;
      variables?: MarketingWhatsAppTemplateVariable[];
      active?: boolean;
      approvalState?: MarketingWhatsAppTemplateApprovalState;
      providerType?: "dry_run" | "meta_cloud" | "twilio" | "gupshup" | "other";
      providerTemplateId?: string | null;
      templateId?: string;
      recipientPhone?: string;
      variableValues?: Record<string, string>;
      freeFormBody?: string | null;
      campaignId?: string;
      campaignVersionId?: string;
      batchId?: string;
      idempotencyKey?: string;
      recipientFingerprint?: string;
      /** Rejected — secrets must never be submitted via API. */
      apiKey?: string;
      token?: string;
      authToken?: string;
    };

    if (body.apiKey || body.token || body.authToken) {
      return errorResponse(
        400,
        "SECRETS_NOT_ALLOWED",
        "Provider credentials cannot be submitted via API. Configure server environment variables only.",
      );
    }

    if (body.action === "upsert_template") {
      if (!body.name?.trim() || !body.body?.trim() || !body.category) {
        return errorResponse(
          400,
          "INVALID_INPUT",
          "name, body, and category are required",
        );
      }
      if (body.freeFormBody) {
        return errorResponse(
          400,
          "FREE_FORM_BULK_FORBIDDEN",
          "Free-form bulk WhatsApp body is forbidden. Use approved templates only.",
        );
      }
      const template = marketingWhatsAppDeliveryService.upsertTemplate(orgId(), {
        organizationId: orgId(),
        id: body.id,
        name: body.name,
        category: body.category,
        language: body.language ?? "en",
        body: body.body,
        variables: body.variables ?? [],
        active: body.active,
        approvalState: body.approvalState,
        providerType: body.providerType,
        providerTemplateId: body.providerTemplateId,
      });
      return successResponse({ template });
    }

    if (body.action === "preview_render") {
      if (!body.templateId || !body.recipientPhone) {
        return errorResponse(
          400,
          "INVALID_INPUT",
          "templateId and recipientPhone are required",
        );
      }
      const preview = marketingWhatsAppDeliveryService.previewRender({
        organizationId: orgId(),
        templateId: body.templateId,
        recipientPhone: body.recipientPhone,
        variables: body.variableValues,
        freeFormBody: body.freeFormBody,
      });
      return successResponse({ preview });
    }

    if (body.action === "dry_run_deliver") {
      if (
        !body.templateId ||
        !body.recipientPhone ||
        !body.campaignId ||
        !body.idempotencyKey
      ) {
        return errorResponse(
          400,
          "INVALID_INPUT",
          "templateId, recipientPhone, campaignId, and idempotencyKey are required",
        );
      }
      if (body.freeFormBody) {
        return errorResponse(
          400,
          "FREE_FORM_BULK_FORBIDDEN",
          "Free-form bulk WhatsApp body is forbidden.",
        );
      }
      const result = await marketingWhatsAppDeliveryService.deliverForExecutionClaim({
        organizationId: orgId(),
        campaignId: body.campaignId,
        campaignVersionId: body.campaignVersionId ?? "preview-version",
        batchId: body.batchId ?? `batch-preview-${Date.now()}`,
        idempotencyKey: body.idempotencyKey,
        recipientFingerprint:
          body.recipientFingerprint ?? `phone:${body.recipientPhone.replace(/\D+/g, "")}`,
        recipientPhone: body.recipientPhone,
        whatsappTemplateId: body.templateId,
        row: body.variableValues ?? {},
      });
      return successResponse({ result, notice: "Dry-run only — no WhatsApp infrastructure contact" });
    }

    return errorResponse(400, "INVALID_ACTION", "Unknown action");
  } catch (err) {
    return fromUnknown(err);
  }
}
