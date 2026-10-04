/**
 * CO-MARKETING-REDESIGN-012 — Consent and Suppression Centre service.
 * Fixture identities only. No live send. No real recipient ingest.
 */

import { ENTERPRISE_MARKETING_EXECUTION_ENABLED } from "@/constants/enterprise-marketing-engine";
import {
  MARKETING_CONSENT_RECORD_KINDS,
  type MarketingConsentChannel,
  type MarketingConsentRecordKind,
  type MarketingConsentSource,
} from "@/constants/enterprise-marketing-engine/consent-suppression";
import { MARKETING_PERMISSIONS } from "@/constants/enterprise-marketing-engine/permissions";
import { assertMarketingPermission, canViewMarketingRecipientPii } from "@/lib/enterprise-marketing-engine/permissions";
import { filterMarketingConsentRegistry } from "@/lib/enterprise-marketing-engine/consent-registry";
import { maskMarketingConsentIdentity } from "@/lib/enterprise-marketing-engine/consent-redact";
import type {
  MarketingConsentExportRow,
  MarketingConsentPolicy,
  MarketingConsentSuppressionRecord,
} from "@/types/enterprise-marketing-consent";
import { listRecentMarketingAuditEvents, recordMarketingAuditEvent } from "./audit";
import { marketingSuppressionStore } from "./suppression-store";

type Actor = {
  userId?: string;
  role?: string;
  organizationId?: string | null;
  marketingPermissions?: string[];
};

function orgId(actorOrg?: string | null) {
  const trimmed = (actorOrg ?? "").trim();
  if (!trimmed || trimmed === "default") {
    throw Object.assign(new Error("Marketing requires an authenticated organization"), {
      statusCode: 400,
      code: "ORGANIZATION_REQUIRED",
    });
  }
  return trimmed;
}

function assertNoSend() {
  void ENTERPRISE_MARKETING_EXECUTION_ENABLED;
}

function requireReason(reason: string | null | undefined, action: string) {
  const trimmed = (reason ?? "").trim();
  if (!trimmed) {
    throw Object.assign(new Error(`A reason is required to ${action} suppression`), {
      statusCode: 400,
      code: "SUPPRESSION_REASON_REQUIRED",
    });
  }
  return trimmed;
}

function assertFixtureIdentity(fingerprint: string) {
  const fp = fingerprint.trim().toLowerCase();
  const email = fp.startsWith("email:") ? fp.slice(6) : fp.includes("@") ? fp : "";
  if (email && !email.endsWith("@example.com")) {
    throw Object.assign(new Error("Consent Centre accepts fixture identities only (@example.com)"), {
      statusCode: 400,
      code: "FIXTURE_RECIPIENTS_ONLY",
    });
  }
}

function toView(
  record: MarketingConsentSuppressionRecord,
  canViewPii: boolean,
): MarketingConsentSuppressionRecord & { identityPreview: string } {
  return {
    ...record,
    fingerprint: canViewPii ? record.fingerprint : maskMarketingConsentIdentity(record, false),
    normalizedIdentity: canViewPii
      ? record.normalizedIdentity
      : maskMarketingConsentIdentity(record, false),
    normalizedEmail: canViewPii ? record.normalizedEmail : null,
    identityPreview: maskMarketingConsentIdentity(record, canViewPii),
  };
}

