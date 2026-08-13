/**
 * CO-MARKETING-MKT-09 — WhatsApp template render + validation (no free-form bulk).
 */

import { normalizeMarketingPhone } from "@/lib/enterprise-marketing-engine/data-quality";
import type {
  MarketingWhatsAppDeliveryRequest,
  MarketingWhatsAppTemplate,
} from "@/types/enterprise-marketing-whatsapp-delivery";

const VAR_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

export function listWhatsAppTemplateVariables(body: string): string[] {
  const found = new Set<string>();
  for (const m of body.matchAll(VAR_RE)) {
    if (m[1]) found.add(m[1]);
  }
  return [...found];
}

export function renderWhatsAppTemplateBody(
  body: string,
  variables: Record<string, string>,
): string {
  return body.replace(VAR_RE, (_full, key: string) => {
    const v = variables[key];
    return v != null && String(v).length ? String(v) : `{{${key}}}`;
  });
}

export type MarketingWhatsAppValidationError = {
  code: string;
  message: string;
};

export function validateWhatsAppRecipientPhone(
  phone: string,
): MarketingWhatsAppValidationError | null {
  const digits = normalizeMarketingPhone(phone);
  if (!digits) {
    return { code: "INVALID_RECIPIENT", message: "Recipient phone is invalid or missing" };
  }
  if (digits.length < 10 || digits.length > 15) {
    return { code: "INVALID_RECIPIENT", message: "Recipient phone length is invalid" };
  }
  return null;
}

export function validateWhatsAppTemplateVariables(
  template: MarketingWhatsAppTemplate,
  variables: Record<string, string>,
): MarketingWhatsAppValidationError | null {
  for (const v of template.variables) {
    if (!v.required) continue;
    const val = variables[v.key];
    if (val == null || !String(val).trim()) {
      return {
        code: "MISSING_VARIABLE",
        message: `Required template variable "{{${v.key}}}" is missing`,
      };
    }
  }
  // Reject undeclared variables that appear in body but aren't supplied when required by body scan
  for (const key of listWhatsAppTemplateVariables(template.body)) {
    const declared = template.variables.find((v) => v.key === key);
    if (declared?.required && !(variables[key]?.trim())) {
      return {
        code: "MISSING_VARIABLE",
        message: `Required template variable "{{${key}}}" is missing`,
      };
    }
  }
  return null;
}

export function validateWhatsAppDeliveryRequest(
  request: MarketingWhatsAppDeliveryRequest,
): MarketingWhatsAppValidationError | null {
  if (!request.idempotencyKey?.trim()) {
    return { code: "MISSING_IDEMPOTENCY_KEY", message: "Idempotency key is required" };
  }
  if (!request.templateId?.trim() || !request.templateName?.trim()) {
    return { code: "MISSING_TEMPLATE", message: "Approved WhatsApp template is required" };
  }
  if (!request.campaignId?.trim() || !request.batchId?.trim() || !request.executionId?.trim()) {
    return { code: "MISSING_CONTEXT", message: "Campaign / batch / execution context required" };
  }
  return validateWhatsAppRecipientPhone(request.recipientPhone);
}

/** Explicitly refuse free-form bulk message bodies outside templates. */
export function assertNoFreeFormWhatsAppBulk(input: {
  freeFormBody?: string | null;
}): MarketingWhatsAppValidationError | null {
  if (input.freeFormBody != null && String(input.freeFormBody).trim()) {
    return {
      code: "FREE_FORM_BULK_FORBIDDEN",
      message:
        "Unrestricted free-form WhatsApp bulk messaging is forbidden. Use an approved template only.",
    };
  }
  return null;
}

export function redactMarketingPhone(phone: string): string {
  const digits = normalizeMarketingPhone(phone) ?? phone.replace(/\D+/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}
