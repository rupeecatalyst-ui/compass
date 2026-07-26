/**
 * CO-ARCH-002-W2 — Enterprise Deal domain types (API / service contracts).
 */
import type {
  DealCounterpartyType,
  DealDocumentLinkStatus,
  DealLifecycleStatus,
  DealOperationalStatus,
  DealPriority,
  DealProductFamily,
} from "@prisma/client";

export type DealSearchScope = "my" | "team" | "all";

export type EnterpriseDealSearchQuery = {
  q?: string;
  legacyLoanFileId?: string;
  productFamily?: DealProductFamily;
  productId?: string;
  grossStage?: string;
  subStage?: string;
  lifecycleStatus?: DealLifecycleStatus;
  operationalStatus?: DealOperationalStatus;
  priority?: DealPriority;
  assignedRmUserId?: string;
  primaryContactId?: string;
  counterpartyType?: DealCounterpartyType;
  counterpartyId?: string;
  dateCreatedFrom?: string;
  dateCreatedTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  archived?: boolean;
  scope?: DealSearchScope;
  scopeUserId?: string;
  page?: number;
  pageSize?: number;
  sort?: "updatedAt_desc" | "updatedAt_asc" | "createdAt_desc" | "dealNumber_asc";
  includeDeleted?: boolean;
};

export type DealIncludeOption =
  | "counterparties"
  | "documents"
  | "tasks"
  | "activities"
  | "timeline"
  | "snapshots";

export type UpdateEnterpriseDealInput = {
  rowVersion: number;
  actorUserId: string;
  fileNumber?: string | null;
  productId?: string | null;
  productCode?: string | null;
  productLabel?: string | null;
  transactionType?: string | null;
  lifecyclePhase?: string | null;
  subStage?: string | null;
  operationalStatus?: DealOperationalStatus;
  primaryContactId?: string | null;
  primaryContactName?: string | null;
  primaryContactMobile?: string | null;
  primaryContactEmail?: string | null;
  companyId?: string | null;
  relationshipManagerUserId?: string | null;
  relationshipManagerName?: string | null;
  primaryOwnerUserId?: string | null;
  priority?: DealPriority;
  isUrgent?: boolean;
  isDelayed?: boolean;
  requestedAmount?: number | null;
  approvedAmount?: number | null;
  fulfilledAmount?: number | null;
  currencyCode?: string;
  snapshot?: Record<string, unknown> | null;
  lendingExtension?: Record<string, unknown> | null;
  commercialTerms?: Record<string, unknown> | null;
  /** CO-ARCH-003 Phase 2B S1 — Commission / invoice payee (Deal attribute) */
  invoicePartyType?: string | null;
  invoicePartySpecify?: string | null;
  invoicePartyContactId?: string | null;
  /** Canonical — Invoice Party Master */
  invoicePartyId?: string | null;
  /** CO-ARCH-003 Phase 2B Sprint 2 — controlled lender / program edit */
  lenderId?: string | null;
  lenderProgramId?: string | null;
  reason?: string | null;
};

export type TransitionDealInput = {
  rowVersion: number;
  actorUserId: string;
  toGrossStage: string;
  toSubStage?: string | null;
  toLifecycleStatus?: DealLifecycleStatus;
  toOperationalStatus?: DealOperationalStatus;
  reason?: string | null;
  /** Allow skipping intermediate lender pipeline stages (default false). */
  allowSkip?: boolean;
};

export type CreateCounterpartyInput = {
  counterpartyType: DealCounterpartyType;
  counterpartyRegistryId: string;
  programId?: string | null;
  isPrimary?: boolean;
  pipelineStage?: string | null;
  pipelineSubStage?: string | null;
  applicationRef?: string | null;
  extension?: Record<string, unknown> | null;
  actorUserId: string;
};

export type UpdateCounterpartyInput = {
  programId?: string | null;
  isPrimary?: boolean;
  pipelineStage?: string | null;
  pipelineSubStage?: string | null;
  applicationRef?: string | null;
  decision?: string | null;
  decisionAt?: string | null;
  extension?: Record<string, unknown> | null;
  actorUserId: string;
};

export type PipelineUpdateInput = {
  pipelineStage: string;
  pipelineSubStage?: string | null;
  applicationRef?: string | null;
  decision?: string | null;
  decisionAt?: string | null;
  actorUserId: string;
};

export type CreateDocumentLinkInput = {
  documentDefinitionId?: string | null;
  documentTypeId?: string | null;
  participantId?: string | null;
  status?: DealDocumentLinkStatus;
  storageKey?: string | null;
  extension?: Record<string, unknown> | null;
  actorUserId: string;
};

export type UpdateDocumentLinkInput = {
  status?: DealDocumentLinkStatus;
  storageKey?: string | null;
  uploadedAt?: string | null;
  verifiedAt?: string | null;
  extension?: Record<string, unknown> | null;
  actorUserId: string;
};

export type CreateTaskInput = {
  title: string;
  status?: string;
  priority?: string | null;
  dueAt?: string | null;
  assigneeUserId?: string | null;
  slaPolicyId?: string | null;
  payload?: Record<string, unknown> | null;
  actorUserId: string;
};

export type UpdateTaskInput = {
  title?: string;
  status?: string;
  priority?: string | null;
  dueAt?: string | null;
  assigneeUserId?: string | null;
  slaPolicyId?: string | null;
  completedAt?: string | null;
  payload?: Record<string, unknown> | null;
  actorUserId: string;
};

export type CreateActivityInput = {
  title: string;
  status?: string;
  activityType?: string | null;
  dueAt?: string | null;
  assigneeUserId?: string | null;
  payload?: Record<string, unknown> | null;
  actorUserId: string;
};

export type UpdateActivityInput = {
  title?: string;
  status?: string;
  activityType?: string | null;
  dueAt?: string | null;
  assigneeUserId?: string | null;
  completedAt?: string | null;
  payload?: Record<string, unknown> | null;
  actorUserId: string;
};

export const DEAL_PRODUCT_FAMILIES = [
  "lending",
  "mutual_fund",
  "insurance",
  "bonds",
  "pms",
  "other",
] as const;

export const DEAL_LIFECYCLE_STATUSES = [
  "active",
  "on_hold",
  "won",
  "lost",
  "cancelled",
  "archived",
] as const;

export const DEAL_OPERATIONAL_STATUSES = [
  "on_track",
  "at_risk",
  "delayed",
  "completed",
] as const;

export const DEAL_PRIORITIES = ["urgent", "high", "medium", "low"] as const;

export const DEAL_COUNTERPARTY_TYPES = [
  "lender",
  "amc",
  "insurer",
  "issuer",
  "institution",
  "other",
] as const;

export const DEAL_DOCUMENT_LINK_STATUSES = [
  "required",
  "requested",
  "received",
  "under_verification",
  "verified",
  "rejected",
  "expired",
  "waived",
] as const;
