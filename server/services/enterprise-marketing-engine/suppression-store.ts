/**
 * CO-MARKETING-REDESIGN-012 — Durable consent / suppression ledger.
 * Extends MKT-03 fixture store. No live send. No real recipient ingest.
 */

import type { MarketingSuppressionReason } from "@/constants/enterprise-marketing-engine/audience";
import {
  MARKETING_DEFAULT_SOFT_BOUNCE_TTL_MS,
  type MarketingConsentChannel,
  type MarketingConsentRecordKind,
  type MarketingConsentSource,
} from "@/constants/enterprise-marketing-engine/consent-suppression";
import type { MarketingSuppressionRecord } from "@/types/enterprise-marketing-audience";
import type {
  MarketingConsentCentreCard,
  MarketingConsentPolicy,
  MarketingConsentSuppressionRecord,
} from "@/types/enterprise-marketing-consent";
import { defaultMarketingConsentPolicy } from "@/lib/enterprise-marketing-engine/consent-policy";
import {
  canonicalMarketingConsentKind,
  evaluateMarketingDeliveryBlock,
} from "@/lib/enterprise-marketing-engine/consent-evaluate";

const records = new Map<string, MarketingConsentSuppressionRecord>();
const policies = new Map<string, MarketingConsentPolicy>();
const seededOrgs = new Set<string>();

function nowIso() {
  return new Date().toISOString();
}

function requireOrg(organizationId: string): string {
  const trimmed = organizationId.trim();
  if (!trimmed) {
    throw Object.assign(new Error("Marketing requires an authenticated organization"), {
      statusCode: 400,
      code: "ORGANIZATION_REQUIRED",
    });
  }
  return trimmed;
}

function durationForKind(kind: MarketingConsentRecordKind): MarketingConsentSuppressionRecord["duration"] {
  if (kind === "TEMPORARY_SUPPRESSION" || kind === "SOFT_BOUNCE") return "TEMPORARY";
  return "PERMANENT";
}

function toLegacyReason(
  kind: MarketingConsentRecordKind,
  requested?: string | null,
): MarketingSuppressionRecord["reason"] {
  if (requested === "UNSUBSCRIBE" || kind === "UNSUBSCRIBED") return "UNSUBSCRIBE";
  if (requested === "COMPLAINT" || kind === "SPAM_COMPLAINT") return "COMPLAINT";
  if (requested === "INVALID" || kind === "INVALID_ADDRESS") return "INVALID";
  if (requested === "DO_NOT_CONTACT" || kind === "LEGAL_COMPLIANCE") return "DO_NOT_CONTACT";
  if (requested === "MANUAL" || kind === "MANUAL_SUPPRESSION") return "MANUAL";
  if (requested === "PRIOR_SUPPRESSION") return "PRIOR_SUPPRESSION";
  if (requested === "HARD_BOUNCE" || kind === "HARD_BOUNCE") return "HARD_BOUNCE";
  return "MANUAL";
}

function seedFixtureSuppressions(organizationId: string) {
  if (seededOrgs.has(organizationId)) return;
  seededOrgs.add(organizationId);
  const ts = nowIso();
  const samples: Array<{
    fingerprint: string;
    kind: MarketingConsentRecordKind;
    reason: MarketingSuppressionReason;
  }> = [
    { fingerprint: "email:asha.verma@example.com", kind: "UNSUBSCRIBED", reason: "UNSUBSCRIBE" },
    { fingerprint: "email:gamma.one@example.com", kind: "LEGAL_COMPLIANCE", reason: "DO_NOT_CONTACT" },
    { fingerprint: "phone:9000000001", kind: "HARD_BOUNCE", reason: "HARD_BOUNCE" },
  ];
  for (const sample of samples) {
    const id = `mkt-sup-${organizationId}-${sample.reason}-${sample.fingerprint.slice(0, 24)}`;
    records.set(id, {
      id,
      organizationId,
      channel: "ALL",
      normalizedIdentity: sample.fingerprint,
      fingerprint: sample.fingerprint,
      normalizedEmail: sample.fingerprint.startsWith("email:") ? sample.fingerprint.slice(6) : null,
      kind: sample.kind,
      reason: sample.reason,
      status: "ACTIVE",
      duration: "PERMANENT",
      source: "SYSTEM_FIXTURE",
      note: "Fixture seed — delivery not active",
      effectiveAt: ts,
      expiresAt: null,
      campaignId: null,
      providerEventId: null,
      actorUserId: null,
      createdAt: ts,
      updatedAt: ts,
      auditTimestamp: ts,
    });
  }
}

