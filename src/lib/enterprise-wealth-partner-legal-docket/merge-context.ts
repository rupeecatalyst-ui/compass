/**
 * CO-WP-007 — Build merge context from Enterprise SSOT inputs.
 */

import { companyProfileSeed } from "@/data/catalyst-one/organization/company-profile";
import {
  WEALTH_PARTNER_LEGAL_ORG_POLICY,
  formatAgreementVersion,
} from "@/constants/enterprise-wealth-partner-legal-docket";
import { wealthPartnerTypeLabel } from "@/constants/enterprise-wealth-partner-registry";
import type { EnterpriseWealthPartnerRecord } from "@/types/enterprise-wealth-partner-registry";
import type {
  WealthPartnerLegalMergeContext,
  WealthPartnerLegalOrgPolicy,
} from "@/types/enterprise-wealth-partner-legal-docket";

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "Not Specified";
  return String(n);
}

function dateLabel(iso: string | null | undefined): string {
  if (!iso) return "Not Specified";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export type BuildLegalMergeInput = {
  partner: EnterpriseWealthPartnerRecord;
  policy?: WealthPartnerLegalOrgPolicy;
  bankSummary?: string | null;
  reportingManager?: string | null;
  territory?: string | null;
  versionNumber: number;
  effectiveFrom: string;
  effectiveUntil: string;
  activatedBy?: string | null;
  approvalDate?: string | null;
  generatedAt?: string;
};

export function buildWealthPartnerLegalMergeContext(
  input: BuildLegalMergeInput,
): WealthPartnerLegalMergeContext {
  const policy = input.policy ?? WEALTH_PARTNER_LEGAL_ORG_POLICY;
  const org = companyProfileSeed;
  const partner = input.partner;
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const address = [partner.cityLabel, partner.stateLabel].filter(Boolean).join(", ") || "Not Specified";
  const profile = (partner.profileJson ?? {}) as Record<string, unknown>;
  const territory =
    input.territory ||
    (typeof profile.territory === "string" ? profile.territory : null) ||
    partner.cityLabel ||
    "Not Specified";
  const reportingManager =
    input.reportingManager ||
    (typeof profile.reportingManager === "string" ? profile.reportingManager : null) ||
    policy.relationshipManagerFallback;

  return {
    partnerCode: partner.code,
    partnerName: partner.displayName,
    partnerTypeLabel: wealthPartnerTypeLabel(partner.partnerType),
    partnerType: partner.partnerType,
    mobile: partner.mobile?.trim() || "Not Specified",
    email: partner.email?.trim() || "Not Specified",
    address,
    city: partner.cityLabel?.trim() || "Not Specified",
    state: partner.stateLabel?.trim() || "Not Specified",
    statusLabel: `${partner.lifecycleStatus} / ${partner.operationalStatus}`,
    lifecycleStatus: partner.lifecycleStatus,
    reportingManager,
    territory,
    referralSharePercent: pct(partner.commercialReferralSharePercent),
    soleExecutorSharePercent: pct(partner.commercialSoleExecutorSharePercent),
    jointExecutorSharePercent: pct(partner.commercialJointExecutorSharePercent),
    commercialEffectiveFrom: dateLabel(partner.commercialEffectiveFrom),
    commercialVersion: String(partner.versionNumber || 1),
    pan: partner.pan?.trim() || "Not Specified",
    gstin: partner.gstin?.trim() || "Not Specified",
    bankSummary: input.bankSummary?.trim() || "Not Specified",
    companyName: org.companyName,
    companyBrand: org.brandName,
    companyAddress: org.registeredAddress,
    companyGstin: org.gst,
    companyPan: org.pan,
    authorisedSignatory: policy.authorisedSignatoryName,
    authorisedSignatoryTitle: policy.authorisedSignatoryTitle,
    companyLogoInitials: org.logoInitials,
    approvalDate: dateLabel(input.approvalDate ?? generatedAt),
    activatedBy: input.activatedBy?.trim() || "Not Specified",
    documentVersion: formatAgreementVersion(input.versionNumber),
    generatedDate: dateLabel(generatedAt),
    generatedDateTime: new Date(generatedAt).toLocaleString("en-GB"),
    effectiveFrom: dateLabel(input.effectiveFrom),
    effectiveUntil: dateLabel(input.effectiveUntil),
    validityYears: String(policy.agreementValidityYears),
    operationsContact: policy.operationsContact,
    financeContact: policy.financeContact,
    supportContact: policy.supportContact,
    relationshipManager: reportingManager,
  };
}

export function computeAgreementWindow(input: {
  effectiveFrom?: string | null;
  policy?: WealthPartnerLegalOrgPolicy;
  now?: Date;
}): { effectiveFrom: string; effectiveUntil: string } {
  const policy = input.policy ?? WEALTH_PARTNER_LEGAL_ORG_POLICY;
  const start = input.effectiveFrom
    ? new Date(input.effectiveFrom)
    : (input.now ?? new Date());
  const effectiveFrom = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const effectiveUntil = new Date(effectiveFrom);
  effectiveUntil.setUTCFullYear(
    effectiveUntil.getUTCFullYear() + policy.agreementValidityYears,
  );
  return {
    effectiveFrom: effectiveFrom.toISOString(),
    effectiveUntil: effectiveUntil.toISOString(),
  };
}
