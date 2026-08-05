/**
 * CO-WP-LOD-001 — Partner List of Documents (LOD) projection.
 *
 * Catalyst One EDIE / Document Requests own required documents.
 * Catalyst Connect renders this DTO only — never invents checklists.
 */

export type PartnerLodItemStatus =
  | "missing"
  | "uploaded"
  | "pending_verification"
  | "rejected"
  | "re_upload_required";

export type PartnerLodItemDto = {
  typeRef: string;
  label: string;
  moduleId: string;
  moduleLabel: string;
  /** Critical vs journey — presentation only. */
  category: "critical" | "journey";
  mandatory: boolean;
  critical: boolean;
  status: PartnerLodItemStatus;
  missing: boolean;
  canUpload: boolean;
  canReplace: boolean;
  canPreview: boolean;
  /** Delete allowed only while Opportunity is still a draft (before enterprise submit). */
  canDelete: boolean;
  documentId: string | null;
  previewLabel: string | null;
  uploadedAt: string | null;
  uploadedByLabel: string | null;
  sortOrder: number;
  previewDataUrl?: string | null;
};

export type PartnerLodGuidanceDto = {
  id: string;
  message: string;
};

export type PartnerLodPresentationDto = {
  stepTitle: string;
  stepDescription: string;
  emptyHeadline: string;
  emptyMessage: string;
  missingLabel: string;
  uploadCtaLabel: string;
  replaceCtaLabel: string;
  previewCtaLabel: string;
};

export type PartnerOpportunityLodDto = {
  version: string;
  dtoSource: "enterprise_edie_lod";
  dtoNotice: string;
  opportunityId: string;
  ready: boolean;
  generatedAt: string;
  presentation: PartnerLodPresentationDto;
  guidance: PartnerLodGuidanceDto[];
  items: PartnerLodItemDto[];
  summary: {
    required: number;
    uploaded: number;
    missing: number;
    rejected: number;
    pending: number;
  };
  /** Soft context used to generate LOD (never partner-editable masters). */
  context: {
    productLabel: string;
    borrowerType: string;
    recommendationTitle: string | null;
  };
};
