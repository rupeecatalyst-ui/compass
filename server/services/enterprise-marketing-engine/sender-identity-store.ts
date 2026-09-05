/**
 * CO-MARKETING-REDESIGN-013 — Durable sender identities (no credentials).
 * Fixture defaults are simulated and never labelled verified.
 */

import type { MarketingSenderIdentity } from "@/types/enterprise-marketing-email-delivery";
import {
  ENTERPRISE_MARKETING_EMAIL_MODE,
  MARKETING_EMAIL_PROVIDER_ENV_KEYS,
} from "@/constants/enterprise-marketing-engine/email-delivery";
import {
  MARKETING_DELIVERABILITY_FRESHNESS_MS,
  MARKETING_SENDER_SIMULATED_NOT_VERIFIED,
  type MarketingSenderApprovalStatus,
} from "@/constants/enterprise-marketing-engine/sender-deliverability";

const identities = new Map<string, MarketingSenderIdentity>();
const seededOrgs = new Set<string>();

function nowIso() {
  return new Date().toISOString();
}

function credentialConfigured(providerType: MarketingSenderIdentity["providerMapping"]["providerType"]): boolean {
  if (providerType === "dry_run") return ENTERPRISE_MARKETING_EMAIL_MODE === "dry_run";
  const key = MARKETING_EMAIL_PROVIDER_ENV_KEYS[providerType as keyof typeof MARKETING_EMAIL_PROVIDER_ENV_KEYS];
  if (!key) return false;
  return Boolean(process.env[key]?.trim());
}

function seedDefaultIdentities(organizationId: string) {
  if (seededOrgs.has(organizationId)) return;
  seededOrgs.add(organizationId);
  const id = `mkt-sender-${organizationId}-default`;
  const ts = nowIso();
  identities.set(id, {
    id,
    organizationId,
    displayName: "Rupee Catalyst Campaigns",
    fromAddress: "campaigns@campaign.example.rupeecatalyst.com",
    replyTo: "champion@example.com",
    channel: "EMAIL",
    active: true,
    isDefault: true,
    simulated: true,
    approvalStatus: "DRAFT",
    verificationStatus: "PENDING",
    permittedCampaignCategories: ["Unspecified"],
    createdByUserId: null,
    approvedByUserId: null,
    approvedAt: null,
    lastValidationAt: ts,
    validationFreshUntil: new Date(Date.now() + MARKETING_DELIVERABILITY_FRESHNESS_MS).toISOString(),
    providerMapping: {
      providerType: "dry_run",
      providerProfileId: "dry-run-default",
      credentialConfigured: credentialConfigured("dry_run"),
    },
    createdAt: ts,
    updatedAt: ts,
  });
}

