/**
 * CO-ORG-003 — Enterprise Activity Registry (EAR).
 * Universal append-only operational chronology SSOT.
 */

export type EnterpriseActivityEventKind =
  | "opportunity"
  | "dialogue"
  | "tasks"
  | "documents"
  | "stage_change"
  | "notes"
  | "communications"
  | "workflow"
  | "chanakya"
  | "mission_control";

export type EnterpriseActivitySourceSystem =
  | "edc"
  | "ecie"
  | "ete"
  | "deal_timeline"
  | "deal_activity"
  | "document"
  | "document_request"
  | "opportunity"
  | "outbox"
  | "chanakya"
  | "mission_control"
  | "org"
  | "partner"
  | "workflow"
  | "manual"
  | "business_notes"
  | "inbound_email";

export interface EnterpriseActivityEvent {
  id: string;
  organizationId: string;
  eventKind: EnterpriseActivityEventKind;
  sourceSystem: EnterpriseActivitySourceSystem | string;
  sourceEventId: string | null;
  title: string;
  summary: string | null;
  payload: Record<string, unknown> | null;
  opportunityId: string | null;
  dealId: string | null;
  contactId: string | null;
  taskId: string | null;
  documentId: string | null;
  actorUserId: string | null;
  actorName: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface EmitEnterpriseActivityInput {
  id?: string;
  eventKind: EnterpriseActivityEventKind;
  sourceSystem: EnterpriseActivitySourceSystem | string;
  sourceEventId: string;
  title: string;
  summary?: string | null;
  payload?: Record<string, unknown> | null;
  opportunityId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  taskId?: string | null;
  documentId?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  occurredAt?: string | Date;
}

export interface ListEnterpriseActivityQuery {
  limit?: number;
  eventKind?: EnterpriseActivityEventKind | string;
  opportunityId?: string;
  dealId?: string;
  contactId?: string;
  sourceSystem?: string;
  since?: string;
}
