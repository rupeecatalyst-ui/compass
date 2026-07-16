/**
 * Enterprise Action Center + Context Workspace — presentation contracts.
 * Recipients / templates are composed for the current transaction context.
 * Full Relationship Registry / Identity Registry wiring is Phase 2 alignment.
 */

export type ActionCenterEntityType =
  | "loan"
  | "opportunity"
  | "customer"
  | "wealth_partner"
  | "lender";

export type ActionCenterActionId =
  | "send_email"
  | "send_whatsapp"
  | "upload_documents"
  | "generate_proposal"
  | "notify_senior"
  | "assign_user"
  | "schedule_followup"
  | "ask_chanakya"
  | "view_commercial_summary";

export type CommunicationRecipientType =
  | "customer"
  | "co_applicant"
  | "guarantor"
  | "wealth_partner"
  | "relationship_manager"
  | "hybrid_employee"
  | "lender_representative"
  | "other";

export interface ActionCenterContext {
  entityType: ActionCenterEntityType;
  entityId: string;
  /** Display label for chrome (e.g. file number / customer name). */
  entityLabel: string;
  product?: string;
  stage?: string;
}

export interface ActionCenterActionDef {
  id: ActionCenterActionId;
  label: string;
  description: string;
  /** When false, shown disabled with reason. */
  available: boolean;
  reason?: string;
  group: "communication" | "documents" | "workflow" | "intelligence" | "commercial";
}

export interface ContextParticipant {
  id: string;
  name: string;
  recipientType: CommunicationRecipientType;
  email?: string;
  mobile?: string;
  /** Stable ref for future Identity Registry linkage. */
  identityRef?: string;
}

export type CommunicationChannel = "email" | "whatsapp";

export interface CommunicationTemplateDef {
  id: string;
  code: string;
  name: string;
  channel: CommunicationChannel;
  recipientTypes: CommunicationRecipientType[];
  /** Empty = all products. */
  products?: string[];
  /** Empty = all stages. */
  stages?: string[];
  subject?: string;
  body: string;
  recommended?: boolean;
}

export type OutboxMessageStatus = "queued" | "paused" | "sending" | "sent" | "cancelled";

export interface OutboxMessage {
  id: string;
  channel: CommunicationChannel;
  entityType: ActionCenterEntityType;
  entityId: string;
  recipientId: string;
  recipientName: string;
  recipientType: CommunicationRecipientType;
  recipientEmail?: string;
  recipientMobile?: string;
  templateId?: string;
  templateName?: string;
  subject?: string;
  body: string;
  status: OutboxMessageStatus;
  queuedAt: string;
  dispatchAt: string;
  /** Epoch ms when countdown should fire. */
  dispatchAtMs: number;
}
