/**
 * CO-MARKETING-MKT-03 — Marketing suppression ledger (prepare only).
 * No external delivery. Used during audience eligibility preview.
 */

import type { MarketingSuppressionReason } from "@/constants/enterprise-marketing-engine/audience";
import type { MarketingSuppressionRecord } from "@/types/enterprise-marketing-audience";

const records = new Map<string, MarketingSuppressionRecord>();
let seeded = false;

function nowIso() {
  return new Date().toISOString();
}

function seedFixtureSuppressions(organizationId: string) {
  if (seeded) return;
  seeded = true;
  const samples: Array<{ fingerprint: string; reason: MarketingSuppressionReason }> = [
    { fingerprint: "email:asha.verma@example.com", reason: "UNSUBSCRIBE" },
    { fingerprint: "email:gamma.one@example.com", reason: "DO_NOT_CONTACT" },
    { fingerprint: "phone:9000000001", reason: "HARD_BOUNCE" },
  ];
  for (const s of samples) {
    const id = `mkt-sup-${organizationId}-${s.reason}-${s.fingerprint.slice(0, 24)}`;
    records.set(id, {
      id,
      organizationId,
      fingerprint: s.fingerprint,
      reason: s.reason,
      channel: "ALL",
      note: "Fixture seed — delivery not active in MKT-03",
      createdAt: nowIso(),
    });
  }
}

export const marketingSuppressionStore = {
  list(organizationId: string): MarketingSuppressionRecord[] {
    seedFixtureSuppressions(organizationId);
    return [...records.values()].filter((r) => r.organizationId === organizationId);
  },

  upsert(input: {
    organizationId: string;
    fingerprint: string;
    reason: MarketingSuppressionReason;
    channel?: MarketingSuppressionRecord["channel"];
    note?: string | null;
  }): MarketingSuppressionRecord {
    seedFixtureSuppressions(input.organizationId);
    const fingerprint = input.fingerprint.trim().toLowerCase();
    const existing = [...records.values()].find(
      (r) =>
        r.organizationId === input.organizationId &&
        r.fingerprint === fingerprint &&
        r.reason === input.reason,
    );
    const id = existing?.id ?? `mkt-sup-${input.organizationId}-${Date.now()}`;
    const next: MarketingSuppressionRecord = {
      id,
      organizationId: input.organizationId,
      fingerprint,
      reason: input.reason,
      channel: input.channel ?? "ALL",
      note: input.note ?? null,
      createdAt: existing?.createdAt ?? nowIso(),
    };
    records.set(id, next);
    return next;
  },

  findMatch(
    organizationId: string,
    fingerprint: string | null,
    allowedReasons: MarketingSuppressionReason[],
  ): MarketingSuppressionRecord | null {
    if (!fingerprint) return null;
    seedFixtureSuppressions(organizationId);
    const fp = fingerprint.toLowerCase();
    const allow =
      allowedReasons.length === 0
        ? null
        : new Set(allowedReasons);
    for (const r of records.values()) {
      if (r.organizationId !== organizationId) continue;
      if (r.fingerprint !== fp) continue;
      if (allow && !allow.has(r.reason)) continue;
      return r;
    }
    return null;
  },
};
