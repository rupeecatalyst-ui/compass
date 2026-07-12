/**
 * EDC — Enterprise Dialogue Center (SPR-001).
 * Unified timeline for opportunity / loan / customer context events.
 */

export type EdcContextType = "opportunity" | "loan" | "customer";

export type EdcEventType =
  | "stage_change"
  | "sub_stage_change"
  | "progress"
  | "task"
  | "email"
  | "notification"
  | "internal_message"
  | "document_upload"
  | "document_verification"
  | "workflow";

export interface EdcContextRef {
  type: EdcContextType;
  id: string;
}

export interface EdcTimelineEntry {
  id: string;
  contextRef: EdcContextRef;
  eventType: EdcEventType;
  title: string;
  description: string;
  actorId: string;
  occurredOn: string;
  expandablePayload?: Record<string, unknown>;
  migrationMode?: boolean;
  /** Set when entry was recorded under migrationMode. */
  historicalReference?: boolean;
}

export interface EdcAuditReference {
  id: string;
  entityId: string;
  entityType: "timeline_entry";
  eafAuditEntryId: string;
  recordedOn: string;
}

export interface EdcRegistrySnapshot {
  timelineEntries: EdcTimelineEntry[];
  auditReferences: EdcAuditReference[];
}
