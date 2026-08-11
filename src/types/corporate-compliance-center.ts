/**
 * CO-CCC-001 — Corporate Compliance Center DTOs.
 */
import type {
  CccApprovalStatus,
  CccConfidentiality,
  CccDispatchStatus,
  CccInstitutionType,
  CccLegalEntityStatus,
  CccNavSectionId,
  CccPackageInstanceStatus,
  CccPackageKind,
  CccRepositoryKey,
} from "@/constants/corporate-compliance-center";
import type { OrganizationDocumentDto } from "@/types/enterprise-organization-workspace";

export interface CccLegalEntityDto {
  id: string;
  organizationId: string;
  code: string;
  legalName: string;
  brandName: string | null;
  gst: string | null;
  pan: string | null;
  cin: string | null;
  tan: string | null;
  status: CccLegalEntityStatus;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CccLegalEntityCreateBody {
  code: string;
  legalName: string;
  brandName?: string;
  gst?: string;
  pan?: string;
  cin?: string;
  tan?: string;
  status?: CccLegalEntityStatus;
  isPrimary?: boolean;
  notes?: string;
}

export type CccLegalEntityPatchBody = Partial<CccLegalEntityCreateBody>;

export interface CccInstitutionProfileDto {
  id: string;
  organizationId: string;
  name: string;
  institutionType: CccInstitutionType;
  contactEmail: string | null;
  contactName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CccInstitutionProfileCreateBody {
  name: string;
  institutionType: CccInstitutionType;
  contactEmail?: string;
  contactName?: string;
  notes?: string;
}

export type CccInstitutionProfilePatchBody = Partial<CccInstitutionProfileCreateBody>;

export interface CccInstitutionRequirementDto {
  id: string;
  organizationId: string;
  institutionId: string;
  documentTypeId: string;
  documentTypeLabel: string;
  categoryId: string | null;
  repositoryKey: CccRepositoryKey | null;
  mandatory: boolean;
  financialYearsRequired: string[];
  renewalFrequencyMonths: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CccInstitutionRequirementCreateBody {
  documentTypeId: string;
  documentTypeLabel: string;
  categoryId?: string;
  repositoryKey?: CccRepositoryKey;
  mandatory?: boolean;
  financialYearsRequired?: string[];
  renewalFrequencyMonths?: number;
  notes?: string;
}

export type CccInstitutionRequirementPatchBody = Partial<CccInstitutionRequirementCreateBody>;

export interface CccPackageItemSpec {
  documentTypeId: string;
  repositoryKey?: CccRepositoryKey;
  required: boolean;
}

export interface CccDocumentPackageDefinitionDto {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string | null;
  packageKind: CccPackageKind;
  itemSpecs: CccPackageItemSpec[];
  createdAt: string;
  updatedAt: string;
}

export interface CccDocumentPackageDefinitionCreateBody {
  code: string;
  name: string;
  description?: string;
  packageKind: CccPackageKind;
  itemSpecs: CccPackageItemSpec[];
}

export type CccDocumentPackageDefinitionPatchBody = Partial<CccDocumentPackageDefinitionCreateBody>;

export interface CccDocumentPackageInstanceDto {
  id: string;
  organizationId: string;
  definitionId: string;
  legalEntityId: string | null;
  name: string;
  status: CccPackageInstanceStatus;
  resolvedDocumentIds: string[];
  versionNumber: number;
  builtAt: string | null;
  builtBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CccBuildPackageInstanceBody {
  legalEntityId?: string;
  name?: string;
}

export interface CccDispatchItemDto {
  id: string;
  organizationDocumentId: string;
  documentVersionNumber: number;
  documentTypeLabel: string;
  originalFilename: string;
}

export interface CccDispatchDto {
  id: string;
  organizationId: string;
  legalEntityId: string | null;
  institutionId: string | null;
  packageInstanceId: string | null;
  packageDefinitionId: string | null;
  recipientEmail: string;
  recipientName: string | null;
  subject: string | null;
  bodyPreview: string | null;
  status: CccDispatchStatus;
  sentAt: string | null;
  sentBy: string | null;
  deliveryStatus: string | null;
  acknowledgementNote: string | null;
  financialYear: string | null;
  items: CccDispatchItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CccDispatchCreateBody {
  legalEntityId?: string;
  institutionId?: string;
  packageInstanceId?: string;
  packageDefinitionId?: string;
  recipientEmail: string;
  recipientName?: string;
  subject?: string;
  bodyPreview?: string;
  financialYear?: string;
}

export interface CccComplianceDocumentDto extends OrganizationDocumentDto {
  legalEntityId: string | null;
  repositoryKey: CccRepositoryKey | null;
  financialYear: string | null;
  isCurrentFinancialVersion: boolean;
  effectiveDate: string | null;
  expiryDate: string | null;
  approvalStatus: CccApprovalStatus;
  confidentiality: CccConfidentiality;
  supersededByDocumentId: string | null;
  linkedPackageIds: string[];
}

export interface CccDocumentMetadataPatchBody {
  legalEntityId?: string | null;
  repositoryKey?: CccRepositoryKey | null;
  financialYear?: string | null;
  isCurrentFinancialVersion?: boolean;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  approvalStatus?: CccApprovalStatus;
  confidentiality?: CccConfidentiality;
  supersededByDocumentId?: string | null;
}

export interface CccDocumentListFilters {
  repositoryKey?: CccRepositoryKey;
  legalEntityId?: string;
  financialYear?: string;
  approvalStatus?: CccApprovalStatus;
}

export type CccComplianceAlertSeverity = "critical" | "warning" | "info";

export interface CccComplianceAlertDto {
  id: string;
  severity: CccComplianceAlertSeverity;
  category:
    | "expiring"
    | "expired"
    | "missing_fy"
    | "pending_approval"
    | "pending_dispatch";
  title: string;
  description: string;
  entityType?: string;
  entityId?: string;
  documentId?: string;
  dueDate?: string;
}

export interface CccComplianceIntelligenceDto {
  alerts: CccComplianceAlertDto[];
  summary: {
    expiringCount: number;
    expiredCount: number;
    missingFyCount: number;
    pendingApprovalCount: number;
    pendingDispatchCount: number;
  };
  generatedAt: string;
}

export interface CccWorkspaceSectionContext {
  sectionId: CccNavSectionId;
  repositoryKey?: CccRepositoryKey;
}
