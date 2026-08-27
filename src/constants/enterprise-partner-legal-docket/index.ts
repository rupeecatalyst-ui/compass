/**
 * CO-WP-REFINEMENT-006 — Partner Legal Docket Gateway constants.
 * Honest signing capability SSOT — never claim e-sign when not configured.
 */

import type { PartnerLegalSigningCapabilityDto } from "@/types/enterprise-partner-legal-docket";
import type {
  WealthPartnerAgreementStatus,
  WealthPartnerComplianceStatus,
  WealthPartnerLegalDocumentStatus,
} from "@/types/enterprise-wealth-partner-legal-docket";

/** External e-sign is not wired in Catalyst One yet. */
export const PARTNER_LEGAL_ESIGN_PROVIDER: string | null = null;

export const PARTNER_LEGAL_SIGNING_CAPABILITY: PartnerLegalSigningCapabilityDto = {
  mode: PARTNER_LEGAL_ESIGN_PROVIDER ? "external_esign" : "admin_lifecycle_only",
  partnerSelfSignAllowed: false,
  externalProvider: PARTNER_LEGAL_ESIGN_PROVIDER,
  notice:
    "Formal electronic signature (e-sign) is not yet configured in Catalyst One. You can review and download your agreement documents here. Signature completion is recorded by Rupee Catalyst after the authorised signing process — tapping a button in this app does not mark the agreement as legally signed.",
};

export const PARTNER_LEGAL_PRIMARY_AGREEMENT_KIND = "engagement_agreement" as const;

export function partnerLegalAgreementStatusLabel(
  status: WealthPartnerAgreementStatus,
): string {
  switch (status) {
    case "not_started":
      return "Not Started";
    case "generated":
    case "sent":
      return "Awaiting Signature";
    case "partner_signed":
      return "Signed by Partner";
    case "countersigned":
      return "Awaiting Activation";
    case "active":
      return "Completed";
    case "renewal_due":
      return "Renewal Due";
    case "expired":
      return "Expired";
    case "suspended":
      return "Suspended";
    default:
      return status;
  }
}

export function partnerLegalComplianceStatusLabel(
  status: WealthPartnerComplianceStatus,
): string {
  switch (status) {
    case "incomplete":
      return "Not Available";
    case "pending_signature":
      return "Awaiting Signature";
    case "compliant":
      return "Completed";
    case "renewal_due":
      return "Renewal Due";
    case "expired":
      return "Expired";
    case "suspended":
      return "Suspended";
    default:
      return status;
  }
}

export function partnerLegalDocumentStatusLabel(
  status: WealthPartnerLegalDocumentStatus,
): string {
  switch (status) {
    case "generated":
      return "Generated";
    case "sent":
      return "Awaiting Signature";
    case "signed":
      return "Signed";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

export const PARTNER_LEGAL_TIMELINE_EVENT_LABELS: Record<string, string> = {
  agreement_generated: "Agreement generated",
  agreement_sent: "Agreement sent",
  partner_signed: "Partner signed",
  company_countersigned: "Company counter-signed",
  agreement_activated: "Agreement activated",
  agreement_renewed: "Agreement renewed",
  agreement_expired: "Agreement expired",
  agreement_suspended: "Agreement suspended",
  document_viewed: "Document viewed",
  document_downloaded: "Document downloaded",
  docket_reactivated: "Docket reactivated",
};
