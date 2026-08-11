/**
 * CO-SARATHI-VOICE-001 — Voice Interaction Layer (UI / browser speech).
 * Voice is an interface only — reasoning stays on the Enterprise AI Platform.
 */

import type { EaiVoiceLanguageCode } from "@/types/enterprise-ai-voice";

export const SARATHI_VOICE_LAYER_VERSION = "1.0.0-voice-001";

export const SARATHI_VOICE_LANGUAGES: readonly {
  code: EaiVoiceLanguageCode;
  label: string;
  /** BCP-47 for Web Speech API */
  speechLocale: string;
}[] = [
  { code: "en", label: "English", speechLocale: "en-IN" },
  { code: "hi", label: "Hindi", speechLocale: "hi-IN" },
  { code: "mr", label: "Marathi", speechLocale: "mr-IN" },
] as const;

export function sarathiSpeechLocale(code: EaiVoiceLanguageCode): string {
  return (
    SARATHI_VOICE_LANGUAGES.find((l) => l.code === code)?.speechLocale ?? "en-IN"
  );
}

/** Context-aware status copy — never claim "listening" when mic is idle. */
export const SARATHI_VOICE_STATUS = {
  recording: "Listening...",
  processing: "Understanding your request...",
  typing: "I'm reviewing what you've shared...",
  speaking: "Speaking…",
  unsupported:
    "Voice input needs a browser with speech recognition (Chrome / Edge recommended).",
  micDenied: "Microphone permission is required for voice input.",
  sttFailed:
    "Could not capture speech. You can type or edit the text, then send.",
} as const;
