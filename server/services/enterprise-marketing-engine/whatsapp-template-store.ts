/**
 * CO-MARKETING-MKT-09 — WhatsApp approved template registry (no credentials).
 */

import {
  ENTERPRISE_MARKETING_WHATSAPP_MODE,
  MARKETING_WHATSAPP_PROVIDER_ENV_KEYS,
} from "@/constants/enterprise-marketing-engine/whatsapp-delivery";
import type { MarketingWhatsAppTemplate } from "@/types/enterprise-marketing-whatsapp-delivery";

const templates = new Map<string, MarketingWhatsAppTemplate>();
const seededOrgs = new Set<string>();

function nowIso() {
  return new Date().toISOString();
}

function credentialConfigured(
  providerType: MarketingWhatsAppTemplate["providerMapping"]["providerType"],
): boolean {
  if (providerType === "dry_run") return ENTERPRISE_MARKETING_WHATSAPP_MODE === "dry_run";
  const key =
    MARKETING_WHATSAPP_PROVIDER_ENV_KEYS[
      providerType as keyof typeof MARKETING_WHATSAPP_PROVIDER_ENV_KEYS
    ];
  if (!key) return false;
  return Boolean(process.env[key]?.trim());
}

function seedDefaults(organizationId: string) {
  if (seededOrgs.has(organizationId)) return;
  seededOrgs.add(organizationId);
  const ts = nowIso();
  const id = `mkt-wa-tpl-${organizationId}-welcome`;
  templates.set(id, {
    id,
    organizationId,
    name: "welcome_professional",
    category: "MARKETING",
    language: "en",
    body: "Hello {{firstName}}, {{senderName}} has an update on {{product}} for {{companyName}}. Reply STOP to opt out.",
    variables: [
      { key: "firstName", label: "First name", required: true, example: "Asha" },
      { key: "senderName", label: "Sender name", required: true, example: "Rupee Catalyst" },
      { key: "product", label: "Product", required: true, example: "Home Loan" },
      { key: "companyName", label: "Company", required: false, example: "Example Corp" },
    ],
    active: true,
    approvalState: "APPROVED",
    providerMapping: {
      providerType: "dry_run",
      providerTemplateId: "dry-run-welcome_professional",
      credentialConfigured: credentialConfigured("dry_run"),
    },
    createdAt: ts,
    updatedAt: ts,
  });
}

export const marketingWhatsAppTemplateStore = {
  list(organizationId: string, opts?: { activeOnly?: boolean }): MarketingWhatsAppTemplate[] {
    seedDefaults(organizationId);
    return [...templates.values()]
      .filter((t) => t.organizationId === organizationId)
      .filter((t) => (opts?.activeOnly ? t.active : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  get(id: string, organizationId: string): MarketingWhatsAppTemplate | null {
    seedDefaults(organizationId);
    const t = templates.get(id);
    if (!t || t.organizationId !== organizationId) return null;
    return t;
  },

  getApprovedActive(id: string, organizationId: string): MarketingWhatsAppTemplate | null {
    const t = this.get(id, organizationId);
    if (!t) return null;
    if (!t.active || t.approvalState !== "APPROVED") return null;
    return t;
  },

  upsert(input: {
    organizationId: string;
    id?: string;
    name: string;
    category: MarketingWhatsAppTemplate["category"];
    language: string;
    body: string;
    variables: MarketingWhatsAppTemplate["variables"];
    active?: boolean;
    approvalState?: MarketingWhatsAppTemplate["approvalState"];
    providerType?: MarketingWhatsAppTemplate["providerMapping"]["providerType"];
    providerTemplateId?: string | null;
  }): MarketingWhatsAppTemplate {
    seedDefaults(input.organizationId);
    const ts = nowIso();
    const providerType = input.providerType ?? "dry_run";
    const id =
      input.id ??
      `mkt-wa-tpl-${input.organizationId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const next: MarketingWhatsAppTemplate = {
      id,
      organizationId: input.organizationId,
      name: input.name.trim(),
      category: input.category,
      language: input.language.trim() || "en",
      body: input.body,
      variables: input.variables,
      active: input.active ?? true,
      approvalState: input.approvalState ?? "DRAFT",
      providerMapping: {
        providerType,
        providerTemplateId: input.providerTemplateId ?? null,
        credentialConfigured: credentialConfigured(providerType),
      },
      createdAt: templates.get(id)?.createdAt ?? ts,
      updatedAt: ts,
    };
    templates.set(id, next);
    return next;
  },

  toPublicDto(template: MarketingWhatsAppTemplate) {
    return {
      id: template.id,
      organizationId: template.organizationId,
      name: template.name,
      category: template.category,
      language: template.language,
      body: template.body,
      variables: template.variables,
      active: template.active,
      approvalState: template.approvalState,
      providerMapping: {
        providerType: template.providerMapping.providerType,
        providerTemplateId: template.providerMapping.providerTemplateId,
        credentialConfigured: template.providerMapping.credentialConfigured,
      },
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  },
};