export const marketingSenderIdentityStore = {
  list(organizationId: string): MarketingSenderIdentity[] {
    seedDefaultIdentities(organizationId);
    return [...identities.values()]
      .filter((i) => i.organizationId === organizationId)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  },

  get(id: string, organizationId: string): MarketingSenderIdentity | null {
    seedDefaultIdentities(organizationId);
    const item = identities.get(id);
    if (!item || item.organizationId !== organizationId) return null;
    return item;
  },

  getDefaultActive(organizationId: string): MarketingSenderIdentity | null {
    seedDefaultIdentities(organizationId);
    return (
      this.list(organizationId).find((i) => i.isDefault && i.active) ??
      this.list(organizationId).find((i) => i.active) ??
      null
    );
  },

  resolveByFromAddress(organizationId: string, fromAddress: string): MarketingSenderIdentity | null {
    seedDefaultIdentities(organizationId);
    const normalized = fromAddress.trim().toLowerCase();
    return (
      this.list(organizationId).find(
        (i) => i.fromAddress.trim().toLowerCase() === normalized && i.active,
      ) ?? null
    );
  },

  upsert(input: {
    organizationId: string;
    id?: string;
    displayName: string;
    fromAddress: string;
    replyTo?: string | null;
    channel?: MarketingSenderIdentity["channel"];
    active?: boolean;
    isDefault?: boolean;
    simulated?: boolean;
    approvalStatus?: MarketingSenderApprovalStatus;
    verificationStatus?: MarketingSenderIdentity["verificationStatus"];
    permittedCampaignCategories?: string[];
    providerType?: MarketingSenderIdentity["providerMapping"]["providerType"];
    providerProfileId?: string | null;
    createdByUserId?: string | null;
  }): MarketingSenderIdentity {
    seedDefaultIdentities(input.organizationId);
    const ts = nowIso();
    const providerType = input.providerType ?? "dry_run";
    const existing = input.id ? identities.get(input.id) : undefined;
    if (existing && existing.organizationId !== input.organizationId) {
      throw Object.assign(new Error("Sender identity not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const simulated = input.simulated ?? existing?.simulated ?? true;
    const verificationStatus = input.verificationStatus ?? existing?.verificationStatus ?? "PENDING";
    if (simulated && verificationStatus === "VERIFIED") {
      throw Object.assign(new Error("Simulated sender identities cannot be marked verified"), {
        statusCode: 400,
        code: MARKETING_SENDER_SIMULATED_NOT_VERIFIED,
      });
    }
    const id =
      input.id ??
      `mkt-sender-${input.organizationId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (input.isDefault) {
      for (const row of identities.values()) {
        if (row.organizationId === input.organizationId && row.id !== id && row.isDefault) {
          identities.set(row.id, { ...row, isDefault: false, updatedAt: ts });
        }
      }
    }
    const next: MarketingSenderIdentity = {
      id,
      organizationId: input.organizationId,
      displayName: input.displayName.trim(),
      fromAddress: input.fromAddress.trim().toLowerCase(),
      replyTo: input.replyTo?.trim() ?? existing?.replyTo ?? null,
      channel: input.channel ?? existing?.channel ?? "EMAIL",
      active: input.active ?? existing?.active ?? true,
      isDefault: input.isDefault ?? existing?.isDefault ?? false,
      simulated,
      approvalStatus: input.approvalStatus ?? existing?.approvalStatus ?? "DRAFT",
      verificationStatus,
      permittedCampaignCategories:
        input.permittedCampaignCategories ?? existing?.permittedCampaignCategories ?? ["Unspecified"],
      createdByUserId: existing?.createdByUserId ?? input.createdByUserId ?? null,
      approvedByUserId: existing?.approvedByUserId ?? null,
      approvedAt: existing?.approvedAt ?? null,
      lastValidationAt: ts,
      validationFreshUntil: new Date(Date.now() + MARKETING_DELIVERABILITY_FRESHNESS_MS).toISOString(),
      providerMapping: {
        providerType,
        providerProfileId: input.providerProfileId ?? existing?.providerMapping.providerProfileId ?? null,
        credentialConfigured: credentialConfigured(providerType),
      },
      createdAt: existing?.createdAt ?? ts,
      updatedAt: ts,
    };
    identities.set(id, next);
    return next;
  },

  approve(input: {
    organizationId: string;
    id: string;
    actorUserId?: string | null;
  }): MarketingSenderIdentity {
    const row = this.get(input.id, input.organizationId);
    if (!row) {
      throw Object.assign(new Error("Sender identity not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    if (row.simulated) {
      throw Object.assign(new Error("Simulated fixture senders cannot be approved for production-capable execution"), {
        statusCode: 400,
        code: MARKETING_SENDER_SIMULATED_NOT_VERIFIED,
      });
    }
    const ts = nowIso();
    const next: MarketingSenderIdentity = {
      ...row,
      approvalStatus: "APPROVED",
      approvedByUserId: input.actorUserId ?? null,
      approvedAt: ts,
      updatedAt: ts,
    };
    identities.set(row.id, next);
    return next;
  },

  /** Public-safe projection — never includes secrets. */
  toPublicDto(identity: MarketingSenderIdentity) {
    return {
      id: identity.id,
      organizationId: identity.organizationId,
      displayName: identity.displayName,
      fromAddress: identity.fromAddress,
      replyTo: identity.replyTo,
      channel: identity.channel,
      active: identity.active,
      isDefault: identity.isDefault,
      simulated: identity.simulated,
      approvalStatus: identity.approvalStatus,
      verificationStatus: identity.verificationStatus,
      permittedCampaignCategories: identity.permittedCampaignCategories,
      createdByUserId: identity.createdByUserId,
      approvedByUserId: identity.approvedByUserId,
      approvedAt: identity.approvedAt,
      lastValidationAt: identity.lastValidationAt,
      validationFreshUntil: identity.validationFreshUntil,
      providerMapping: {
        providerType: identity.providerMapping.providerType,
        providerProfileId: identity.providerMapping.providerProfileId,
        credentialConfigured: identity.providerMapping.credentialConfigured,
      },
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
    };
  },

  reset(): void {
    identities.clear();
    seededOrgs.clear();
  },
};
