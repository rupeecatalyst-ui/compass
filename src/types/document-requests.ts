/**
 * Opportunity Document Requests — workflow types (not document storage).
 * Storage remains Enterprise Document Registry SSOT.
 */

export type DocumentRequestUploadSource =
  | "customer_portal"
  | "manual_upload"
  | "email"
  | "whatsapp"
  | "api";

export type DocumentRequestLodCategory = "critical" | "journey";

export type DocumentRequestItemStatus =
  | "pending"
  | "requested"
  | "uploaded"
  | "under_verification"
  | "verified"
  | "rejected"
  | "re_upload_required";

/** Customer-facing portal progress band (CO-DOC-002). */
export type CustomerPortalProgressBand =
  | "ready"
  | "in_progress"
  | "pending_documents"
  | "awaiting_verification";

export type DocumentRequestSessionAuditAction =
  | "portal_opened"
  | "token_validated"
  | "token_rejected"
  | "upload_started"
  | "upload_completed"
  | "upload_failed"
  | "preview_opened"
  | "replace_started"
  | "saarthi_query";

export interface DocumentRequestSessionAuditEvent {
  id: string;
  token: string;
  opportunityId: string;
  action: DocumentRequestSessionAuditAction;
  at: string;
  detail?: string;
  userAgent?: string;
}

export type OpportunityDocumentReadinessState =
  | "ready_for_lender_submission"
  | "awaiting_critical_documents"
  | "under_verification"
  | "journey_documents_pending";

export type DocumentRequestCommKind =
  | "lod_generated"
  | "lod_regenerated"
  | "email_sent"
  | "whatsapp_sent"
  | "reminder_sent"
  | "customer_uploaded"
  | "verification_completed"
  | "link_regenerated"
  | "upload_link_generated"
  | "custom_requirement_added";

export interface DocumentRequestLodItem {
  /** Stable request-row identity; typeRef remains the editable Document Master reference. */
  requestRef?: string;
  typeRef: string;
  label: string;
  category: DocumentRequestLodCategory;
  moduleId: string;
  moduleLabel: string;
  mandatory: boolean;
  critical: boolean;
  ownerScope?: "participant" | "security";
  participantId?: string;
  ownerName?: string;
  ownerRoleLabel?: string;
  ownerTypeLabel?: string;
}

export interface DocumentRequestItemState extends DocumentRequestLodItem {
  /**
   * Existing `pending` value represents an LOD requirement that has not been
   * communicated yet. UI displays it as "Not Requested".
   */
  status: DocumentRequestItemStatus;
  requestedOn?: string;
  reminderStatus?: "none" | "sent" | "overdue";
  lastReminderAt?: string;
  remarks?: string;
  uploadedAt?: string;
  registryRecordId?: string;
  /** Document Registry ingestion channel for the linked received document. */
  receivedSource?: string;
  /** Manually added requirement; still follows the same request/registry workflow. */
  custom?: boolean;
  addedAt?: string;
  addedBy?: string;
}

export interface DocumentRequestCommEvent {
  id: string;
  kind: DocumentRequestCommKind;
  at: string;
  actor: string;
  detail?: string;
}

export interface DocumentRequestUploadSession {
  /** Opaque token — never the Opportunity ID. */
  token: string;
  opportunityId: string;
  opportunityReference: string;
  customerName: string;
  loanProduct: string;
  borrowerTypeLabel: string;
  constitutionLabel: string;
  rmName?: string;
  /** Customer-facing application status label (never internal IDs). */
  applicationStatus?: string;
  /** Customer-facing stage label (e.g. Document Collection). */
  currentStage?: string;
  /** Optional ops assignee for notifications. */
  operationsUserName?: string;
  createdAt: string;
  expiresAt: string;
  regeneratedAt?: string;
  active: boolean;
}

export interface DocumentRequestLodVersionSnapshot {
  /** Immutable snapshot id */
  id: string;
  versionNumber: number;
  generatedAt: string;
  generatedBy: string;
  borrowerTypeLabel: string;
  productLabel: string;
  constitutionLabel: string;
  /** Fingerprint of the three LOD dimensions */
  dimensionKey: string;
  /** Loan Structure participant/security fingerprint used for participant-card regeneration. */
  structureKey?: string;
  documentCount: number;
  /** Frozen typeRefs at generation time (audit only — not live status) */
  typeRefs: string[];
  active: boolean;
}

export interface DocumentRequestWorkspaceState {
  opportunityId: string;
  lodGeneratedAt?: string;
  lodItems: DocumentRequestItemState[];
  /** Immutable LOD version history — never overwrite prior versions */
  lodVersions?: DocumentRequestLodVersionSnapshot[];
  activeLodVersionId?: string;
  uploadSession?: DocumentRequestUploadSession;
  communications: DocumentRequestCommEvent[];
  /** Secure portal access / activity audit (token-scoped). */
  sessionAudit?: DocumentRequestSessionAuditEvent[];
  lastCustomerActivityAt?: string;
  lastVerificationAt?: string;
  updatedAt: string;
}

export interface CustomerPortalProgressSnapshot extends OpportunityDocumentReadinessSnapshot {
  band: CustomerPortalProgressBand;
  bandLabel: string;
  applicationStatusLabel: string;
}

export interface DocumentRequestLodReadinessGap {
  field: string;
  label: string;
  /** Optional longer user-facing explanation (EDIE certification failures). */
  detail?: string;
}

export interface DocumentRequestLodReadiness {
  canGenerate: boolean;
  gaps: DocumentRequestLodReadinessGap[];
  chanakyaMessage: string | null;
}

export interface OpportunityDocumentReadinessSnapshot {
  state: OpportunityDocumentReadinessState;
  label: string;
  total: number;
  uploaded: number;
  verified: number;
  pending: number;
  criticalPending: number;
  journeyPending: number;
  completionPct: number;
  criticalComplete: boolean;
}
