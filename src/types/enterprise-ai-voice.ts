/**
 * Voice & Real-Time Conversation Engine types (CO-AI-113 / Sprint AI-13).
 * Voice is an interface only — intelligence remains the Enterprise AI Platform.
 */

import type { EaiConversationContinuityState } from "./enterprise-ai-conversation-experience";
import type {
  EaiActionProposal,
  EaiConfidenceBand,
  EaiPersonaPackId,
} from "./enterprise-ai-platform";

/** Supported spoken languages for Voice (AI-13). */
export type EaiVoiceLanguageCode = "en" | "hi" | "mr";

export type EaiVoiceSessionStatus =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "interrupted"
  | "recovering"
  | "error"
  | "closed";

export type EaiVoiceErrorCode =
  | "stt_failed"
  | "tts_failed"
  | "vad_failed"
  | "session_not_found"
  | "session_closed"
  | "interrupt_failed"
  | "queue_overflow"
  | "stream_failed"
  | "recovery_failed"
  | "unsupported_language"
  | "provider_unavailable"
  | "unknown";

export interface EaiVoiceError {
  code: EaiVoiceErrorCode;
  message: string;
  recoverable: boolean;
  occurredAt: string;
  details?: Record<string, unknown>;
}

/** Opaque audio payload — provider-independent. */
export interface EaiVoiceAudioFrame {
  frameId: string;
  /** Base64 or binary-safe string for stub transport */
  data: string;
  mimeType: string;
  sampleRateHz?: number;
  durationMs?: number;
  languageHint?: EaiVoiceLanguageCode;
  createdAt: string;
}

export interface EaiSttRequest {
  requestId: string;
  audio: EaiVoiceAudioFrame;
  language: EaiVoiceLanguageCode;
  /** Partial / streaming recognition when provider supports it */
  streaming?: boolean;
}

export interface EaiSttPartialResult {
  requestId: string;
  text: string;
  isFinal: boolean;
  confidence?: number;
  language: EaiVoiceLanguageCode;
  providerId: string;
}

export interface EaiSttResult {
  requestId: string;
  text: string;
  isFinal: true;
  confidence?: number;
  language: EaiVoiceLanguageCode;
  providerId: string;
  rawProviderMeta?: Record<string, string>;
}

export interface EaiTtsRequest {
  requestId: string;
  text: string;
  language: EaiVoiceLanguageCode;
  /** Streaming synthesis when provider supports it */
  streaming?: boolean;
}

export interface EaiTtsChunk {
  requestId: string;
  chunkIndex: number;
  audio: EaiVoiceAudioFrame;
  isLast: boolean;
  providerId: string;
}

export interface EaiTtsResult {
  requestId: string;
  audio: EaiVoiceAudioFrame;
  language: EaiVoiceLanguageCode;
  providerId: string;
  chunks?: EaiTtsChunk[];
  rawProviderMeta?: Record<string, string>;
}

export interface EaiVadDecision {
  decisionId: string;
  speechDetected: boolean;
  speechEnded: boolean;
  confidence: number;
  providerId: string;
  decidedAt: string;
}

export interface EaiVadRequest {
  requestId: string;
  audio: EaiVoiceAudioFrame;
}

/** Provider-independent STT contract — no vendor SDK types. */
export interface EaiSttProvider {
  readonly providerId: string;
  readonly supportedLanguages: readonly EaiVoiceLanguageCode[];
  transcribe(request: EaiSttRequest): Promise<EaiSttResult>;
  /** Optional streaming partials */
  transcribeStream?(
    request: EaiSttRequest,
    onPartial: (partial: EaiSttPartialResult) => void,
  ): Promise<EaiSttResult>;
}

/** Provider-independent TTS contract — no vendor SDK types. */
export interface EaiTtsProvider {
  readonly providerId: string;
  readonly supportedLanguages: readonly EaiVoiceLanguageCode[];
  synthesize(request: EaiTtsRequest): Promise<EaiTtsResult>;
  synthesizeStream?(
    request: EaiTtsRequest,
    onChunk: (chunk: EaiTtsChunk) => void,
  ): Promise<EaiTtsResult>;
}

/** Provider-independent VAD contract. */
export interface EaiVadProvider {
  readonly providerId: string;
  detect(request: EaiVadRequest): Promise<EaiVadDecision>;
}

export interface EaiVoicePorts {
  sttProvider: EaiSttProvider;
  ttsProvider: EaiTtsProvider;
  vadProvider: EaiVadProvider;
}

export type PartialEaiVoicePorts = Partial<EaiVoicePorts>;

export type EaiVoiceStreamEventType =
  | "stt_partial"
  | "stt_final"
  | "assistant_text"
  | "tts_chunk"
  | "tts_complete"
  | "vad"
  | "interrupt"
  | "error"
  | "status";

export interface EaiVoiceStreamEvent {
  eventId: string;
  voiceSessionId: string;
  type: EaiVoiceStreamEventType;
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface EaiVoiceQueueItem {
  itemId: string;
  voiceSessionId: string;
  text: string;
  language: EaiVoiceLanguageCode;
  status: "queued" | "speaking" | "completed" | "cancelled" | "failed";
  createdAt: string;
  ttsRequestId?: string;
  error?: EaiVoiceError;
}

export interface EaiVoiceSession {
  voiceSessionId: string;
  conversationId: string;
  eaiSessionId?: string;
  continuityKey: string;
  personaPackId: EaiPersonaPackId;
  language: EaiVoiceLanguageCode;
  status: EaiVoiceSessionStatus;
  continuity?: EaiConversationContinuityState;
  createdAt: string;
  updatedAt: string;
  lastError?: EaiVoiceError;
  interruptCount: number;
  metadata?: Record<string, string>;
}

export interface EaiCreateVoiceSessionInput {
  personaPackId?: EaiPersonaPackId;
  language?: EaiVoiceLanguageCode;
  continuity?: EaiConversationContinuityState;
  continuityKey?: string;
  metadata?: Record<string, string>;
}

export interface EaiVoiceUtteranceInput {
  voiceSessionId: string;
  audio: EaiVoiceAudioFrame;
  language?: EaiVoiceLanguageCode;
  /** When true, cancel outstanding TTS before processing */
  bargeIn?: boolean;
  emitActionProposals?: boolean;
}

export interface EaiVoiceTurnResult {
  voiceSessionId: string;
  transcript: string;
  facingText: string;
  language: EaiVoiceLanguageCode;
  continuity: EaiConversationContinuityState;
  actionProposals: EaiActionProposal[];
  suggestedQuestions: string[];
  blocked: boolean;
  confidence?: EaiConfidenceBand;
  tts?: EaiTtsResult;
  queueItemId?: string;
  streamEvents: EaiVoiceStreamEvent[];
  error?: EaiVoiceError;
}

export interface EaiVoiceEngineReadinessResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}
