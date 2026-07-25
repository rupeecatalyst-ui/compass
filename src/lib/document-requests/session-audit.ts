/**
 * Secure upload session access audit — never a document store.
 */

import { DOCUMENT_REQUEST_SESSION_AUDIT_KEY } from "@/constants/document-requests";
import type {
  DocumentRequestSessionAuditAction,
  DocumentRequestSessionAuditEvent,
} from "@/types/document-requests";

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readAudit(): DocumentRequestSessionAuditEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DOCUMENT_REQUEST_SESSION_AUDIT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DocumentRequestSessionAuditEvent[];
  } catch {
    return [];
  }
}

function writeAudit(events: DocumentRequestSessionAuditEvent[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    DOCUMENT_REQUEST_SESSION_AUDIT_KEY,
    JSON.stringify(events.slice(0, 500)),
  );
}

export function appendUploadSessionAudit(input: {
  token: string;
  opportunityId: string;
  action: DocumentRequestSessionAuditAction;
  detail?: string;
}): DocumentRequestSessionAuditEvent {
  const event: DocumentRequestSessionAuditEvent = {
    id: newId("drau"),
    token: input.token,
    opportunityId: input.opportunityId,
    action: input.action,
    at: new Date().toISOString(),
    detail: input.detail,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 180) : undefined,
  };
  writeAudit([event, ...readAudit()]);
  return event;
}

export function listUploadSessionAudit(token?: string): DocumentRequestSessionAuditEvent[] {
  const all = readAudit();
  if (!token) return all;
  return all.filter((e) => e.token === token);
}
