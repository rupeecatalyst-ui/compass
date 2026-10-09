/** CO-VOICE-002: persist audio, conversation and canonical EAR before publishing success. */
import { CONVERSATION_AUDIO_CATEGORY_LABEL, CONVERSATION_AUDIO_TYPE_REF } from "@/constants/enterprise-conversation-intelligence";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import { uploadDocumentToRegistry } from "@/lib/document-registry/store";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { notifyLoanFilesUpdated } from "@/lib/loan-data-sync";
import { notifyOpportunitiesUpdated } from "@/lib/enterprise-opportunity/opportunity-data-sync";
import { createConversationActivity, rememberServerConversationActivity } from "./activity-registry";
import { newConversationSubmission, type ConversationSubmission } from "./submission";
import type { ConversationActivityChannel, ConversationActivityComposerContext, ConversationSttProvider, ConversationTranscriptLanguage, EnterpriseConversationActivity } from "@/types/enterprise-conversation-activity";
import type { EdcContextType } from "@/types/enterprise-dialogue-center";

function mapEdcContextType(contextType: ConversationActivityComposerContext["contextType"]): EdcContextType {
  if (contextType === "loan" || contextType === "deal" || contextType === "task") return contextType;
  if (contextType === "contact" || contextType === "customer") return "contact";
  return "opportunity";
}
export type SaveConversationActivityInput = {
  composer: ConversationActivityComposerContext;
  channel: ConversationActivityChannel;
  title?: string;
  bodyText?: string;
  transcriptText?: string;
  transcriptRaw?: string;
  transcriptLanguage?: ConversationTranscriptLanguage;
  sttProvider?: ConversationSttProvider;
  durationMs?: number | null;
  audioFile?: File | null;
  actorUserId: string;
  actorLabel?: string;
};

export async function saveConversationActivity(
  input: SaveConversationActivityInput,
  submission: ConversationSubmission = newConversationSubmission(),
  dependencies = { upload: uploadDocumentToRegistry, request: authenticatedJsonFetch },
): Promise<EnterpriseConversationActivity> {
  const dealId = input.composer.dealId ?? (input.composer.contextType === "deal" ? input.composer.contextId : null);
  const transcript = (input.transcriptText ?? "").trim() || (input.bodyText ?? "").trim();
  if (!transcript) throw new Error("Enter a note or transcript before saving.");
  if (input.audioFile && !submission.audioDocumentId) {
    const { record } = await dependencies.upload({
      file: input.audioFile,
      typeRef: CONVERSATION_AUDIO_TYPE_REF,
      categoryLabel: CONVERSATION_AUDIO_CATEGORY_LABEL,
      uploadedBy: input.actorLabel || input.actorUserId,
      uploadedByUserId: input.actorUserId,
      links: {
        opportunityId: input.composer.opportunityId ?? undefined,
        dealId: dealId ?? undefined,
        contactId: input.composer.contactId ?? undefined,
        loanFileId: input.composer.loanFileId ?? undefined,
        documentScope: dealId ? "lender" : "shared",
      },
      uploadSource: "conversation_activity",
      requireServerPersistence: true,
    });
    submission.audioDocumentId = record.id;
  }
  const title = input.title?.trim() || (input.channel === "in_app_mic" ? "Voice Activity" + (input.durationMs ? " · " + formatDuration(input.durationMs) : "") : "Activity Note");
  const activity = createConversationActivity({
    contextType: input.composer.contextType, contextId: input.composer.contextId,
    opportunityId: input.composer.opportunityId, dealId,
    contactId: input.composer.contactId, loanFileId: input.composer.loanFileId,
    channel: input.channel, title, bodyText: input.bodyText ?? transcript,
    transcriptText: transcript, transcriptRaw: input.transcriptRaw ?? null,
    transcriptLanguage: input.transcriptLanguage ?? "unknown", sttProvider: input.sttProvider ?? "none",
    audioDocumentId: submission.audioDocumentId ?? null, durationMs: input.durationMs ?? null,
    recordedByUserId: input.actorUserId, recordedByLabel: input.actorLabel,
  }, { id: submission.id, publish: false, edcTimelineEntryId: submission.edcId });
  const res = await dependencies.request("/api/enterprise-conversation-activities", {
    method: "POST", body: JSON.stringify(activity),
  });
  const payload = await res.json().catch(() => null) as {
    success?: boolean; data?: { item?: EnterpriseConversationActivity; durable?: boolean };
    error?: { message?: string };
  } | null;
  if (!res.ok || !payload?.success) throw new Error(payload?.error?.message || "Could not save activity (" + res.status + "). Retry the save.");
  const saved = payload.data?.item;
  if (!payload.data?.durable || !saved?.id || saved.id !== submission.id || saved.status !== "saved" || !saved.savedAt || !Number.isFinite(Date.parse(saved.recordedAt))) {
    throw new Error("Activity persistence was not confirmed by the server. Your draft has been retained; retry the save.");
  }
  if (saved.contextType !== input.composer.contextType || saved.contextId !== input.composer.contextId || (saved.dealId ?? null) !== (dealId ?? null)) {
    throw new Error("The saved activity context could not be confirmed. Your draft has been retained.");
  }
  // EDC is a projection. EAR was already committed by the canonical server writer.
  if (!submission.activity) {
    try {
      appendEdcTimelineEntry({
        id: submission.edcId, occurredOn: saved.recordedAt,
        contextRef: { type: mapEdcContextType(saved.contextType), id: saved.contextId },
        eventType: "conversation_activity", title: saved.title,
        description: transcript.slice(0, 280), actorId: saved.recordedByUserId,
        expandablePayload: { source: "ecie-wave1", channel: saved.channel, audioDocumentId: saved.audioDocumentId ?? null, durationMs: saved.durationMs ?? null, sttProvider: saved.sttProvider },
      });
    } catch { /* Durable conversation and EAR are intact; projection can rehydrate. */ }
  }
  submission.activity = saved;
  rememberServerConversationActivity(saved);
  if (saved.dealId) notifyLoanFilesUpdated();
  if (saved.opportunityId) notifyOpportunitiesUpdated();
  return saved;
}
function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  return Math.floor(totalSec / 60) + ":" + String(totalSec % 60).padStart(2, "0");
}
