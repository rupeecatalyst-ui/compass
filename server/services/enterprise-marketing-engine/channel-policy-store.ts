/**
 * CO-MARKETING-MKT-09 — Configurable channel eligibility (Email / WhatsApp / future).
 */

import type { MarketingChannel } from "@/constants/enterprise-marketing-engine/lifecycle";
import {
  MARKETING_DEFAULT_CHANNEL_ELIGIBILITY,
  type MarketingChannelEligibilityPolicy,
} from "@/constants/enterprise-marketing-engine/whatsapp-delivery";

const policies = new Map<string, MarketingChannelEligibilityPolicy>();

function nowIso() {
  return new Date().toISOString();
}

function seed(organizationId: string): MarketingChannelEligibilityPolicy {
  const existing = policies.get(organizationId);
  if (existing) return existing;
  const next: MarketingChannelEligibilityPolicy = {
    organizationId,
    channels: { ...MARKETING_DEFAULT_CHANNEL_ELIGIBILITY.channels },
    updatedAt: nowIso(),
  };
  policies.set(organizationId, next);
  return next;
}

export const marketingChannelPolicyStore = {
  get(organizationId: string): MarketingChannelEligibilityPolicy {
    return seed(organizationId);
  },

  isChannelEnabled(organizationId: string, channel: MarketingChannel): boolean {
    const policy = seed(organizationId);
    return Boolean(policy.channels[channel]?.enabled);
  },

  requiresApprovedTemplate(organizationId: string, channel: MarketingChannel): boolean {
    const policy = seed(organizationId);
    return Boolean(policy.channels[channel]?.requiresApprovedTemplate);
  },

  forbidsFreeFormBulk(organizationId: string, channel: MarketingChannel): boolean {
    const policy = seed(organizationId);
    return Boolean(policy.channels[channel]?.forbidFreeFormBulk);
  },

  upsert(
    organizationId: string,
    patch: Partial<MarketingChannelEligibilityPolicy["channels"]>,
  ): MarketingChannelEligibilityPolicy {
    const current = seed(organizationId);
    const next: MarketingChannelEligibilityPolicy = {
      organizationId,
      channels: {
        ...current.channels,
        ...patch,
      },
      updatedAt: nowIso(),
    };
    policies.set(organizationId, next);
    return next;
  },
};
