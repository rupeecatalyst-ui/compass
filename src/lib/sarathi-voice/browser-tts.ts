/**
 * CO-SARATHI-VOICE-001 — real browser Text-to-Speech (speechSynthesis).
 * Does not invent audio; speaks provided facing text only.
 */

import type { EaiVoiceLanguageCode } from "@/types/enterprise-ai-voice";
import { sarathiSpeechLocale } from "@/constants/sarathi-voice";

export function isBrowserSpeechSynthesisAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";
}

function pickVoice(locale: string): SpeechSynthesisVoice | null {
  if (!isBrowserSpeechSynthesisAvailable()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const exact = voices.find((v) => v.lang === locale);
  if (exact) return exact;
  const prefix = locale.split("-")[0] ?? locale;
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix.toLowerCase())) ??
    voices.find((v) => v.lang.toLowerCase().startsWith("en")) ??
    voices[0] ??
    null
  );
}

export type SarathiTtsHandle = {
  cancel: () => void;
  done: Promise<void>;
};

/**
 * Speak SARATHI facing text with the selected consultation language.
 * Cancels any in-flight utterance first.
 */
export function speakSarathiFacingText(input: {
  text: string;
  language: EaiVoiceLanguageCode;
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}): SarathiTtsHandle | null {
  if (!isBrowserSpeechSynthesisAvailable()) {
    input.onError?.("Speech synthesis is not available in this browser.");
    return null;
  }

  const text = input.text.trim();
  if (!text) return null;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const locale = sarathiSpeechLocale(input.language);
  utterance.lang = locale;
  utterance.rate = input.rate ?? 1;
  const voice = pickVoice(locale);
  if (voice) utterance.voice = voice;

  let settle!: () => void;
  const done = new Promise<void>((resolve) => {
    settle = resolve;
  });

  utterance.onstart = () => input.onStart?.();
  utterance.onend = () => {
    input.onEnd?.();
    settle();
  };
  utterance.onerror = () => {
    input.onError?.("Speech playback was interrupted.");
    input.onEnd?.();
    settle();
  };

  // Chromium may load voices asynchronously — speak once only
  let started = false;
  const run = () => {
    if (started) return;
    started = true;
    const v = pickVoice(locale);
    if (v) utterance.voice = v;
    window.speechSynthesis.speak(utterance);
  };
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener("voiceschanged", run, { once: true });
    window.setTimeout(run, 250);
  } else {
    run();
  }

  return {
    cancel: () => {
      window.speechSynthesis.cancel();
      settle();
    },
    done,
  };
}

export function cancelSarathiSpeech(): void {
  if (!isBrowserSpeechSynthesisAvailable()) return;
  window.speechSynthesis.cancel();
}