export const marketingSuppressionStore = {
  policy(organizationId: string): MarketingConsentPolicy {
    const org = requireOrg(organizationId);
    return policies.get(org) ?? defaultMarketingConsentPolicy(org);
  },

  savePolicy(
    organizationId: string,
    patch: Partial<Omit<MarketingConsentPolicy, "organizationId">>,
    actorUserId?: string | null,
  ): MarketingConsentPolicy {
    const org = requireOrg(organizationId);
    const next: MarketingConsentPolicy = {
      ...this.policy(org),
      ...patch,
      organizationId: org,
      updatedAt: nowIso(),
      updatedByUserId: actorUserId ?? null,
    };
    policies.set(org, next);
    return next;
  },

  list(organizationId: string): MarketingConsentSuppressionRecord[] {
    const org = requireOrg(organizationId);
    seedFixtureSuppressions(org);
    return [...records.values()]
      .filter((row) => row.organizationId === org)
      .sort((a, b) => b.auditTimestamp.localeCompare(a.auditTimestamp));
  },

  history(organizationId: string, fingerprint: string): MarketingConsentSuppressionRecord[] {
    const fp = fingerprint.trim().toLowerCase();
    return this.list(organizationId).filter(
      (row) =>
        row.fingerprint.toLowerCase() === fp ||
        row.normalizedIdentity.toLowerCase() === fp ||
        (row.normalizedEmail && `email:${row.normalizedEmail}` === fp),
    );
  },

  cards(organizationId: string): MarketingConsentCentreCard[] {
    const rows = this.list(organizationId).filter((row) => row.status === "ACTIVE");
    const count = (kind: MarketingConsentRecordKind) => rows.filter((row) => row.kind === kind).length;
    return [
      { id: "unsubscribed", label: "Unsubscribed", count: count("UNSUBSCRIBED"), availability: "available" },
      { id: "hard_bounce", label: "Hard bounce", count: count("HARD_BOUNCE"), availability: "available" },
      { id: "complaint", label: "Spam complaint", count: count("SPAM_COMPLAINT"), availability: "available" },
      { id: "temporary", label: "Temporary", count: count("TEMPORARY_SUPPRESSION") + count("SOFT_BOUNCE"), availability: "available" },
      { id: "manual", label: "Manual / legal", count: count("MANUAL_SUPPRESSION") + count("LEGAL_COMPLIANCE"), availability: "available" },
    ];
  },

  upsert(input: {
    organizationId: string;
    fingerprint: string;
    reason: MarketingSuppressionReason | MarketingConsentRecordKind | string;
    channel?: MarketingConsentChannel;
    note?: string | null;
    kind?: MarketingConsentRecordKind;
    source?: MarketingConsentSource;
    actorUserId?: string | null;
    campaignId?: string | null;
    providerEventId?: string | null;
    expiresAt?: string | null;
    effectiveAt?: string | null;
    duration?: MarketingConsentSuppressionRecord["duration"];
  }): MarketingConsentSuppressionRecord {
    const organizationId = requireOrg(input.organizationId);
    seedFixtureSuppressions(organizationId);
    const fingerprint = input.fingerprint.trim().toLowerCase();
    const kind =
      input.kind ??
      canonicalMarketingConsentKind(input.reason) ??
      "MANUAL_SUPPRESSION";
    const existing = [...records.values()].find(
      (row) =>
        row.organizationId === organizationId &&
        row.fingerprint === fingerprint &&
        row.kind === kind &&
        row.status === "ACTIVE",
    );
    const ts = nowIso();
    const duration = input.duration ?? durationForKind(kind);
    let expiresAt = input.expiresAt ?? existing?.expiresAt ?? null;
    if (duration === "TEMPORARY" && !expiresAt) {
      expiresAt = new Date(Date.now() + MARKETING_DEFAULT_SOFT_BOUNCE_TTL_MS).toISOString();
    }
    const id =
      existing?.id ??
      `mkt-sup-${organizationId}-${kind}-${fingerprint.slice(0, 32)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const next: MarketingConsentSuppressionRecord = {
      id,
      organizationId,
      channel: input.channel ?? existing?.channel ?? "ALL",
      normalizedIdentity: fingerprint,
      fingerprint,
      normalizedEmail: fingerprint.startsWith("email:") ? fingerprint.slice(6) : existing?.normalizedEmail ?? null,
      kind,
      reason: toLegacyReason(kind, input.reason),
      status: "ACTIVE",
      duration,
      source: input.source ?? existing?.source ?? "MANUAL",
      note: input.note ?? existing?.note ?? null,
      effectiveAt: input.effectiveAt ?? existing?.effectiveAt ?? ts,
      expiresAt,
      campaignId: input.campaignId ?? existing?.campaignId ?? null,
      providerEventId: input.providerEventId ?? existing?.providerEventId ?? null,
      actorUserId: input.actorUserId ?? existing?.actorUserId ?? null,
      createdAt: existing?.createdAt ?? ts,
      updatedAt: ts,
      auditTimestamp: ts,
    };
    records.set(id, next);
    return next;
  },

  lift(input: {
    organizationId: string;
    recordId: string;
    reason: string;
    actorUserId?: string | null;
  }): MarketingConsentSuppressionRecord {
    const organizationId = requireOrg(input.organizationId);
    const row = records.get(input.recordId);
    if (!row || row.organizationId !== organizationId) {
      throw Object.assign(new Error("Suppression record not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    if (!input.reason.trim()) {
      throw Object.assign(new Error("A reason is required to lift suppression"), {
        statusCode: 400,
        code: "SUPPRESSION_REASON_REQUIRED",
      });
    }
    const ts = nowIso();
    const next: MarketingConsentSuppressionRecord = {
      ...row,
      status: "LIFTED",
      note: `${row.note ? `${row.note} · ` : ""}Lifted: ${input.reason.trim()}`,
      actorUserId: input.actorUserId ?? row.actorUserId,
      updatedAt: ts,
      auditTimestamp: ts,
    };
    records.set(row.id, next);
    return next;
  },

  findMatch(
    organizationId: string,
    fingerprint: string | null,
    allowedReasons: MarketingSuppressionReason[],
  ): MarketingConsentSuppressionRecord | null {
    if (!fingerprint) return null;
    const org = requireOrg(organizationId);
    seedFixtureSuppressions(org);
    const decision = evaluateMarketingDeliveryBlock({
      records: this.list(org),
      policy: this.policy(org),
      phase: "delivery",
      channel: "EMAIL",
      fingerprints: [fingerprint],
      applyOptionalOrgSuppression: true,
      allowedReasons,
    });
    if (!decision.blocked || !decision.recordId) return null;
    return records.get(decision.recordId) ?? null;
  },

  evaluateDelivery(input: {
    organizationId: string;
    fingerprints: string[];
    channel?: string;
    phase: "snapshot_approval" | "delivery";
    consentValue?: string | null;
    campaignId?: string | null;
    applyOptionalOrgSuppression?: boolean;
    allowedReasons?: MarketingSuppressionReason[];
  }) {
    const org = requireOrg(input.organizationId);
    seedFixtureSuppressions(org);
    return evaluateMarketingDeliveryBlock({
      records: this.list(org),
      policy: this.policy(org),
      phase: input.phase,
      channel: input.channel ?? "EMAIL",
      fingerprints: input.fingerprints,
      consentValue: input.consentValue,
      campaignId: input.campaignId,
      applyOptionalOrgSuppression: input.applyOptionalOrgSuppression,
      allowedReasons: input.allowedReasons,
    });
  },

  reset(): void {
    records.clear();
    policies.clear();
    seededOrgs.clear();
  },
};
