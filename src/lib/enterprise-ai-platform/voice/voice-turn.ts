/**
 * Voice turn orchestrator (CO-AI-113).
 * STT → runEaiSarathiConversationTurn → TTS queue — intelligence unchanged.
 */

import { runEaiSarathiConversationTurn } from "../conversation-experience/turn-orchestrator";
import { getEaiVoicePorts } from "./composition";
import {
  enqueueEaiVoiceResponse,
  interruptEaiVoiceQueue,
  markEaiVoiceQueueItem,
} from "./response-queue";
import {
  getEaiVoiceSession,
  isEaiVoiceLanguageSupported,
  setEaiVoiceSessionStatus,
  updateEaiVoiceSession,
} from "./session-manager";
import { emitEaiVoiceStreamEvent, listEaiVoiceStreamEvents } from "./streaming";
import type {
  EaiVoiceError,
  EaiVoiceTurnResult,
  EaiVoiceUtteranceInput,
} from "@/types/enterprise-ai-voice";

function nowIso(): string {
  return new Date().toISOString();
}

function voiceError(
  code: EaiVoiceError["code"],
  message: string,
  recoverable = true,
  details?: Record<string, unknown>,
): EaiVoiceError {
  return { code, message, recoverable, occurredAt: nowIso(), details };
}

/**
 * Process one spoken utterance end-to-end.
 * Conversation intelligence is exclusively `runEaiSarathiConversationTurn`.
 */
