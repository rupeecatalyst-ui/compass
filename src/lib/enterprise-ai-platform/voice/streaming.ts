/**
 * Voice streaming event bus (CO-AI-113).
 * Provider-independent stream events for STT partials, TTS chunks, status, errors.
 */

import type { EaiVoiceStreamEvent, EaiVoiceStreamEventType } from "@/types/enterprise-ai-voice";

function nowIso(): string {
  return new Date().toISOString();
}

const streams = new Map<string, EaiVoiceStreamEvent[]>();
type Listener = (event: EaiVoiceStreamEvent) => void;
const listeners = new Map<string, Set<Listener>>();

export function resetEaiVoiceStreams(): void {
  streams.clear();
  listeners.clear();
}

export function emitEaiVoiceStreamEvent(input: {
  voiceSessionId: string;
  type: EaiVoiceStreamEventType;
  payload?: Record<string, unknown>;
}): EaiVoiceStreamEvent {
  const event: EaiVoiceStreamEvent = {
    eventId: `eai_vse_${crypto.randomUUID()}`,
    voiceSessionId: input.voiceSessionId,
    type: input.type,
    createdAt: nowIso(),
    payload: input.payload ?? {},
  };
  const list = streams.get(input.voiceSessionId) ?? [];
  streams.set(input.voiceSessionId, [...list, event]);
  for (const listener of listeners.get(input.voiceSessionId) ?? []) {
    listener(event);
  }
  return event;
}

export function listEaiVoiceStreamEvents(voiceSessionId: string): EaiVoiceStreamEvent[] {
  return [...(streams.get(voiceSessionId) ?? [])];
}

export function subscribeEaiVoiceStream(
  voiceSessionId: string,
  listener: Listener,
): () => void {
  const set = listeners.get(voiceSessionId) ?? new Set();
  set.add(listener);
  listeners.set(voiceSessionId, set);
  return () => {
    set.delete(listener);
  };
}
