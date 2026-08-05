/**
 * CO-VOICE-002 — Enterprise Activity Registry (in-memory port + event bus).
 * Durable rows also POST to /api/enterprise-conversation-activities when authenticated.
 * Session map only — never a browser durable store (ADR-021).
 */

import { ECIE_ACTIVITY_UPDATED_EVENT } from "@/constants/enterprise-conversation-intelligence";
import type {
  CreateConversationActivityInput,
  EnterpriseConversationActivity,
} from "@/types/enterprise-conversation-activity";

const activities = new Map<string, EnterpriseConversationActivity>();

function emitUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ECIE_ACTIVITY_UPDATED_EVENT));
}

function allocateCode(): string {
  const n = activities.size + 1;
  return `VA-${String(n).padStart(6, "0")}`;
}

export function listConversationActivities(): EnterpriseConversationActivity[] {
  return [...activities.values()]
    .filter((a) => !a.isDeleted)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
}

export function listConversationActivitiesByContext(
  contextType: string,
  contextId: string,
): EnterpriseConversationActivity[] {
  return listConversationActivities().filter(
    (a) => a.contextType === contextType && a.contextId === contextId,
  );
}

export function getConversationActivity(id: string): EnterpriseConversationActivity | undefined {
  const row = activities.get(id);
  return row && !row.isDeleted ? row : undefined;
}

export function subscribeConversationActivitiesUpdated(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(ECIE_ACTIVITY_UPDATED_EVENT, listener);
  return () => window.removeEventListener(ECIE_ACTIVITY_UPDATED_EVENT, listener);
}

export function createConversationActivity(
  input: CreateConversationActivityInput,
  opts?: { organizationId?: string; edcTimelineEntryId?: string | null },
): EnterpriseConversationActivity {
  const now = new Date().toISOString();
  const id = `eca_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const row: EnterpriseConversationActivity = {
    id,
    organizationId: opts?.organizationId ?? "org_session",
    activityCode: allocateCode(),
    contextType: input.contextType,
    contextId: input.contextId,
    opportunityId: input.opportunityId ?? null,
    dealId: input.dealId ?? null,
    contactId: input.contactId ?? null,
    loanFileId: input.loanFileId ?? null,
    channel: input.channel,
    status: "saved",
    title:
      input.title?.trim() ||
      (input.channel === "in_app_mic" ? "Voice Activity" : "Activity Note"),
    bodyText: input.bodyText ?? null,
    transcriptText: input.transcriptText ?? input.bodyText ?? null,
    transcriptRaw: input.transcriptRaw ?? null,
    transcriptLanguage: input.transcriptLanguage ?? "unknown",
    sttProvider: input.sttProvider ?? "none",
    audioDocumentId: input.audioDocumentId ?? null,
    durationMs: input.durationMs ?? null,
    recordedByUserId: input.recordedByUserId,
    recordedByLabel: input.recordedByLabel ?? null,
    recordedAt: now,
    savedAt: now,
    edcTimelineEntryId: opts?.edcTimelineEntryId ?? null,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };
  activities.set(row.id, row);
  emitUpdated();
  return row;
}

export function rememberServerConversationActivity(
  row: EnterpriseConversationActivity,
): EnterpriseConversationActivity {
  activities.set(row.id, row);
  emitUpdated();
  return row;
}
