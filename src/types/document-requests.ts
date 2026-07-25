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
  | "rejected";

export type OpportunityDocumentReadinessState =
  | "ready_for_lender_submission"
  | "awaiting_critical_documents"
  | "under_verification"
  | "journey_documents_pending";

export type DocumentRequestCommKind =
  | "lod_generated"
  | "email_sent"
  | "whatsapp_sent"
  | "reminder_sent"
  | "customer_uploaded"
  | "verification_completed"
  | "link_regenerated";

export interface DocumentRequestLodItem {
  typeRef: string;
  label: string;
  category: DocumentRequestLodCategory;
  moduleId: string;
  moduleLabel: string;
  mandatory: boolean;
  critical: boolean;
}

export interface DocumentRequestItemState extends DocumentRequestLodItem {
  status: DocumentRequestItemStatus;
  requestedOn?: string;
  reminderStatus?: "none" | "sent" | "overdue";
  lastReminderAt?: string;
  remarks?: string;
  uploadedAt?: string;
  registryRecordId?: string;
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
  createdAt: string;
  expiresAt: string;
  regeneratedAt?: string;
  active: boolean;
}

export interface DocumentRequestWorkspaceState {
  opportunityId: string;
  lodGeneratedAt?: string;
  lodItems: DocumentRequestItemState[];
  uploadSession?: DocumentRequestUploadSession;
  communications: DocumentRequestCommEvent[];
  lastCustomerActivityAt?: string;
  updatedAt: string;
}

export interface DocumentRequestLodReadinessGap {
  field: string;
  label: string;
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
