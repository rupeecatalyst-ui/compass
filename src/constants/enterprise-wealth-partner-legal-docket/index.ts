/**
 * CO-WP-007 — Wealth Partner Legal Docket constants & Organisation Policy.
 */

import type {
  WealthPartnerLegalDocumentKind,
  WealthPartnerLegalOrgPolicy,
} from "@/types/enterprise-wealth-partner-legal-docket";

export const WEALTH_PARTNER_LEGAL_MODULE_ID = "co-wp-007";

/**
 * Organisation Policy SSOT — Agreement Validity.
 * Not hardcoded in UI logic beyond reading this policy object.
 * Future: Administration Console may override via org settings without code change.
 */
export const WEALTH_PARTNER_LEGAL_ORG_POLICY: WealthPartnerLegalOrgPolicy = {
  agreementValidityYears: 5,
  renewalReminderDays: [180, 90, 30],
  authorisedSignatoryTitle: "Authorised Signatory",
  authorisedSignatoryName: "Compliance Officer",
  operationsContact: "operations@rupeecatalyst.com · +91 22 4890 1200",
  financeContact: "finance@rupeecatalyst.com · +91 22 4890 1201",
  supportContact: "support@rupeecatalyst.com · +91 22 4890 1202",
  relationshipManagerFallback: "Relationship Manager (assigned)",
};

export const WEALTH_PARTNER_LEGAL_DOCKET_DOCUMENTS: ReadonlyArray<{
  kind: WealthPartnerLegalDocumentKind;
  name: string;
  typeRef: string;
  order: number;
}> = [
  {
    kind: "cover_sheet",
    name: "Legal Docket Cover Sheet",
    typeRef: "wp:legal:cover_sheet",
    order: 1,
  },
  {
    kind: "welcome_letter",
    name: "Welcome Letter",
    typeRef: "wp:legal:welcome_letter",
    order: 2,
  },
  {
    kind: "engagement_agreement",
    name: "Channel Partner Engagement Agreement",
    typeRef: "wp:legal:engagement_agreement",
    order: 3,
  },
  {
    kind: "commercial_schedule",
    name: "Commercial Schedule",
    typeRef: "wp:legal:commercial_schedule",
    order: 4,
  },
  {
    kind: "code_of_conduct",
    name: "Code of Conduct",
    typeRef: "wp:legal:code_of_conduct",
    order: 5,
  },
  {
    kind: "privacy_undertaking",
    name: "Privacy & Confidentiality Undertaking",
    typeRef: "wp:legal:privacy_undertaking",
    order: 6,
  },
  {
    kind: "acceptable_use_policy",
    name: "Catalyst One Acceptable Use Policy",
    typeRef: "wp:legal:acceptable_use_policy",
    order: 7,
  },
  {
    kind: "branding_guidelines",
    name: "Branding & Marketing Guidelines",
    typeRef: "wp:legal:branding_guidelines",
    order: 8,
  },
  {
    kind: "compliance_declaration",
    name: "Compliance Declaration",
    typeRef: "wp:legal:compliance_declaration",
    order: 9,
  },
  {
    kind: "kyc_summary",
    name: "KYC Summary",
    typeRef: "wp:legal:kyc_summary",
    order: 10,
  },
  {
    kind: "operational_contacts",
    name: "Operational Contacts",
    typeRef: "wp:legal:operational_contacts",
    order: 11,
  },
  {
    kind: "digital_acceptance_certificate",
    name: "Digital Acceptance Certificate",
    typeRef: "wp:legal:digital_acceptance_certificate",
    order: 12,
  },
] as const;

export function wealthPartnerLegalDocumentMeta(kind: WealthPartnerLegalDocumentKind) {
  return WEALTH_PARTNER_LEGAL_DOCKET_DOCUMENTS.find((d) => d.kind === kind)!;
}

export function formatAgreementVersion(versionNumber: number): string {
  return `${versionNumber}.0`;
}
