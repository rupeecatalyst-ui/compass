/**
 * CO-MARKETING-MKT-09 — WhatsApp delivery + channel policy constants.
 */

import type {
  MarketingWhatsAppDeliveryOutcome,
  MarketingWhatsAppProviderType,
  MarketingWhatsAppTemplateApprovalState,
  MarketingWhatsAppTemplateCategory,
} from "@/types/enterprise-marketing-whatsapp-delivery";
import type { MarketingChannel } from "@/constants/enterprise-marketing-engine/lifecycle";

export const MARKETING_WHATSAPP_DELIVERY_OUTCOMES = [
  "ACCEPTED",
  "SENT",
  "FAILED",
  "RETRYABLE_FAILURE",
  "PERMANENT_FAILURE",
  "RATE_LIMITED",
  "BLOCKED",
  "CANCELLED",
] as const satisfies readonly MarketingWhatsAppDeliveryOutcome[];

export const MARKETING_WHATSAPP_TEMPLATE_CATEGORIES = [
  "MARKETING",
  "UTILITY",
  "AUTHENTICATION",
  "SERVICE",
] as const satisfies readonly MarketingWhatsAppTemplateCategory[];

export const MARKETING_WHATSAPP_TEMPLATE_APPROVAL_STATES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "DISABLED",
] as const satisfies readonly MarketingWhatsAppTemplateApprovalState[];

export const MARKETING_WHATSAPP_PROVIDER_TYPES = [
  "dry_run",
  "meta_cloud",
  "twilio",
  "gupshup",
  "other",
] as const satisfies readonly MarketingWhatsAppProviderType[];

/**
 * WhatsApp delivery mode (server-only env `ENTERPRISE_MARKETING_WHATSAPP_MODE`):
 * - off: refuse WhatsApp delivery port
 * - dry_run: validate + record — no external provider (default MKT-09)
 * - live: requires EXECUTION_ENABLED + PROVIDER_CONNECT + PO approval
 */
export type EnterpriseMarketingWhatsAppDeliveryMode = "off" | "dry_run" | "live";

function resolveWhatsAppMode(): EnterpriseMarketingWhatsAppDeliveryMode {
  const raw = (process.env.ENTERPRISE_MARKETING_WHATSAPP_MODE ?? "dry_run")
    .trim()
    .toLowerCase();
  if (raw === "off" || raw === "dry_run" || raw === "live") return raw;
  return "dry_run";
}

export const ENTERPRISE_MARKETING_WHATSAPP_MODE: EnterpriseMarketingWhatsAppDeliveryMode =
  typeof process !== "undefined" ? resolveWhatsAppMode() : "dry_run";

export const MARKETING_WHATSAPP_PROVIDER_ENV_KEYS = {
  meta_cloud: "ENTERPRISE_MARKETING_WHATSAPP_META_TOKEN",
  twilio: "ENTERPRISE_MARKETING_WHATSAPP_TWILIO_AUTH_TOKEN",
  gupshup: "ENTERPRISE_MARKETING_WHATSAPP_GUPSHUP_API_KEY",
} as const;

/** Extensible channel eligibility policy — Email + WhatsApp now; future channels add here. */
export type MarketingChannelEligibilityPolicy = {
  organizationId: string;
  channels: Partial<
    Record<
      MarketingChannel,
      {
        enabled: boolean;
        /** WhatsApp: template-only; Email: content document. */
        requiresApprovedTemplate: boolean;
        /** Free-form bulk body forbidden when true. */
        forbidFreeFormBulk: boolean;
        notes?: string | null;
      }
    >
  >;
  updatedAt: string;
};

export const MARKETING_DEFAULT_CHANNEL_ELIGIBILITY: Omit<
  MarketingChannelEligibilityPolicy,
  "organizationId" | "updatedAt"
> = {
  channels: {
    EMAIL: {
      enabled: true,
      requiresApprovedTemplate: false,
      forbidFreeFormBulk: false,
      notes: "Email content engine (MKT-08). Live send gated separately.",
    },
    WHATSAPP: {
      enabled: true,
      requiresApprovedTemplate: true,
      forbidFreeFormBulk: true,
      notes: "Template-only WhatsApp. No unrestricted bulk free-form messaging.",
    },
    DIGITAL: {
      enabled: false,
      requiresApprovedTemplate: false,
      forbidFreeFormBulk: true,
      notes: "Future channel — not enabled in MKT-09.",
    },
  },
};
