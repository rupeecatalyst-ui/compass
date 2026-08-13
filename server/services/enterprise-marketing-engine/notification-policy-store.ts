/**
 * CO-MARKETING-MKT-12 — Notification channel policy (campaign-configurable).
 * Delivery remains ENE for in-app — this is configuration, not a second engine.
 */

import type { MarketingNotificationPolicy } from "@/types/enterprise-marketing-qualification";

const policies = new Map<string, MarketingNotificationPolicy>();
let seq = 0;

function nowIso() {
  return new Date().toISOString();
}

export const marketingNotificationPolicyStore = {
  list(organizationId: string): MarketingNotificationPolicy[] {
    return [...policies.values()]
      .filter((p) => p.organizationId === organizationId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  get(id: string): MarketingNotificationPolicy | null {
    return policies.get(id) ?? null;
  },

  getForOrg(id: string, organizationId: string): MarketingNotificationPolicy | null {
    const p = policies.get(id);
    if (!p || p.organizationId !== organizationId) return null;
    return p;
  },

  upsert(input: {
    id?: string;
    organizationId: string;
    name: string;
    inApp?: boolean;
    email?: boolean;
    whatsapp?: boolean;
  }): MarketingNotificationPolicy {
    const ts = nowIso();
    const id = input.id?.trim() || `mkt-notify-${++seq}`;
    const prev = policies.get(id);
    const next: MarketingNotificationPolicy = {
      id,
      organizationId: input.organizationId,
      name: input.name.trim() || "Handoff notification",
      inApp: input.inApp ?? prev?.inApp ?? true,
      email: input.email ?? prev?.email ?? false,
      whatsapp: input.whatsapp ?? prev?.whatsapp ?? false,
      createdAt: prev?.createdAt ?? ts,
      updatedAt: ts,
    };
    policies.set(id, next);
    return next;
  },

  resetOrganization(organizationId: string) {
    for (const [id, p] of [...policies.entries()]) {
      if (p.organizationId === organizationId) policies.delete(id);
    }
  },
};
