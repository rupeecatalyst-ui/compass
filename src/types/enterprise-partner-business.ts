/**
 * CO-WP-DEVELOPMENT-WAVE-001 / CO-WP-JOURNEY-002 — Partner Business DTO contracts.
 *
 * dtoSource === "placeholder_partner_business" until Partner Opportunity APIs
 * project from Enterprise Opportunity Registry.
 *
 * CO-WP-JOURNEY-002 — Opportunity Workspace is a presentation projection of this detail DTO.
 */

export type PartnerBusinessDtoSource =
  | "placeholder_partner_business"
  | "enterprise_opportunity_registry"
  | "enterprise_customer_registry"
  | "enterprise_deal_registry";

export type PartnerOpportunitySummaryDto = {
  opportunityId: string;
  reference: string;
  customerDisplayName: string;
  productLabel: string;
  requiredAmountLabel: string;
  stageLabel: string;
  lifecycleStatus: string;
  updatedAt: string;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerOpportunityDocumentDto = {
  documentId: string;
  title: string;
  statusLabel: string;
  categoryLabel: string;
  /** EDIE typeRef when uploaded against Enterprise LOD. */
  typeRef?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  /** Small data-URL preview for images (never a second document store). */
  previewDataUrl?: string | null;
  /** Partner-facing uploader label — presentation only. */
  uploadedByLabel?: string | null;
  /** Relative path inside a folder upload when supplied. */
  relativePath?: string | null;
  /** Folder / package name when uploaded as a complete folder. */
  folderName?: string | null;
  uploadSource?: string | null;
  /** Employee/partner caption — e.g. Catalyst Connect. */
  sourceLabel?: string | null;
  participantId?: string | null;
  documentScope?: string | null;
  updatedAt: string;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerOpportunityActivityDto = {
  activityId: string;
  title: string;
  kindLabel: string;
  occurredAt: string;
  body: string;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerOpportunityLoanFileViewDto = {
  available: boolean;
  fileId: string | null;
  fileReference: string | null;
  stageLabel: string | null;
  lenderLabel: string | null;
  amountLabel: string | null;
  statusLabel: string;
  message: string;
  dtoSource: PartnerBusinessDtoSource;
  dtoNotice: string;
};

export type PartnerOpportunityTimelineEventDto = {
  eventId: string;
  title: string;
  occurredAt: string;
  body: string;
  dtoSource: PartnerBusinessDtoSource;
};

/** CO-WP-JOURNEY-002 — Workspace projection types (Catalyst One owns; WP renders). */
export type PartnerNextBestActionDto = {
  title: string;
  reason: string;
  ctaLabel: string;
  ctaDeepLink: string;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerParticipantDto = {
  participantId: string;
  roleLabel: string;
  displayName: string;
  statusLabel: string;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerLenderSelectionSource = "saarthi" | "manual";

export type PartnerLenderProjectionDto = {
  lenderId: string;
  lenderLabel: string;
  statusLabel: string;
  offerLabel: string | null;
  dtoSource: PartnerBusinessDtoSource;
  dtoNotice: string;
  /** Enterprise Deal id when this row is a real pipeline Deal. */
  dealId?: string | null;
  /** How the partner selected this lender — never implied as Saarthi for manual picks. */
  selectionSource?: PartnerLenderSelectionSource | null;
  selectedAt?: string | null;
  partnerReason?: string | null;
};

export type PartnerSelectedLenderDto = {
  lenderId: string;
  displayName: string;
  dealId: string;
  dealNumber: string;
  stageLabel: string;
  selectionSource: PartnerLenderSelectionSource | null;
  selectedAt: string | null;
  reason: string | null;
  alreadySelected?: boolean;
  dtoSource: "enterprise_deal_registry";
};

export type PartnerNoteEntryDto = {
  noteId: string;
  body: string;
  authorLabel: string;
  occurredAt: string;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerHistoryEntryDto = {
  historyId: string;
  title: string;
  body: string;
  actorLabel: string;
  occurredAt: string;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerUpcomingTaskDto = {
  taskId: string;
  title: string;
  dueLabel: string;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerDocumentStatusSummaryDto = {
  required: number;
  uploaded: number;
  pending: number;
  rejected: number;
  approved: number;
};

export type PartnerAssignedExecutiveDto = {
  label: string;
  roleLabel: string;
};

export type PartnerOpportunitySourceAttributionDto = {
  sourcePartnerId: string;
  sourcePartnerName: string;
  sourcePartnerCode: string | null;
  sourceType: string;
  organizationId: string;
  branchLabel: string | null;
  territoryLabel: string | null;
  /** Never shown in Catalyst Connect UI — stamped into Catalyst One only. */
  hiddenFromPartnerUi: true;
};

export type PartnerOpportunityDetailDto = PartnerOpportunitySummaryDto & {
  customerId: string;
  ownerLabel: string;
  createdAt: string;
  summary: string;
  dtoNotice: string;
  notes?: string;
  /** Enterprise Primary Borrower kind — individual | company */
  primaryBorrowerKind?: "individual" | "company" | null;
  /** Enterprise Product Master code */
  productCode?: string | null;
  borrowerFields?: Record<string, string>;
  productFields?: Record<string, string>;
  completionPercent?: number;
  missingItems?: string[];
  documents: PartnerOpportunityDocumentDto[];
  activities: PartnerOpportunityActivityDto[];
  timeline: PartnerOpportunityTimelineEventDto[];
  loanFile: PartnerOpportunityLoanFileViewDto;

  /** Catalyst Connect constitution — auto Source Attribution (never partner-editable). */
  sourceAttribution?: PartnerOpportunitySourceAttributionDto;

  /** CO-WP-JOURNEY-002 workspace projection */
  subStageLabel?: string;
  borrowerTypeLabel?: string;
  opportunityHealthLabel?: string;
  assignedExecutive?: PartnerAssignedExecutiveDto;
  nextBestAction?: PartnerNextBestActionDto | null;
  participants?: PartnerParticipantDto[];
  lenders?: PartnerLenderProjectionDto[];
  noteEntries?: PartnerNoteEntryDto[];
  historyEntries?: PartnerHistoryEntryDto[];
  upcomingTasks?: PartnerUpcomingTaskDto[];
  documentStatusSummary?: PartnerDocumentStatusSummaryDto;
  /** CO-WP-LOD-001 — EDIE LOD projection (preferred over free-text documents list). */
  lod?: import("@/types/enterprise-partner-lod").PartnerOpportunityLodDto;
  /** CO-WP-TIMELINE-001 — Partner-facing business milestones (hides internal stages). */
  businessTimeline?: import("@/types/enterprise-partner-business-timeline").PartnerBusinessTimelineDto;
  communicationReservedMessage?: string;
  /** CO-WP-ACCESS-001 — Effective entitlements for this Opportunity (Partner App presentation). */
  entitlements?: {
    executionMode: string;
    source: string;
    permissions: Record<string, boolean>;
    modules: Record<string, boolean>;
  };
};

export type PartnerResumeDraftDto = {
  opportunityId: string;
  customerDisplayName: string;
  productLabel: string;
  updatedAt: string;
  completionPercent: number;
  continueDeepLink: string;
};

export type PartnerCustomerSearchHitDto = {
  customerId: string;
  displayName: string;
  mobile: string;
  city: string | null;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerBusinessHubDto = {
  partnerId: string;
  title: string;
  subtitle: string;
  opportunityCount: number;
  opportunities: PartnerOpportunitySummaryDto[];
  resumeDraft: PartnerResumeDraftDto | null;
  emptyState: {
    title: string;
    message: string;
    ctaLabel: string;
    ctaDeepLink: string;
  };
  dtoSource: PartnerBusinessDtoSource;
  dtoNotice: string;
};

export type PartnerOpportunityCreateInput = {
  customerId?: string;
  customerDisplayName?: string;
  customerMobile?: string;
  customerCity?: string;
  /** Mandatory after Customer — Enterprise Primary Borrower */
  primaryBorrowerKind?: "individual" | "company";
  productCode?: string;
  productLabel?: string;
  requiredAmountLabel?: string;
  notes?: string;
  borrowerFields?: Record<string, string>;
  productFields?: Record<string, string>;
  /** draft = Save Draft · submit = Submit opportunity · exit = Save & Exit */
  intent?: "draft" | "submit" | "exit";
};

export type PartnerOpportunityPatchInput = {
  requiredAmountLabel?: string;
  notes?: string;
  primaryBorrowerKind?: "individual" | "company";
  productCode?: string;
  productFields?: Record<string, string>;
  borrowerFields?: Record<string, string>;
  productLabel?: string;
};

export type PartnerOpportunityDocumentUploadInput = {
  /**
   * Enterprise LOD typeRef when uploading against a pending requirement.
   * CO-WP-DOC-002 — omit (or use doc:other:*) for inbox / additional freeform intake.
   */
  typeRef?: string;
  /**
   * CO-WP-DOC-002 — inbox | additional | requirement.
   * Default: requirement when typeRef is a checklist type; otherwise inbox.
   */
  intakeMode?: "inbox" | "additional" | "requirement" | "folder";
  title?: string;
  /** When set, replaces an existing upload for the same typeRef. */
  replaceDocumentId?: string;
  /** When true, keep existing files for this typeRef (multi-file pages). */
  append?: boolean;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  /** Optional image/PDF receipt payload (base64 data URL or raw base64). */
  contentBase64?: string;
  /** CO-WP-DOC-003 — relative path inside the selected folder (not flattened). */
  relativePath?: string;
  /** Folder / package name from device directory selection. */
  folderName?: string;
  /** Client-generated folder session id — groups files into Document Package. */
  packageId?: string;
  /** Optional Deal (Enterprise Deal id) when the partner selected a Deal. */
  dealId?: string;
  /** Optional participant attribution (Primary / Co-applicant / Guarantor). */
  participantId?: string;
  documentScope?: "applicant" | "shared" | "lender";
  /** Last file in a folder batch — used for a single EAR summary event. */
  packageComplete?: boolean;
  packageFileCount?: number;
};

/** CO-WP-BUSINESS-001 — My Business Pipeline Workspace */

export type PartnerBusinessPipelineBucketId =
  | "new_opportunities"
  | "documents_pending"
  | "credit_review"
  | "sent_to_lender"
  | "sanction_received"
  | "ready_for_disbursement"
  | "disbursed"
  | "follow_up_required"
  | string;

export type PartnerBusinessPipelineBucketDto = {
  id: PartnerBusinessPipelineBucketId;
  label: string;
  tone: string;
  emoji: string;
  count: number;
  valueLabel: string;
  trendDirection: "up" | "down" | "flat";
  trendLabel: string;
  filterKey: string;
  sortOrder: number;
};

export type PartnerBusinessPipelineFilterDto = {
  id: string;
  label: string;
  kind: string;
  sortOrder: number;
};

export type PartnerBusinessPipelinePriorityDto = {
  id: string;
  kind: string;
  kindLabel: string;
  title: string;
  subtitle: string;
  opportunityId: string;
  deepLink: string;
  dueLabel: string | null;
  priorityRank: number;
};

export type PartnerBusinessPipelineOpportunityRowDto = {
  opportunityId: string;
  reference: string;
  customerDisplayName: string;
  productLabel: string;
  requiredAmountLabel: string;
  stageLabel: string;
  subStageLabel: string;
  healthLabel: string;
  nextBestActionLabel: string;
  nextBestActionDeepLink: string;
  workspaceDeepLink: string;
  lifecycleStatus: string;
  pipelineBucketId: PartnerBusinessPipelineBucketId;
  productFilterKeys: string[];
  mobile: string | null;
  companyName: string | null;
  priorityRank: number;
  isOverdue: boolean;
  updatedAt: string;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerBusinessPipelineRecommendationDto = {
  id: string;
  title: string;
  reason: string;
  ctaLabel: string;
  deepLink: string;
  opportunityId: string | null;
  sortOrder: number;
  dtoSource: PartnerBusinessDtoSource;
};

export type PartnerBusinessPipelineEmptyStateDto = {
  id: string;
  title: string;
  message: string;
  ctaLabel: string | null;
  ctaDeepLink: string | null;
};

export type PartnerBusinessPipelineQuickActionDto = {
  id: string;
  label: string;
  deepLink: string;
  sortOrder: number;
};

export type PartnerBusinessPipelineSearchMetaDto = {
  placeholder: string;
  scopes: Array<"customer" | "opportunity_number" | "mobile" | "product" | "company">;
};

export type PartnerBusinessPipelineDto = {
  partnerId: string;
  generatedAt: string;
  header: {
    title: string;
    subtitle: string;
    greeting: string;
    todaysDateLabel: string;
    todaysPriorityCount: number;
  };
  search: PartnerBusinessPipelineSearchMetaDto;
  filters: PartnerBusinessPipelineFilterDto[];
  quickActions: PartnerBusinessPipelineQuickActionDto[];
  pipelineCards: PartnerBusinessPipelineBucketDto[];
  todaysPriorities: PartnerBusinessPipelinePriorityDto[];
  opportunities: PartnerBusinessPipelineOpportunityRowDto[];
  recommendations: PartnerBusinessPipelineRecommendationDto[];
  emptyStates: {
    opportunities: PartnerBusinessPipelineEmptyStateDto;
    followUps: PartnerBusinessPipelineEmptyStateDto;
    documents: PartnerBusinessPipelineEmptyStateDto;
    tasks: PartnerBusinessPipelineEmptyStateDto;
    priorities: PartnerBusinessPipelineEmptyStateDto;
    recommendations: PartnerBusinessPipelineEmptyStateDto;
    search: PartnerBusinessPipelineEmptyStateDto;
  };
  resumeDraft: PartnerResumeDraftDto | null;
  dtoSource: PartnerBusinessDtoSource;
  dtoNotice: string;
};
