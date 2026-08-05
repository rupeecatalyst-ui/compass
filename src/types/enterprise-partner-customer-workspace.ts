/**
 * CO-WP-CUSTOMER-001 — Partner Customer Workspace DTO contracts.
 *
 * Projection of Enterprise Customer Registry (ECM Contact) + related enterprise
 * surfaces. Wealth Partner App renders these DTOs only — never a local customer DB.
 */

import type { PartnerBusinessDtoSource } from "./enterprise-partner-business";

export type PartnerCustomerSummaryDto = {
  customerId: string;
  displayName: string;
  mobile: string;
  city: string | null;
  customerTypeLabel: string;
  activeOpportunityCount: number;
  relationshipHealthLabel: string;
  lastInteractionAt: string;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerCustomerOpportunityRowDto = {
  opportunityId: string;
  reference: string;
  productLabel: string;
  requiredAmountLabel: string;
  /** Partner-friendly progress label when available */
  stageLabel: string;
  lifecycleStatus: string;
  updatedAt: string;
  workspaceDeepLink: string;
  /** active | previous */
  bucket: "active" | "previous";
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerCustomerProfileDto = {
  displayName: string;
  customerTypeLabel: string;
  relationshipSinceLabel: string;
  relationshipHealthLabel: string;
  relationshipHealthPercent: number;
  assignedWealthPartnerLabel: string;
  productsAvailed: string[];
  summary: string;
  registrySourceLabel: string;
};

export type PartnerCustomerContactInfoDto = {
  mobilePrimary: string;
  mobileSecondary: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  /** Never expose PAN / Aadhaar / KYC to Connect */
  contactCompletenessLabel: string;
};

export type PartnerCustomerDocumentDto = {
  documentId: string;
  title: string;
  statusLabel: string;
  categoryLabel: string;
  opportunityReference: string | null;
  updatedAt: string;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerCustomerNoteDto = {
  noteId: string;
  body: string;
  authorLabel: string;
  occurredAt: string;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerCustomerTaskDto = {
  taskId: string;
  title: string;
  statusLabel: string;
  dueLabel: string;
  workTypeLabel: string;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerCustomerFollowUpDto = {
  followUpId: string;
  title: string;
  body: string;
  dueLabel: string;
  statusLabel: string;
  occurredAt: string;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerCustomerCommunicationDto = {
  communicationId: string;
  channelLabel: string;
  title: string;
  body: string;
  directionLabel: string;
  occurredAt: string;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerCustomerNextBestActionDto = {
  title: string;
  reason: string;
  ctaLabel: string;
  ctaDeepLink: string;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerCustomerWorkspaceDto = {
  customerId: string;
  displayName: string;
  mobile: string;
  customerTypeLabel: string;
  city: string | null;
  relationshipSinceLabel: string;
  activeOpportunityCount: number;
  previousOpportunityCount: number;
  relationshipHealthLabel: string;
  relationshipHealthPercent: number;
  lastInteractionAt: string;
  lastInteractionLabel: string;
  summary: string;
  productsAvailed: string[];
  assignedWealthPartnerLabel: string;
  upcomingFollowUpLabel: string;
  nextBestAction: PartnerCustomerNextBestActionDto | null;

  /** Structured sections — CO-WP-CUSTOMER-001 */
  profile: PartnerCustomerProfileDto;
  contactInformation: PartnerCustomerContactInfoDto;
  activeOpportunities: PartnerCustomerOpportunityRowDto[];
  previousOpportunities: PartnerCustomerOpportunityRowDto[];
  uploadedDocuments: PartnerCustomerDocumentDto[];
  notes: PartnerCustomerNoteDto[];
  tasks: PartnerCustomerTaskDto[];
  followUpTimeline: PartnerCustomerFollowUpDto[];
  communicationHistory: PartnerCustomerCommunicationDto[];

  /** @deprecated Prefer activeOpportunities + previousOpportunities */
  opportunities: PartnerCustomerOpportunityRowDto[];
  /** @deprecated Prefer uploadedDocuments */
  documents: PartnerCustomerDocumentDto[];
  communicationReservedMessage: string;

  /** true when profile fields came from ECM Contact Registry */
  fromEnterpriseCustomerRegistry: boolean;
  dtoSource: PartnerBusinessDtoSource;
  dtoNotice: string;
};

export type PartnerCustomerDirectoryDto = {
  partnerId: string;
  title: string;
  subtitle: string;
  customers: PartnerCustomerSummaryDto[];
  emptyState: {
    title: string;
    message: string;
    ctaLabel: string;
    ctaDeepLink: string;
  };
  dtoSource: PartnerBusinessDtoSource;
  dtoNotice: string;
};
