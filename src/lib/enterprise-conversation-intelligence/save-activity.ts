/**
 * CO-VOICE-002 — Save conversation activity: Document Registry audio + Activity Registry + EDC.
 * Wave 1: no CRM field updates, no ETE tasks, no entity linking.
 */

import {
  CONVERSATION_AUDIO_CATEGORY_LABEL,
  CONVERSATION_AUDIO_TYPE_REF,
} from "@/constants/enterprise-conversation-intelligence";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import { uploadDocumentToRegistry } from "@/lib/document-registry/store";
import {
  createConversationActivity,
  rememberServerConversationActivity,
} from "@/lib/enterprise-conversation-intelligence/activity-registry";
import type {
  ConversationActivityChannel,
  ConversationActivityComposerContext,
  ConversationSttProvider,
  ConversationTranscriptLanguage,
  EnterpriseConversationActivity,
} from "@/types/enterprise-conversation-activity";
import type { EdcContextType } from "@/types/enterprise-dialogue-center";

function mapEdcContextType(
  contextType: ConversationActivityComposerContext["contextType"],
): EdcContextType {
  if (contextType === "loan") return "loan";
  if (contextType === "deal") return "deal";
  if (contextType === "contact" || contextType === "customer") return "contact";
  if (contextType === "task") return "task";
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
): Promise<EnterpriseConversationActivity> {
  let audioDocumentId: string | null = null;

  if (input.audioFile) {
    const { record } = await uploadDocumentToRegistry({
      file: input.audioFile,
      typeRef: CONVERSATION_AUDIO_TYPE_REF,
      categoryLabel: CONVERSATION_AUDIO_CATEGORY_LABEL,
      uploadedBy: input.actorLabel || input.actorUserId,
      uploadedByUserId: input.actorUserId,
      links: {
        opportunityId: input.composer.opportunityId ?? undefined,
        contactId: input.composer.contactId ?? undefined,
        loanFileId: input.composer.loanFileId ?? undefined,
        documentScope: "shared",
      },
      uploadSource: "conversation_activity",
    });
    audioDocumentId = record.id;
  }

  const transcript =
    (input.transcriptText ?? "").trim() || (input.bodyText ?? "").trim();
  const title =
    input.title?.trim() ||
    (input.channel === "in_app_mic"
      ? `Voice Activity${input.durationMs ? ` · ${formatDuration(input.durationMs)}` : ""}`
      : "Activity Note");

  const edc = appendEdcTimelineEntry({
    contextRef: {
      type: mapEdcContextType(input.composer.contextType),
      id: input.composer.contextId,
    },
    eventType: "conversation_activity",
    title,
    description: transcript
      ? transcript.slice(0, 280)
      : input.channel === "in_app_mic"
        ? "Voice activity saved (transcript empty — edit in Activity Registry)."
        : "Typed activity note.",
    actorId: input.actorUserId,
    expandablePayload: {
      source: "ecie-wave1",
      channel: input.channel,
      audioDocumentId,
      durationMs: input.durationMs ?? null,
      sttProvider: input.sttProvider ?? "none",
    },
  });

  const activity = createConversationActivity(
    {
      contextType: input.composer.contextType,
      contextId: input.composer.contextId,
      opportunityId: input.composer.opportunityId,
      dealId: input.composer.dealId,
      contactId: input.composer.contactId,
      loanFileId: input.composer.loanFileId,
      channel: input.channel,
      title,
      bodyText: input.bodyText ?? transcript,
      transcriptText: transcript || null,
      transcriptRaw: input.transcriptRaw ?? null,
      transcriptLanguage: input.transcriptLanguage ?? "unknown",
      sttProvider: input.sttProvider ?? "none",
      audioDocumentId,
      durationMs: input.durationMs ?? null,
      recordedByUserId: input.actorUserId,
      recordedByLabel: input.actorLabel,
    },
    { edcTimelineEntryId: edc.id },
  );

  // Best-effort durable sync (additive Prisma). Failure does not roll back session registry.
  try {
    const res = await fetch("/api/enterprise-conversation-activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(activity),
    });
    if (res.ok) {
      const payload = (await res.json()) as {
        data?: EnterpriseConversationActivity;
        item?: EnterpriseConversationActivity;
      };
      const saved = payload.data ?? payload.item;
      if (saved?.id) return rememberServerConversationActivity({ ...activity, ...saved });
    }
  } catch {
    /* session registry remains SSOT for Soft Go-Live */
  }

  return activity;
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
