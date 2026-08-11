/**
 * Voice & Real-Time Conversation Engine constants (CO-AI-113 / Sprint AI-13).
 * Voice is another interface — intelligence stays on the Enterprise AI Platform.
 */

import type { EaiVoiceLanguageCode } from "@/types/enterprise-ai-voice";

export const EAI_VOICE_ENGINE_VERSION = "1.0.0-ai13";

export const EAI_VOICE_DISCLAIMERS = [
  "Voice is only another interface — conversation logic remains the Enterprise AI Platform.",
  "Policy Gate, Context Intelligence, Planner, Advisory, FDI remain the source of intelligence.",
  "No voice cloning · No emotion detection · No CRM execution · No workflow execution.",
  "STT / TTS / VAD providers are swappable — architecture is provider-independent.",
] as const;

export const EAI_VOICE_SUPPORTED_LANGUAGES: readonly EaiVoiceLanguageCode[] = [
  "en",
  "hi",
  "mr",
] as const;

export const EAI_VOICE_LANGUAGE_LABELS: Record<EaiVoiceLanguageCode, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
};

export const EAI_STUB_STT_PROVIDER_ID = "eai.stt.stub";
export const EAI_STUB_TTS_PROVIDER_ID = "eai.tts.stub";
export const EAI_STUB_VAD_PROVIDER_ID = "eai.vad.stub";

export const EAI_VOICE_MAX_QUEUE_DEPTH = 8;
export const EAI_VOICE_CONTINUITY_STORAGE_KEY = "eai.sarathi.voice.continuity.v1";
