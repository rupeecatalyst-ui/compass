/**
 * CO-MARKETING-MKT-07 — Configurable marketing sender identities (no credentials).
 */

import type { MarketingSenderIdentity } from "@/types/enterprise-marketing-email-delivery";
import {
  ENTERPRISE_MARKETING_EMAIL_MODE,
  MARKETING_EMAIL_PROVIDER_ENV_KEYS,
} from "@/constants/enterprise-marketing-engine/email-delivery";

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
    replyTo: "champion@rupeecatalyst.com",
    active: true,
    verificationStatus: "VERIFIED",
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
      this.list(organizationId).find(
        (i) => i.active && i.verificationStatus === "VERIFIED",
      ) ?? null
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
    active?: boolean;
    verificationStatus?: MarketingSenderIdentity["verificationStatus"];
    providerType?: MarketingSenderIdentity["providerMapping"]["providerType"];
    providerProfileId?: string | null;
  }): MarketingSenderIdentity {
    seedDefaultIdentities(input.organizationId);
    const ts = nowIso();
    const providerType = input.providerType ?? "dry_run";
    const id =
      input.id ??
      `mkt-sender-${input.organizationId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const next: MarketingSenderIdentity = {
      id,
      organizationId: input.organizationId,
      displayName: input.displayName.trim(),
      fromAddress: input.fromAddress.trim().toLowerCase(),
      replyTo: input.replyTo?.trim() ?? null,
      active: input.active ?? true,
      verificationStatus: input.verificationStatus ?? "PENDING",
      providerMapping: {
        providerType,
        providerProfileId: input.providerProfileId ?? null,
        credentialConfigured: credentialConfigured(providerType),
      },
      createdAt: identities.get(id)?.createdAt ?? ts,
      updatedAt: ts,
    };
    identities.set(id, next);
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
      active: identity.active,
      verificationStatus: identity.verificationStatus,
      providerMapping: {
        providerType: identity.providerMapping.providerType,
        providerProfileId: identity.providerMapping.providerProfileId,
        credentialConfigured: identity.providerMapping.credentialConfigured,
      },
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
    };
  },
};
