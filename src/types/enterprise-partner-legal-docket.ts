/**
 * CO-WP-REFINEMENT-006 — Partner Gateway Legal Docket projection DTO.
 * Projects CO-WP-007 complianceJson.legalDocket for authenticated Wealth Partner only.
 */

import type {
  WealthPartnerAgreementStatus,
  WealthPartnerComplianceStatus,
  WealthPartnerLegalDocumentKind,
  WealthPartnerLegalDocumentStatus,
} from "./enterprise-wealth-partner-legal-docket";

export type PartnerLegalSigningCapabilityMode =
  | "not_configured"
  | "admin_lifecycle_only"
  | "external_esign";

export type PartnerLegalSigningCapabilityDto = {
  mode: PartnerLegalSigningCapabilityMode;
  partnerSelfSignAllowed: boolean;
  externalProvider: string | null;
  notice: string;
};

export type PartnerLegalAgreementSummaryDto = {
  agreementStatus: WealthPartnerAgreementStatus;
  agreementStatusLabel: string;
  complianceStatus: WealthPartnerComplianceStatus;
  complianceStatusLabel: string;
  agreementVersion: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  daysRemaining: number | null;
  generatedAt: string | null;
  sentAt: string | null;
  partnerSignedAt: string | null;
  companyCountersignedAt: string | null;
  activatedAt: string | null;
  docketReady: boolean;
};

export type PartnerLegalDocumentDto = {
  id: string;
  documentKind: WealthPartnerLegalDocumentKind;
  documentName: string;
  version: string;
  status: WealthPartnerLegalDocumentStatus;
  statusLabel: string;
  generatedAt: string;
  signedAt: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  /** Primary agreement when kind === engagement_agreement */
  isPrimaryAgreement: boolean;
  contentHtml: string | null;
  documentRegistryRecordId: string | null;
};

export type PartnerLegalTimelineItemDto = {
  id: string;
  event: string;
  eventLabel: string;
  at: string;
  detail: string | null;
};

export type PartnerLegalDocketDeskDto = {
  version: string;
  dtoSource: "enterprise_partner_legal_docket";
  dtoNotice: string;
  partnerId: string;
  partnerCode: string | null;
  partnerDisplayName: string;
  agreement: PartnerLegalAgreementSummaryDto;
  primaryAgreementDocumentId: string | null;
  documents: PartnerLegalDocumentDto[];
  timeline: PartnerLegalTimelineItemDto[];
  signing: PartnerLegalSigningCapabilityDto;
};

export type PartnerLegalDocketPartnerAction = "record_view" | "record_download";
