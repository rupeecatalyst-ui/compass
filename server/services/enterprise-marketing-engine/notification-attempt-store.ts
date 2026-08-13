/**
 * CO-MARKETING-MKT-12 — Channel attempt ledger for marketing handoff alerts.
 * Not a notification engine — ENE remains the in-app SSOT. This records
 * delivery attempts so failures can retry without duplicating a successful send.
 */

import type { MarketingNotificationAttempt } from "@/types/enterprise-marketing-qualification";

const attempts = new Map<string, MarketingNotificationAttempt>();
let seq = 0;

function nowIso() {
  return new Date().toISOString();
}

function key(qualificationId: string, channel: MarketingNotificationAttempt["channel"]) {
  return `${qualificationId}:${channel}`;
}

export const marketingNotificationAttemptStore = {
  listForQualification(qualificationId: string): MarketingNotificationAttempt[] {
    return [...attempts.values()]
      .filter((a) => a.qualificationId === qualificationId)
      .sort((a, b) => a.channel.localeCompare(b.channel));
  },

  get(
    qualificationId: string,
    channel: MarketingNotificationAttempt["channel"],
  ): MarketingNotificationAttempt | null {
    return attempts.get(key(qualificationId, channel)) ?? null;
  },

  upsert(
    input: Omit<MarketingNotificationAttempt, "id" | "attemptedAt" | "retryCount"> & {
      id?: string;
      retryCount?: number;
    },
  ): MarketingNotificationAttempt {
    const k = key(input.qualificationId, input.channel);
    const prev = attempts.get(k);
    const next: MarketingNotificationAttempt = {
      id: input.id ?? prev?.id ?? `mkt-na-${++seq}`,
      organizationId: input.organizationId,
      qualificationId: input.qualificationId,
      channel: input.channel,
      status: input.status,
      dedupeKey: input.dedupeKey,
      notificationId: input.notificationId ?? prev?.notificationId ?? null,
      error: input.error ?? null,
      retryCount: input.retryCount ?? (prev ? prev.retryCount + 1 : 0),
      attemptedAt: nowIso(),
    };
    attempts.set(k, next);
    return next;
  },

  resetOrganization(organizationId: string) {
    for (const [id, a] of [...attempts.entries()]) {
      if (a.organizationId === organizationId) attempts.delete(id);
    }
  },
};