export const marketingConsentService = {
  cards(actor: Actor) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.SUPPRESSION_VIEW);
    const organizationId = orgId(actor.organizationId);
    return marketingSuppressionStore.cards(organizationId);
  },

  policy(actor: Actor) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.SUPPRESSION_VIEW);
    return marketingSuppressionStore.policy(orgId(actor.organizationId));
  },

  list(
    actor: Actor,
    query?: {
      search?: string | null;
      kind?: MarketingConsentRecordKind | "all" | null;
      source?: MarketingConsentSource | "all" | null;
      campaignId?: string | null;
      status?: string | null;
    },
  ) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.SUPPRESSION_VIEW);
    const organizationId = orgId(actor.organizationId);
    const canViewPii = canViewMarketingRecipientPii(actor);
    const rows = filterMarketingConsentRegistry(marketingSuppressionStore.list(organizationId), query);
    return rows.map((row) => toView(row, canViewPii));
  },

  history(actor: Actor, fingerprint: string) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.SUPPRESSION_VIEW);
    const organizationId = orgId(actor.organizationId);
    const canViewPii = canViewMarketingRecipientPii(actor);
    return marketingSuppressionStore.history(organizationId, fingerprint).map((row) => toView(row, canViewPii));
  },

  add(
    actor: Actor,
    input: {
      fingerprint: string;
      reason: string;
      kind?: MarketingConsentRecordKind | string;
      channel?: MarketingConsentChannel;
      source?: MarketingConsentSource;
      campaignId?: string | null;
      expiresAt?: string | null;
      duration?: MarketingConsentSuppressionRecord["duration"];
    },
  ) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.SUPPRESSION_MANAGE);
    const organizationId = orgId(actor.organizationId);
    const reason = requireReason(input.reason, "add");
    const fingerprint = input.fingerprint.trim().toLowerCase();
    assertFixtureIdentity(fingerprint);
    const kind = (input.kind as MarketingConsentRecordKind | undefined) ?? undefined;
    if (kind && !(MARKETING_CONSENT_RECORD_KINDS as readonly string[]).includes(kind)) {
      throw Object.assign(new Error("Unknown consent record kind"), {
        statusCode: 400,
        code: "INVALID_CONSENT_KIND",
      });
    }
    if ((kind === "TEMPORARY_SUPPRESSION" || kind === "SOFT_BOUNCE" || input.duration === "TEMPORARY") && !input.expiresAt) {
      // Store applies default TTL; duration still distinguished from permanent.
    }
    const record = marketingSuppressionStore.upsert({
      organizationId,
      fingerprint: fingerprint.includes(":") ? fingerprint : `email:${fingerprint}`,
      reason,
      kind,
      channel: input.channel ?? "EMAIL",
      source: input.source ?? "MANUAL",
      note: reason,
      actorUserId: actor.userId ?? null,
      campaignId: input.campaignId ?? null,
      expiresAt: input.expiresAt ?? null,
      duration: input.duration,
    });
    recordMarketingAuditEvent({
      kind: "consent.add",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: {
        recordId: record.id,
        kind: record.kind,
        reason,
        duration: record.duration,
        auditTimestamp: record.auditTimestamp,
      },
    });
    return toView(record, canViewMarketingRecipientPii(actor));
  },

  lift(actor: Actor, recordId: string, reason: string) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.SUPPRESSION_MANAGE);
    const organizationId = orgId(actor.organizationId);
    const note = requireReason(reason, "lift");
    const record = marketingSuppressionStore.lift({
      organizationId,
      recordId,
      reason: note,
      actorUserId: actor.userId ?? null,
    });
    recordMarketingAuditEvent({
      kind: "consent.lift",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: {
        recordId: record.id,
        reason: note,
        auditTimestamp: record.auditTimestamp,
      },
    });
    return toView(record, canViewMarketingRecipientPii(actor));
  },

  savePolicy(actor: Actor, patch: Partial<Omit<MarketingConsentPolicy, "organizationId">>) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.SUPPRESSION_MANAGE);
    const organizationId = orgId(actor.organizationId);
    const policy = marketingSuppressionStore.savePolicy(organizationId, patch, actor.userId ?? null);
    recordMarketingAuditEvent({
      kind: "consent.policy.update",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: {
        requireExplicitConsent: policy.requireExplicitConsent,
        auditTimestamp: policy.updatedAt,
      },
    });
    return policy;
  },

  prepareExport(actor: Actor) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.SUPPRESSION_EXPORT);
    const organizationId = orgId(actor.organizationId);
    const canViewPii = canViewMarketingRecipientPii(actor);
    const rows: MarketingConsentExportRow[] = marketingSuppressionStore.list(organizationId).map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      kind: row.kind,
      status: row.status,
      channel: row.channel,
      identityPreview: maskMarketingConsentIdentity(row, canViewPii),
      reason: String(row.reason),
      source: row.source,
      effectiveAt: row.effectiveAt,
      expiresAt: row.expiresAt,
      campaignId: row.campaignId,
      actorPreview: row.actorUserId ? (canViewPii ? row.actorUserId : "actor:redacted") : "system",
      auditTimestamp: row.auditTimestamp,
    }));
    recordMarketingAuditEvent({
      kind: "consent.export.prepare",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { rowCount: rows.length, piiIncluded: canViewPii },
    });
    return { prepared: true, fileWritten: false, rows };
  },

  evaluateDelivery(
    actor: Actor,
    input: {
      fingerprints: string[];
      phase: "snapshot_approval" | "delivery";
      channel?: string;
      consentValue?: string | null;
      campaignId?: string | null;
    },
  ) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.SUPPRESSION_VIEW);
    return marketingSuppressionStore.evaluateDelivery({
      organizationId: orgId(actor.organizationId),
      fingerprints: input.fingerprints,
      phase: input.phase,
      channel: input.channel,
      consentValue: input.consentValue,
      campaignId: input.campaignId,
      applyOptionalOrgSuppression: true,
    });
  },

  recentAudit(actor: Actor, limit = 20) {
    assertNoSend();
    const organizationId = orgId(actor.organizationId);
    return listRecentMarketingAuditEvents(limit).filter((event) => event.organizationId === organizationId);
  },

  delete(actor: Actor, recordId: string): never {
    throw Object.assign(new Error("Consent records are not deleted — lift with a reason instead"), {
      statusCode: 409,
      code: "CONSENT_DELETE_FORBIDDEN",
      actorUserId: actor.userId ?? null,
      recordId,
    });
  },
};