export async function runEaiVoiceConversationTurn(
  input: EaiVoiceUtteranceInput,
): Promise<EaiVoiceTurnResult> {
  const session = getEaiVoiceSession(input.voiceSessionId);
  if (!session) {
    const error = voiceError("session_not_found", "Voice session not found", false);
    return {
      voiceSessionId: input.voiceSessionId,
      transcript: "",
      facingText: "",
      language: "en",
      continuity: {
        continuityKey: "",
        conversationId: "",
        personaPackId: "sarathi_customer",
        messages: [],
        updatedAt: nowIso(),
      },
      actionProposals: [],
      suggestedQuestions: [],
      blocked: true,
      streamEvents: [],
      error,
    };
  }

  if (session.status === "closed") {
    const error = voiceError("session_closed", "Voice session is closed", false);
    setEaiVoiceSessionStatus(session.voiceSessionId, "error", error);
    emitEaiVoiceStreamEvent({
      voiceSessionId: session.voiceSessionId,
      type: "error",
      payload: { ...error },
    });
    return {
      voiceSessionId: session.voiceSessionId,
      transcript: "",
      facingText: "",
      language: session.language,
      continuity: session.continuity ?? {
        continuityKey: session.continuityKey,
        conversationId: session.conversationId,
        personaPackId: session.personaPackId,
        messages: [],
        updatedAt: nowIso(),
      },
      actionProposals: [],
      suggestedQuestions: [],
      blocked: true,
      streamEvents: listEaiVoiceStreamEvents(session.voiceSessionId),
      error,
    };
  }

  const language = input.language ?? session.language;
  if (!isEaiVoiceLanguageSupported(language)) {
    const error = voiceError(
      "unsupported_language",
      `Unsupported language: ${language}`,
      true,
    );
    setEaiVoiceSessionStatus(session.voiceSessionId, "error", error);
    emitEaiVoiceStreamEvent({
      voiceSessionId: session.voiceSessionId,
      type: "error",
      payload: { ...error },
    });
    return {
      voiceSessionId: session.voiceSessionId,
      transcript: "",
      facingText: "",
      language: session.language,
      continuity: session.continuity!,
      actionProposals: [],
      suggestedQuestions: [],
      blocked: true,
      streamEvents: listEaiVoiceStreamEvents(session.voiceSessionId),
      error,
    };
  }

  if (input.bargeIn) {
    interruptEaiVoiceQueue(session.voiceSessionId);
    updateEaiVoiceSession(session.voiceSessionId, {
      status: "interrupted",
      interruptCount: session.interruptCount + 1,
    });
    emitEaiVoiceStreamEvent({
      voiceSessionId: session.voiceSessionId,
      type: "interrupt",
      payload: { reason: "barge_in" },
    });
  }

  const ports = getEaiVoicePorts();

  // VAD
  try {
    const vad = await ports.vadProvider.detect({
      requestId: `eai_vadreq_${crypto.randomUUID()}`,
      audio: input.audio,
    });
    emitEaiVoiceStreamEvent({
      voiceSessionId: session.voiceSessionId,
      type: "vad",
      payload: { ...vad },
    });
    if (!vad.speechDetected) {
      setEaiVoiceSessionStatus(session.voiceSessionId, "idle");
      return {
        voiceSessionId: session.voiceSessionId,
        transcript: "",
        facingText: "",
        language,
        continuity: session.continuity ?? {
          continuityKey: session.continuityKey,
          conversationId: session.conversationId,
          personaPackId: session.personaPackId,
          messages: [],
          updatedAt: nowIso(),
        },
        actionProposals: [],
        suggestedQuestions: [],
        blocked: false,
        streamEvents: listEaiVoiceStreamEvents(session.voiceSessionId),
      };
    }
  } catch (e) {
    const error = voiceError(
      "vad_failed",
      e instanceof Error ? e.message : "VAD failed",
      true,
    );
    setEaiVoiceSessionStatus(session.voiceSessionId, "error", error);
    emitEaiVoiceStreamEvent({
      voiceSessionId: session.voiceSessionId,
      type: "error",
      payload: { ...error },
    });
  }

  setEaiVoiceSessionStatus(session.voiceSessionId, "listening");
  emitEaiVoiceStreamEvent({
    voiceSessionId: session.voiceSessionId,
    type: "status",
    payload: { status: "listening" },
  });

  // STT
  let transcript = "";
  try {
    const sttRequest = {
      requestId: `eai_stt_${crypto.randomUUID()}`,
      audio: input.audio,
      language,
      streaming: true,
    };
    if (ports.sttProvider.transcribeStream) {
      const result = await ports.sttProvider.transcribeStream(sttRequest, (partial) => {
        emitEaiVoiceStreamEvent({
          voiceSessionId: session.voiceSessionId,
          type: partial.isFinal ? "stt_final" : "stt_partial",
          payload: { ...partial },
        });
      });
      transcript = result.text.trim();
    } else {
      const result = await ports.sttProvider.transcribe(sttRequest);
      transcript = result.text.trim();
      emitEaiVoiceStreamEvent({
        voiceSessionId: session.voiceSessionId,
        type: "stt_final",
        payload: { ...result },
      });
    }
  } catch (e) {
    const error = voiceError(
      "stt_failed",
      e instanceof Error ? e.message : "Speech-to-text failed",
      true,
    );
    setEaiVoiceSessionStatus(session.voiceSessionId, "error", error);
    emitEaiVoiceStreamEvent({
      voiceSessionId: session.voiceSessionId,
      type: "error",
      payload: { ...error },
    });
    return {
      voiceSessionId: session.voiceSessionId,
      transcript: "",
      facingText: "",
      language,
      continuity: session.continuity ?? {
        continuityKey: session.continuityKey,
        conversationId: session.conversationId,
        personaPackId: session.personaPackId,
        messages: [],
        updatedAt: nowIso(),
      },
      actionProposals: [],
      suggestedQuestions: [],
      blocked: true,
      streamEvents: listEaiVoiceStreamEvents(session.voiceSessionId),
      error,
    };
  }

  if (!transcript) {
    setEaiVoiceSessionStatus(session.voiceSessionId, "idle");
    return {
      voiceSessionId: session.voiceSessionId,
      transcript: "",
      facingText: "",
      language,
      continuity: session.continuity ?? {
        continuityKey: session.continuityKey,
        conversationId: session.conversationId,
        personaPackId: session.personaPackId,
        messages: [],
        updatedAt: nowIso(),
      },
      actionProposals: [],
      suggestedQuestions: [],
      blocked: false,
      streamEvents: listEaiVoiceStreamEvents(session.voiceSessionId),
    };
  }

  // Platform conversation intelligence (unchanged)
  setEaiVoiceSessionStatus(session.voiceSessionId, "processing");
  emitEaiVoiceStreamEvent({
    voiceSessionId: session.voiceSessionId,
    type: "status",
    payload: { status: "processing" },
  });

  const turn = await runEaiSarathiConversationTurn({
    utterance: transcript,
    continuity: session.continuity,
    personaPackId: session.personaPackId,
    emitActionProposals: input.emitActionProposals !== false,
    channel: "voice",
    languagePreference: language,
  });

  updateEaiVoiceSession(session.voiceSessionId, {
    continuity: turn.continuity,
    eaiSessionId: turn.continuity.sessionId,
    conversationId: turn.continuity.conversationId,
  });

  emitEaiVoiceStreamEvent({
    voiceSessionId: session.voiceSessionId,
    type: "assistant_text",
    payload: {
      text: turn.facingText,
      blocked: turn.blocked,
      confidence: turn.assistantMessage.confidence,
    },
  });

  // TTS queue (skip empty / blocked-without-text)
  let queueItemId: string | undefined;
  let tts = undefined as EaiVoiceTurnResult["tts"];

  if (turn.facingText.trim()) {
    const queued = enqueueEaiVoiceResponse({
      voiceSessionId: session.voiceSessionId,
      text: turn.facingText,
      language,
    });
    if (queued.error) {
      setEaiVoiceSessionStatus(session.voiceSessionId, "error", queued.error);
      emitEaiVoiceStreamEvent({
        voiceSessionId: session.voiceSessionId,
        type: "error",
        payload: { ...queued.error },
      });
    } else if (queued.item) {
      queueItemId = queued.item.itemId;
      setEaiVoiceSessionStatus(session.voiceSessionId, "speaking");
      markEaiVoiceQueueItem(session.voiceSessionId, queued.item.itemId, {
        status: "speaking",
      });
      try {
        const ttsRequest = {
          requestId: `eai_tts_${crypto.randomUUID()}`,
          text: turn.facingText,
          language,
          streaming: true,
        };
        if (ports.ttsProvider.synthesizeStream) {
          tts = await ports.ttsProvider.synthesizeStream(ttsRequest, (chunk) => {
            emitEaiVoiceStreamEvent({
              voiceSessionId: session.voiceSessionId,
              type: "tts_chunk",
              payload: {
                chunkIndex: chunk.chunkIndex,
                isLast: chunk.isLast,
                frameId: chunk.audio.frameId,
              },
            });
          });
        } else {
          tts = await ports.ttsProvider.synthesize(ttsRequest);
        }
        markEaiVoiceQueueItem(session.voiceSessionId, queued.item.itemId, {
          status: "completed",
          ttsRequestId: tts.requestId,
        });
        emitEaiVoiceStreamEvent({
          voiceSessionId: session.voiceSessionId,
          type: "tts_complete",
          payload: { requestId: tts.requestId, providerId: tts.providerId },
        });
      } catch (e) {
        const error = voiceError(
          "tts_failed",
          e instanceof Error ? e.message : "Text-to-speech failed",
          true,
        );
        markEaiVoiceQueueItem(session.voiceSessionId, queued.item.itemId, {
          status: "failed",
          error,
        });
        setEaiVoiceSessionStatus(session.voiceSessionId, "error", error);
        emitEaiVoiceStreamEvent({
          voiceSessionId: session.voiceSessionId,
          type: "error",
          payload: { ...error },
        });
        return {
          voiceSessionId: session.voiceSessionId,
          transcript,
          facingText: turn.facingText,
          language,
          continuity: turn.continuity,
          actionProposals: turn.actionProposals,
          suggestedQuestions: turn.suggestedQuestions,
          blocked: turn.blocked,
          confidence: turn.assistantMessage.confidence,
          queueItemId,
          streamEvents: listEaiVoiceStreamEvents(session.voiceSessionId),
          error,
        };
      }
    }
  }

  setEaiVoiceSessionStatus(session.voiceSessionId, "idle");
  emitEaiVoiceStreamEvent({
    voiceSessionId: session.voiceSessionId,
    type: "status",
    payload: { status: "idle" },
  });

  return {
    voiceSessionId: session.voiceSessionId,
    transcript,
    facingText: turn.facingText,
    language,
    continuity: turn.continuity,
    actionProposals: turn.actionProposals,
    suggestedQuestions: turn.suggestedQuestions,
    blocked: turn.blocked,
    confidence: turn.assistantMessage.confidence,
    tts,
    queueItemId,
    streamEvents: listEaiVoiceStreamEvents(session.voiceSessionId),
  };
}

/** Explicit interrupt API for barge-in from UI. */
export function interruptEaiVoiceSession(voiceSessionId: string): boolean {
  const session = getEaiVoiceSession(voiceSessionId);
  if (!session || session.status === "closed") return false;
  interruptEaiVoiceQueue(voiceSessionId);
  updateEaiVoiceSession(voiceSessionId, {
    status: "interrupted",
    interruptCount: session.interruptCount + 1,
  });
  emitEaiVoiceStreamEvent({
    voiceSessionId,
    type: "interrupt",
    payload: { reason: "explicit" },
  });
  setEaiVoiceSessionStatus(voiceSessionId, "idle");
  return true;
}
