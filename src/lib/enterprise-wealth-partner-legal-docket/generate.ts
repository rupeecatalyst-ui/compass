/**
 * CO-WP-007 — Generate Legal Docket documents + renewal reminders.
 */

import {
  WEALTH_PARTNER_LEGAL_DOCKET_DOCUMENTS,
  WEALTH_PARTNER_LEGAL_ORG_POLICY,
  formatAgreementVersion,
  wealthPartnerLegalDocumentMeta,
} from "@/constants/enterprise-wealth-partner-legal-docket";
import type { EnterpriseWealthPartnerRecord } from "@/types/enterprise-wealth-partner-registry";
import type {
  WealthPartnerLegalDocumentRecord,
  WealthPartnerLegalDocketState,
  WealthPartnerLegalOrgPolicy,
  WealthPartnerLegalReminder,
} from "@/types/enterprise-wealth-partner-legal-docket";
import {
  buildWealthPartnerLegalMergeContext,
  computeAgreementWindow,
} from "./merge-context";
import { applyWealthPartnerLegalMerge, wrapLegalDocumentHtml } from "./merge";
import { getWealthPartnerLegalTemplate } from "./templates";
import { emptyLegalDocketState, newId } from "./state";

export function buildRenewalReminders(input: {
  effectiveUntil: string;
  policy?: WealthPartnerLegalOrgPolicy;
}): WealthPartnerLegalReminder[] {
  const policy = input.policy ?? WEALTH_PARTNER_LEGAL_ORG_POLICY;
  const expiry = new Date(input.effectiveUntil).getTime();
  const labels: Record<number, { kind: WealthPartnerLegalReminder["kind"]; label: string }> = {
    180: { kind: "internal", label: "Internal Reminder — 180 days before expiry" },
    90: { kind: "partner", label: "Partner Reminder — 90 days before expiry" },
    30: { kind: "high_priority", label: "High Priority Reminder — 30 days before expiry" },
  };
  const reminders: WealthPartnerLegalReminder[] = policy.renewalReminderDays.map((days) => {
    const due = new Date(expiry);
    due.setUTCDate(due.getUTCDate() - days);
    const meta = labels[days] ?? {
      kind: "internal" as const,
      label: `Reminder — ${days} days before expiry`,
    };
    return {
      id: newId("rem"),
      daysBeforeExpiry: days,
      kind: meta.kind,
      dueAt: due.toISOString(),
      firedAt: null,
      status: "scheduled",
      label: meta.label,
    };
  });
  reminders.push({
    id: newId("rem"),
    daysBeforeExpiry: 0,
    kind: "expired",
    dueAt: input.effectiveUntil,
    firedAt: null,
    status: "scheduled",
    label: "Agreement Expired — status changes to Expired",
  });
  return reminders;
}

