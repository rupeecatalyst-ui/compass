/**
 * CO-WP-007 — Parse / empty Legal Docket state inside complianceJson.
 */

import type {
  WealthPartnerAgreementState,
  WealthPartnerComplianceJson,
  WealthPartnerLegalDocketState,
} from "@/types/enterprise-wealth-partner-legal-docket";

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyAgreementState(): WealthPartnerAgreementState {
  return {
    status: "not_started",
    version: "0.0",
    versionNumber: 0,
    effectiveFrom: null,
    effectiveUntil: null,
    generatedAt: null,
    sentAt: null,
    partnerSignedAt: null,
    companyCountersignedAt: null,
    activatedAt: null,
    renewedAt: null,
    expiredAt: null,
    suspendedAt: null,
    activatedBy: null,
    partnerSignatoryName: null,
    companySignatoryName: null,
    commercialVersion: null,
  };
}

export function emptyLegalDocketState(): WealthPartnerLegalDocketState {
  return {
    schemaVersion: 1,
    agreement: emptyAgreementState(),
    documents: [],
    timeline: [],
    audit: [],
    reminders: [],
  };
}

export function parseComplianceJson(
  raw: Record<string, unknown> | null | undefined,
): WealthPartnerComplianceJson {
  if (!raw || typeof raw !== "object") return {};
  return raw as WealthPartnerComplianceJson;
}

export function getLegalDocketFromCompliance(
  raw: Record<string, unknown> | null | undefined,
): WealthPartnerLegalDocketState {
  const parsed = parseComplianceJson(raw);
  if (parsed.legalDocket?.schemaVersion === 1) {
    return {
      schemaVersion: 1,
      agreement: { ...emptyAgreementState(), ...parsed.legalDocket.agreement },
      documents: Array.isArray(parsed.legalDocket.documents)
        ? parsed.legalDocket.documents
        : [],
      timeline: Array.isArray(parsed.legalDocket.timeline)
        ? parsed.legalDocket.timeline
        : [],
      audit: Array.isArray(parsed.legalDocket.audit) ? parsed.legalDocket.audit : [],
      reminders: Array.isArray(parsed.legalDocket.reminders)
        ? parsed.legalDocket.reminders
        : [],
    };
  }
  return emptyLegalDocketState();
}

export function mergeComplianceJson(
  existing: Record<string, unknown> | null | undefined,
  patch: Partial<WealthPartnerComplianceJson> & {
    legalDocket?: WealthPartnerLegalDocketState;
  },
): Record<string, unknown> {
  const base = { ...(existing ?? {}) };
  const next: Record<string, unknown> = {
    ...base,
    schemaVersion: 1,
    ...patch,
  };
  if (patch.legalDocket) {
    next.legalDocket = patch.legalDocket;
    // Mirror legacy agreementStatus for older UI readers
    next.agreementStatus = mapLegacyAgreementStatus(patch.legalDocket.agreement.status);
  }
  return next;
}

function mapLegacyAgreementStatus(status: string): string {
  if (status === "active" || status === "renewal_due") return "signed";
  if (status === "expired" || status === "suspended") return "expired";
  if (status === "not_started") return "pending";
  return "pending";
}

export { newId };
