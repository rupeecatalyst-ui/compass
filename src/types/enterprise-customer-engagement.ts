/**
 * CO-BIZ-004 — Enterprise Customer Engagement (ECE).
 * Customer portal is a read projection of Deal · ETE · Documents · EDC · ENCE.
 * No parallel workflow / status ownership.
 */

import type { CustomerPortalProgressSnapshot } from "@/types/document-requests";
import type { EdcEventType } from "@/types/enterprise-dialogue-center";
import type { EteWorkType } from "@/types/enterprise-task-engine";

export type EcePortalTab =
  | "dashboard"
  | "tasks"
  | "documents"
  | "timeline"
  | "notifications"
  | "messages";

export type EceCustomerTaskKind =
  | "upload_document"
  | "replace_document"
  | "sign_application"
  | "provide_bank_statement"
  | "respond_to_query"
  | "complete_kyc"
  | "other";

export type EceCustomerTaskStatus = "open" | "completed" | "waiting_on_us";

export type EceNotificationKind =
  | "document_accepted"
  | "document_rejected"
  | "action_required"
  | "stage_progressed"
  | "loan_approved"
  | "disbursement_completed"
  | "general";

export type EceMessageRole = "customer" | "relationship_manager" | "system";

export interface EceActiveOpportunityCard {
  opportunityId: string;
  reference: string;
  productLabel: string;
  customerName: string;
  currentStage: string;
  applicationStatus: string;
  relationshipManager: string;
}

export interface EceActiveDealCard {
  dealId: string;
  fileNumber: string;
  productLabel: string;
  amountLabel: string;
  stageLabel: string;
  relationshipManager: string;
  statusLabel: string;
}

export interface EceDashboardProjection {
  asOf: string;
  opportunity: EceActiveOpportunityCard;
  deals: EceActiveDealCard[];
  currentStage: string;
  relationshipManager: string;
  nextRequiredAction: string | null;
  expectedNextMilestone: string | null;
  recentActivity: EceTimelineEvent[];
  documentProgress: CustomerPortalProgressSnapshot;
}

export interface EceCustomerTask {
  id: string;
  kind: EceCustomerTaskKind;
  title: string;
  description: string;
  status: EceCustomerTaskStatus;
  /** Origin: document_requests LOD · ETE projection */
  source: "document_requests" | "ete";
  workType?: EteWorkType;
  documentTypeRef?: string;
  dueOn?: string;
  eteTaskId?: string;
}

export interface EceDocumentItem {
  typeRef: string;
  label: string;
  mandatory: boolean;
  critical: boolean;
  status: string;
  statusLabel: string;
  canUpload: boolean;
  canReplace: boolean;
  remarks?: string;
  uploadedAt?: string;
  registryRecordId?: string;
}

export interface EceDocumentCentre {
  items: EceDocumentItem[];
  uploadHistory: Array<{
    at: string;
    label: string;
    detail?: string;
  }>;
  progress: CustomerPortalProgressSnapshot;
}

export interface EceTimelineEvent {
  id: string;
  at: string;
  title: string;
  description: string;
  category: "milestone" | "customer_action" | "document" | "approval" | "communication" | "other";
  eventType?: EdcEventType | string;
}

export interface EceNotification {
  id: string;
  kind: EceNotificationKind;
  title: string;
  body: string;
  at: string;
  readHint: boolean;
}

export interface EceMessage {
  id: string;
  role: EceMessageRole;
  body: string;
  at: string;
  authorLabel: string;
}

export interface EceCxScoreDimension {
  id: string;
  label: string;
  score: number;
  weight: number;
  rationale: string;
}

export interface EceCustomerExperienceScore {
  overall: number;
  band: "excellent" | "good" | "fair" | "needs_attention";
  dimensions: EceCxScoreDimension[];
  asOf: string;
}

export interface EceEngagementSnapshot {
  asOf: string;
  tokenValid: boolean;
  opportunityId: string;
  opportunityReference: string;
  dashboard: EceDashboardProjection | null;
  tasks: EceCustomerTask[];
  documents: EceDocumentCentre | null;
  timeline: EceTimelineEvent[];
  notifications: EceNotification[];
  messages: EceMessage[];
  cxScore: EceCustomerExperienceScore;
}
