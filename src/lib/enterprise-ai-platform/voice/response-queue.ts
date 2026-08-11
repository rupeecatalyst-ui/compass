/**
 * Voice Response Queue + interrupt handling (CO-AI-113).
 */

import { EAI_VOICE_MAX_QUEUE_DEPTH } from "@/constants/enterprise-ai-platform/voice";
import type {
  EaiVoiceError,
  EaiVoiceLanguageCode,
  EaiVoiceQueueItem,
} from "@/types/enterprise-ai-voice";

function nowIso(): string {
  return new Date().toISOString();
}

const queues = new Map<string, EaiVoiceQueueItem[]>();

export function resetEaiVoiceQueues(): void {
  queues.clear();
}

export function listEaiVoiceQueue(voiceSessionId: string): EaiVoiceQueueItem[] {
  return [...(queues.get(voiceSessionId) ?? [])];
}

export function enqueueEaiVoiceResponse(input: {
  voiceSessionId: string;
  text: string;
  language: EaiVoiceLanguageCode;
}): { item?: EaiVoiceQueueItem; error?: EaiVoiceError } {
  const current = queues.get(input.voiceSessionId) ?? [];
  const active = current.filter((i) => i.status === "queued" || i.status === "speaking");
  if (active.length >= EAI_VOICE_MAX_QUEUE_DEPTH) {
    return {
      error: {
        code: "queue_overflow",
        message: `Voice response queue exceeds max depth ${EAI_VOICE_MAX_QUEUE_DEPTH}`,
        recoverable: true,
        occurredAt: nowIso(),
      },
    };
  }
  const item: EaiVoiceQueueItem = {
    itemId: `eai_vq_${crypto.randomUUID()}`,
    voiceSessionId: input.voiceSessionId,
    text: input.text,
    language: input.language,
    status: "queued",
    createdAt: nowIso(),
  };
  queues.set(input.voiceSessionId, [...current, item]);
  return { item };
}

/** Barge-in / interrupt — cancel queued and speaking items. */
export function interruptEaiVoiceQueue(voiceSessionId: string): EaiVoiceQueueItem[] {
  const current = queues.get(voiceSessionId) ?? [];
  const next = current.map((item) =>
    item.status === "queued" || item.status === "speaking"
      ? { ...item, status: "cancelled" as const }
      : item,
  );
  queues.set(voiceSessionId, next);
  return next.filter((i) => i.status === "cancelled");
}

export function markEaiVoiceQueueItem(
  voiceSessionId: string,
  itemId: string,
  patch: Partial<Pick<EaiVoiceQueueItem, "status" | "ttsRequestId" | "error">>,
): EaiVoiceQueueItem | undefined {
  const current = queues.get(voiceSessionId) ?? [];
  let updated: EaiVoiceQueueItem | undefined;
  const next = current.map((item) => {
    if (item.itemId !== itemId) return item;
    updated = { ...item, ...patch };
    return updated;
  });
  queues.set(voiceSessionId, next);
  return updated;
}

export function peekNextEaiVoiceQueueItem(
  voiceSessionId: string,
): EaiVoiceQueueItem | undefined {
  return (queues.get(voiceSessionId) ?? []).find((i) => i.status === "queued");
}