export function generateWealthPartnerLegalDocket(input: {
  partner: EnterpriseWealthPartnerRecord;
  bankSummary?: string | null;
  reportingManager?: string | null;
  territory?: string | null;
  actorUserId: string;
  /** When renewing / reactivating — bump from previous. */
  previous?: WealthPartnerLegalDocketState | null;
  policy?: WealthPartnerLegalOrgPolicy;
  now?: Date;
}): WealthPartnerLegalDocketState {
  const policy = input.policy ?? WEALTH_PARTNER_LEGAL_ORG_POLICY;
  const now = input.now ?? new Date();
  const generatedAt = now.toISOString();
  const previous = input.previous ?? emptyLegalDocketState();
  const nextVersion =
    previous.agreement.versionNumber > 0
      ? previous.agreement.versionNumber + 1
      : 1;
  const { effectiveFrom, effectiveUntil } = computeAgreementWindow({
    policy,
    now,
  });

  const mergeCtx = buildWealthPartnerLegalMergeContext({
    partner: input.partner,
    policy,
    bankSummary: input.bankSummary,
    reportingManager: input.reportingManager,
    territory: input.territory,
    versionNumber: nextVersion,
    effectiveFrom,
    effectiveUntil,
    activatedBy: input.actorUserId,
    approvalDate: generatedAt,
    generatedAt,
  });

  const archived = previous.documents.map((d) => ({
    ...d,
    status: "archived" as const,
  }));

  const documents: WealthPartnerLegalDocumentRecord[] = WEALTH_PARTNER_LEGAL_DOCKET_DOCUMENTS.map(
    (meta) => {
      const body = applyWealthPartnerLegalMerge(
        getWealthPartnerLegalTemplate(meta.kind),
        mergeCtx,
      );
      const contentHtml = wrapLegalDocumentHtml(meta.name, body);
      return {
        id: newId("wpld"),
        documentKind: meta.kind,
        documentName: meta.name,
        version: formatAgreementVersion(nextVersion),
        versionNumber: nextVersion,
        status: "generated",
        generatedAt,
        signedAt: null,
        effectiveFrom,
        effectiveUntil,
        contentHtml,
        documentRegistryRecordId: null,
        typeRef: meta.typeRef,
      };
    },
  );

  const isRenewal = previous.agreement.versionNumber > 0;

  return {
    schemaVersion: 1,
    agreement: {
      status: "generated",
      version: formatAgreementVersion(nextVersion),
      versionNumber: nextVersion,
      effectiveFrom,
      effectiveUntil,
      generatedAt,
      sentAt: null,
      partnerSignedAt: null,
      companyCountersignedAt: null,
      activatedAt: null,
      renewedAt: isRenewal ? generatedAt : null,
      expiredAt: null,
      suspendedAt: null,
      activatedBy: null,
      partnerSignatoryName: input.partner.displayName,
      companySignatoryName: policy.authorisedSignatoryName,
      commercialVersion: input.partner.versionNumber ?? 1,
    },
    documents: [...archived, ...documents],
    timeline: [
      ...previous.timeline,
      {
        id: newId("tl"),
        event: isRenewal ? "agreement_renewed" : "agreement_generated",
        at: generatedAt,
        actorUserId: input.actorUserId,
        detail: isRenewal
          ? `Legal Docket reactivated — Agreement ${formatAgreementVersion(nextVersion)}`
          : `Legal Docket generated — Agreement ${formatAgreementVersion(nextVersion)}`,
      },
      ...(isRenewal
        ? [
            {
              id: newId("tl"),
              event: "docket_reactivated" as const,
              at: generatedAt,
              actorUserId: input.actorUserId,
              detail: "Fresh Legal Docket + Commercial Schedule generated. Prior versions archived.",
            },
          ]
        : []),
    ],
    audit: [
      ...previous.audit,
      {
        id: newId("aud"),
        action: isRenewal ? "renewed" : "generated",
        at: generatedAt,
        actorUserId: input.actorUserId,
        detail: `${documents.length} documents generated (v${nextVersion}.0)`,
      },
      ...(isRenewal
        ? [
            {
              id: newId("aud"),
              action: "reactivated" as const,
              at: generatedAt,
              actorUserId: input.actorUserId,
              detail: "Reactivation docket created; previous versions remain viewable.",
            },
          ]
        : []),
    ],
    reminders: buildRenewalReminders({ effectiveUntil, policy }),
  };
}

export function stampDigitalAcceptanceCertificate(
  docket: WealthPartnerLegalDocketState,
  input: {
    partner: EnterpriseWealthPartnerRecord;
    actorUserId: string;
    bankSummary?: string | null;
    policy?: WealthPartnerLegalOrgPolicy;
    now?: Date;
  },
): WealthPartnerLegalDocketState {
  const policy = input.policy ?? WEALTH_PARTNER_LEGAL_ORG_POLICY;
  const nowIso = (input.now ?? new Date()).toISOString();
  const agreement = docket.agreement;
  if (!agreement.effectiveFrom || !agreement.effectiveUntil) return docket;

  const mergeCtx = buildWealthPartnerLegalMergeContext({
    partner: input.partner,
    policy,
    bankSummary: input.bankSummary,
    versionNumber: agreement.versionNumber,
    effectiveFrom: agreement.effectiveFrom,
    effectiveUntil: agreement.effectiveUntil,
    activatedBy: agreement.activatedBy ?? input.actorUserId,
    approvalDate: agreement.activatedAt ?? nowIso,
    generatedAt: nowIso,
  });
  const meta = wealthPartnerLegalDocumentMeta("digital_acceptance_certificate");
  const body = applyWealthPartnerLegalMerge(
    getWealthPartnerLegalTemplate("digital_acceptance_certificate"),
    mergeCtx,
  );
  const contentHtml = wrapLegalDocumentHtml(meta.name, body);

  const docs = docket.documents.map((d) => {
    if (
      d.documentKind === "digital_acceptance_certificate" &&
      d.versionNumber === agreement.versionNumber &&
      d.status !== "archived"
    ) {
      return {
        ...d,
        contentHtml,
        status: "signed" as const,
        signedAt: nowIso,
      };
    }
    if (d.versionNumber === agreement.versionNumber && d.status !== "archived") {
      return { ...d, status: "signed" as const, signedAt: d.signedAt ?? nowIso };
    }
    return d;
  });

  return { ...docket, documents: docs };
}
