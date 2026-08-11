/**
 * CO-ORG-001 — Enterprise Organization Workspace DTOs (API contract).
 */

import type { OrgDocCategoryId, OrgDocStatus } from "@/types/organization-documents";

export interface OrganizationWorkspaceActor {
  userId: string;
  displayName?: string;
}

export interface OrganizationProfileDto {
  id: string;
  organizationId: string;
  companyName: string;
  legalEntityName: string | null;
  brandName: string;
  logoInitials: string | null;
  logoDocumentId: string | null;
  gst: string;
  pan: string;
  cin: string;
  msme: string;
  incorporationDate: string | null;
  incorporationDetails: string | null;
  registeredAddress: string | null;
  corporateAddress: string | null;
  website: string;
  phoneNumbers: string[];
  officialEmails: string[];
  emailDomains: string[];
  socialLinks: Record<string, string>;
  versionNumber: number;
  createdBy: string;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type OrganizationProfilePatch = Partial<
  Omit<
    OrganizationProfileDto,
    "id" | "organizationId" | "versionNumber" | "createdBy" | "modifiedBy" | "createdAt" | "updatedAt"
  >
>;

export interface OrganizationSettingsDto {
  id: string;
  organizationId: string;
  workingDays: string[];
  workingHours: { start: string; end: string; timeZone: string };
  holidayCalendar: unknown[];
  financialYearStartMonth: number;
  timeZone: string;
  currency: string;
  numberFormat: string;
  dateFormat: string;
  versionNumber: number;
  createdAt: string;
  updatedAt: string;
}

export type OrganizationSettingsPatch = Partial<
  Omit<OrganizationSettingsDto, "id" | "organizationId" | "versionNumber" | "createdAt" | "updatedAt">
>;

export interface OrganizationBusinessConfigDto {
  id: string;
  organizationId: string;
  businessType: string | null;
  productsOffered: unknown[];
  operatingStates: unknown[];
  branches: unknown[];
  departments: unknown[];
  teams: unknown[];
  designations: unknown[];
  rolesConfig: unknown[];
  hierarchy: unknown[];
  versionNumber: number;
  createdAt: string;
  updatedAt: string;
}

export type OrganizationBusinessConfigPatch = Partial<
  Omit<
    OrganizationBusinessConfigDto,
    "id" | "organizationId" | "versionNumber" | "createdAt" | "updatedAt"
  >
>;

export interface OrganizationSecurityConfigDto {
  id: string;
  organizationId: string;
  permissions: unknown[];
  featureFlags: Record<string, unknown>;
  defaults: Record<string, unknown>;
  branding: Record<string, unknown>;
  versionNumber: number;
  createdAt: string;
  updatedAt: string;
}

export type OrganizationSecurityConfigPatch = Partial<
  Omit<
    OrganizationSecurityConfigDto,
    "id" | "organizationId" | "versionNumber" | "createdAt" | "updatedAt"
  >
>;

export interface OrganizationDirectorDto {
  id: string;
  organizationId: string;
  name: string;
  designation: string;
  din: string;
  pan: string;
  email: string;
  mobile: string;
  status: string;
  photographInitials: string;
  address: string | null;
  documents: unknown[];
  sortOrder: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrganizationDirectorCreateBody = Omit<
  OrganizationDirectorDto,
  "id" | "organizationId" | "isDeleted" | "createdAt" | "updatedAt"
>;

export type OrganizationDirectorPatch = Partial<OrganizationDirectorCreateBody>;

export interface OrganizationBankAccountDto {
  id: string;
  organizationId: string;
  bank: string;
  branch: string;
  accountNumber: string;
  ifsc: string;
  isCurrentAccount: boolean;
  cancelledChequeAvailable: boolean;
  isPrimary: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrganizationBankAccountCreateBody = Omit<
  OrganizationBankAccountDto,
  "id" | "organizationId" | "isDeleted" | "createdAt" | "updatedAt"
>;

export type OrganizationBankAccountPatch = Partial<OrganizationBankAccountCreateBody>;

export interface OrganizationDigitalSignatureDto {
  id: string;
  organizationId: string;
  person: string;
  designation: string;
  status: string;
  expiry: string;
  initials: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrganizationDigitalSignatureCreateBody = Omit<
  OrganizationDigitalSignatureDto,
  "id" | "organizationId" | "isDeleted" | "createdAt" | "updatedAt"
>;

export type OrganizationDigitalSignaturePatch = Partial<OrganizationDigitalSignatureCreateBody>;

export interface OrganizationSealDto {
  id: string;
  organizationId: string;
  lastUpdated: string | null;
  version: string | null;
  initials: string | null;
  documentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrganizationSealPatch = Partial<
  Omit<OrganizationSealDto, "id" | "organizationId" | "createdAt" | "updatedAt">
>;

export interface OrganizationDocumentVersionDto {
  id: string;
  version: number;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface OrganizationDocumentDto {
  id: string;
  organizationId: string;
  clientRecordId: string | null;
  originalFilename: string;
  displayName: string;
  categoryId: OrgDocCategoryId;
  documentTypeId: string;
  documentTypeLabel: string;
  mimeType: string;
  fileSizeBytes: number;
  status: OrgDocStatus;
  versionNumber: number;
  tags: string[];
  versions: OrganizationDocumentVersionDto[];
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
  hasContent: boolean;
  /** CO-CCC-001 — compliance metadata */
  legalEntityId?: string | null;
  repositoryKey?: string | null;
  financialYear?: string | null;
  isCurrentFinancialVersion?: boolean;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  approvalStatus?: string;
  confidentiality?: string;
  supersededByDocumentId?: string | null;
  linkedPackageIds?: string[];
}

export interface OrganizationDocumentUploadBody {
  files: Array<{
    originalFilename: string;
    contentBase64: string;
    mimeType: string;
    fileSizeBytes: number;
  }>;
  categoryId: OrgDocCategoryId;
  documentTypeId: string;
  documentTypeLabel: string;
  tags?: string[];
  clientRecordId?: string;
}

export interface OrganizationDocumentPatchBody {
  status?: OrgDocStatus;
  categoryId?: OrgDocCategoryId;
  documentTypeId?: string;
  documentTypeLabel?: string;
  tags?: string[];
  contentBase64?: string;
  originalFilename?: string;
  mimeType?: string;
  fileSizeBytes?: number;
}

export interface OrganizationDocumentTemplateTypeDto {
  id: string;
  organizationId: string;
  typeCode: string;
  label: string;
  sortOrder: number;
  isDeleted: boolean;
  categoryId: "templates";
  system: false;
}

export interface OrganizationActivityEventDto {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  actorUserId: string | null;
  actorName: string | null;
  occurredAt: string;
}

export interface OrganizationAuditEntryDto {
  id: string;
  organizationId: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue: unknown;
  newValue: unknown;
  actorUserId: string;
  actorName: string | null;
  justification: string | null;
  occurredAt: string;
}
