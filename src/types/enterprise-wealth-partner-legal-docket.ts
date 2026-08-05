/**
 * CO-WP-007 — Enterprise Wealth Partner Legal & Compliance Docket types.
 * Persisted inside EnterpriseWealthPartner.complianceJson (no new tables).
 */

export type WealthPartnerLegalDocumentKind =
  | "cover_sheet"
  | "welcome_letter"
  | "engagement_agreement"
  | "commercial_schedule"
  | "code_of_conduct"
  | "privacy_undertaking"
  | "acceptable_use_policy"
  | "branding_guidelines"
  | "compliance_declaration"
  | "kyc_summary"
  | "operational_contacts"
  | "digital_acceptance_certificate";

export type WealthPartnerAgreementStatus =
  | "not_started"
  | "generated"
  | "sent"
  | "partner_signed"
  | "countersigned"
  | "active"
  | "renewal_due"
  | "expired"
  | "suspended";

export type WealthPartnerLegalDocumentStatus =
  | "generated"
  | "sent"
  | "signed"
  | "archived";

export type WealthPartnerComplianceStatus =
  | "incomplete"
  | "pending_signature"
  | "compliant"
  | "renewal_due"
  | "expired"
  | "suspended";

export type WealthPartnerRenewalStatus =
  | "not_applicable"
  | "on_track"
  | "reminder_180"
  | "reminder_90"
  | "reminder_30"
  | "expired"
  | "renewed";

export type WealthPartnerLegalTimelineEventType =
  | "agreement_generated"
  | "agreement_sent"
  | "partner_signed"
  | "company_countersigned"
  | "agreement_activated"
  | "agreement_renewed"
  | "agreement_expired"
  | "agreement_suspended"
  | "document_viewed"
  | "document_downloaded"
  | "docket_reactivated";

export type WealthPartnerLegalAuditAction =
  | "generated"
  | "viewed"
  | "downloaded"
  | "sent"
  | "signed"
  | "countersigned"
  | "renewed"
  | "expired"
  | "reactivated"
  | "suspended";

export type WealthPartnerOpportunitySelectability =
  | "selectable"
  | "selectable_with_warning"
  | "not_selectable";

export interface WealthPartnerLegalOrgPolicy {
  /** Organisation Policy — default agreement validity in years (not hardcoded in UI). */
  agreementValidityYears: number;
  renewalReminderDays: readonly [number, number, number];
  authorisedSignatoryTitle: string;
  authorisedSignatoryName: string;
  operationsContact: string;
  financeContact: string;
  supportContact: string;
  relationshipManagerFallback: string;
}

export interface WealthPartnerLegalDocumentRecord {
  id: string;
  documentKind: WealthPartnerLegalDocumentKind;
  documentName: string;
  version: string;
  versionNumber: number;
  status: WealthPartnerLegalDocumentStatus;
  generatedAt: string;
  signedAt: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  /** Rendered HTML — Enterprise template + SSOT merge. */
  contentHtml: string;
  /**
   * Enterprise Document Registry record id (Contact/Company-linked).
   * View/Download use Registry — never duplicate binaries under WP.
   */
  documentRegistryRecordId: string | null;
  typeRef: string;
}

export interface WealthPartnerLegalTimelineEvent {
  id: string;
  event: WealthPartnerLegalTimelineEventType;
  at: string;
  actorUserId: string | null;
  detail: string | null;
}

export interface WealthPartnerLegalAuditEvent {
  id: string;
  action: WealthPartnerLegalAuditAction;
  at: string;
  actorUserId: string | null;
  detail: string | null;
  documentId?: string | null;
}

export interface WealthPartnerLegalReminder {
  id: string;
  daysBeforeExpiry: number;
  kind: "internal" | "partner" | "high_priority" | "expired";
  dueAt: string;
  firedAt: string | null;
  status: "scheduled" | "fired" | "cancelled";
  label: string;
}

export interface WealthPartnerAgreementState {
  status: WealthPartnerAgreementStatus;
  version: string;
  versionNumber: number;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  generatedAt: string | null;
  sentAt: string | null;
  partnerSignedAt: string | null;
  companyCountersignedAt: string | null;
  activatedAt: string | null;
  renewedAt: string | null;
  expiredAt: string | null;
  suspendedAt: string | null;
  activatedBy: string | null;
  partnerSignatoryName: string | null;
  companySignatoryName: string | null;
  commercialVersion: number | null;
}

export interface WealthPartnerLegalDocketState {
  schemaVersion: 1;
  agreement: WealthPartnerAgreementState;
  documents: WealthPartnerLegalDocumentRecord[];
  timeline: WealthPartnerLegalTimelineEvent[];
  audit: WealthPartnerLegalAuditEvent[];
  reminders: WealthPartnerLegalReminder[];
}

/** Full complianceJson shape (legacy + Legal Docket). */
export interface WealthPartnerComplianceJson {
  schemaVersion?: number;
  kycStatus?: string;
  agreementStatus?: string;
  notes?: string;
  legalDocket?: WealthPartnerLegalDocketState;
}

export interface WealthPartnerLegalMergeContext {
  partnerCode: string;
  partnerName: string;
  partnerTypeLabel: string;
  partnerType: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  statusLabel: string;
  lifecycleStatus: string;
  reportingManager: string;
  territory: string;
  referralSharePercent: string;
  soleExecutorSharePercent: string;
  jointExecutorSharePercent: string;
  commercialEffectiveFrom: string;
  commercialVersion: string;
  pan: string;
  gstin: string;
  bankSummary: string;
  companyName: string;
  companyBrand: string;
  companyAddress: string;
  companyGstin: string;
  companyPan: string;
  authorisedSignatory: string;
  authorisedSignatoryTitle: string;
  companyLogoInitials: string;
  approvalDate: string;
  activatedBy: string;
  documentVersion: string;
  generatedDate: string;
  generatedDateTime: string;
  effectiveFrom: string;
  effectiveUntil: string;
  validityYears: string;
  operationsContact: string;
  financeContact: string;
  supportContact: string;
  relationshipManager: string;
}

export interface WealthPartnerLegalComplianceProjection {
  agreementStatus: WealthPartnerAgreementStatus;
  agreementVersion: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  daysRemaining: number | null;
  complianceStatus: WealthPartnerComplianceStatus;
  renewalStatus: WealthPartnerRenewalStatus;
  selectability: WealthPartnerOpportunitySelectability;
  selectabilityMessage: string;
  documents: WealthPartnerLegalDocumentRecord[];
  signedDocuments: WealthPartnerLegalDocumentRecord[];
  versionHistory: Array<{
    documentKind: WealthPartnerLegalDocumentKind;
    documentName: string;
    versions: WealthPartnerLegalDocumentRecord[];
  }>;
  timeline: WealthPartnerLegalTimelineEvent[];
  reminders: WealthPartnerLegalReminder[];
  audit: WealthPartnerLegalAuditEvent[];
  docketReady: boolean;
  policy: WealthPartnerLegalOrgPolicy;
}

export type WealthPartnerLegalLifecycleAction =
  | "generate_docket"
  | "mark_sent"
  | "mark_partner_signed"
  | "mark_countersigned"
  | "activate"
  | "renew_reactivate"
  | "mark_expired"
  | "suspend"
  | "record_view"
  | "record_download"
  | "link_registry";
