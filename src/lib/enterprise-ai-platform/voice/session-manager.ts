/**
 * Voice Session Manager + recovery (CO-AI-113).
 */

import type { EaiConversationContinuityState } from "@/types/enterprise-ai-conversation-experience";
import type {
  EaiCreateVoiceSessionInput,
  EaiVoiceError,
  EaiVoiceLanguageCode,
  EaiVoiceSession,
  EaiVoiceSessionStatus,
} from "@/types/enterprise-ai-voice";
import { EAI_VOICE_SUPPORTED_LANGUAGES } from "@/constants/enterprise-ai-platform/voice";

function nowIso(): string {
  return new Date().toISOString();
}

const sessions = new Map<string, EaiVoiceSession>();

export function resetEaiVoiceSessions(): void {
  sessions.clear();
}

export function isEaiVoiceLanguageSupported(code: string): code is EaiVoiceLanguageCode {
  return (EAI_VOICE_SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

export function createEaiVoiceSession(
  input: EaiCreateVoiceSessionInput = {},
): EaiVoiceSession {
  const language = input.language ?? "en";
  if (!isEaiVoiceLanguageSupported(language)) {
    throw new Error(`Unsupported voice language: ${language}`);
  }
  const continuityKey =
    input.continuityKey ??
    input.continuity?.continuityKey ??
    `sarathi_voice_${crypto.randomUUID()}`;
  const ts = nowIso();
  const session: EaiVoiceSession = {
    voiceSessionId: `eai_vs_${crypto.randomUUID()}`,
    conversationId: input.continuity?.conversationId ?? `eai_conv_${crypto.randomUUID()}`,
    eaiSessionId: input.continuity?.sessionId,
    continuityKey,
    personaPackId: input.personaPackId ?? input.continuity?.personaPackId ?? "sarathi_customer",
    language,
    status: "idle",
    continuity: input.continuity,
    createdAt: ts,
    updatedAt: ts,
    interruptCount: 0,
    metadata: input.metadata,
  };
  sessions.set(session.voiceSessionId, session);
  return session;
}

export function getEaiVoiceSession(voiceSessionId: string): EaiVoiceSession | undefined {
  return sessions.get(voiceSessionId);
}

export function listEaiVoiceSessions(): EaiVoiceSession[] {
  return [...sessions.values()];
}

export function updateEaiVoiceSession(
  voiceSessionId: string,
  patch: Partial<
    Pick<
      EaiVoiceSession,
      | "status"
      | "continuity"
      | "eaiSessionId"
      | "conversationId"
      | "language"
      | "lastError"
      | "interruptCount"
      | "metadata"
    >
  >,
): EaiVoiceSession | undefined {
  const existing = sessions.get(voiceSessionId);
  if (!existing) return undefined;
  const next: EaiVoiceSession = {
    ...existing,
    ...patch,
    updatedAt: nowIso(),
  };
  sessions.set(voiceSessionId, next);
  return next;
}

export function setEaiVoiceSessionStatus(
  voiceSessionId: string,
  status: EaiVoiceSessionStatus,
  error?: EaiVoiceError,
): EaiVoiceSession | undefined {
  return updateEaiVoiceSession(voiceSessionId, {
    status,
    lastError: error,
  });
}

export function closeEaiVoiceSession(voiceSessionId: string): EaiVoiceSession | undefined {
  return setEaiVoiceSessionStatus(voiceSessionId, "closed");
}

/**
 * Recover a voice session from conversation continuity (e.g. after reload).
 */
export function recoverEaiVoiceSession(input: {
  continuity: EaiConversationContinuityState;
  language?: EaiVoiceLanguageCode;
  previousVoiceSessionId?: string;
}): { session: EaiVoiceSession; recovered: boolean; error?: EaiVoiceError } {
  if (input.previousVoiceSessionId) {
    const existing = sessions.get(input.previousVoiceSessionId);
    if (existing && existing.status !== "closed") {
      const recovered = updateEaiVoiceSession(existing.voiceSessionId, {
        status: "recovering",
        continuity: input.continuity,
        eaiSessionId: input.continuity.sessionId,
        conversationId: input.continuity.conversationId,
      });
      const idle = setEaiVoiceSessionStatus(existing.voiceSessionId, "idle");
      return { session: idle ?? recovered!, recovered: true };
    }
  }

  try {
    const session = createEaiVoiceSession({
      continuity: input.continuity,
      personaPackId: input.continuity.personaPackId,
      language: input.language ?? "en",
      continuityKey: input.continuity.continuityKey,
      metadata: { recovered: "true" },
    });
    setEaiVoiceSessionStatus(session.voiceSessionId, "idle");
    return { session: getEaiVoiceSession(session.voiceSessionId)!, recovered: true };
  } catch (e) {
    const error: EaiVoiceError = {
      code: "recovery_failed",
      message: e instanceof Error ? e.message : "Voice session recovery failed",
      recoverable: false,
      occurredAt: nowIso(),
    };
    const fallback = createEaiVoiceSession({
      personaPackId: input.continuity.personaPackId,
      language: "en",
    });
    setEaiVoiceSessionStatus(fallback.voiceSessionId, "error", error);
    return {
      session: getEaiVoiceSession(fallback.voiceSessionId)!,
      recovered: false,
      error,
    };
  }
}
