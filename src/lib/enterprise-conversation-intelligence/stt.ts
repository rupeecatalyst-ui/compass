/**
 * CO-VOICE-002 — Speech-to-Text helpers (Wave 1).
 * Prefer browser SpeechRecognition while recording; never invent transcript text.
 */

import type { ConversationSttProvider } from "@/types/enterprise-conversation-activity";

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognitionCtor(): (new () => BrowserSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isBrowserSpeechRecognitionAvailable(): boolean {
  return getSpeechRecognitionCtor() != null;
}

export type LiveSttSession = {
  stop: () => void;
  getTranscript: () => string;
  getProvider: () => ConversationSttProvider;
};

/**
 * Start live STT alongside MediaRecorder. Returns null if unsupported.
 * lang: en-IN supports Hinglish-ish capture on many Chromium builds; hi-IN for Hindi.
 */
export function startLiveBrowserStt(options?: {
  lang?: string;
  onPartial?: (text: string) => void;
}): LiveSttSession | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;

  let finalText = "";
  let interim = "";
  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = options?.lang ?? "en-IN";

  recognition.onresult = (event) => {
    let interimBuf = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = event.results[i][0]?.transcript ?? "";
      if (event.results[i].isFinal) {
        finalText = `${finalText} ${piece}`.trim();
      } else {
        interimBuf += piece;
      }
    }
    interim = interimBuf;
    options?.onPartial?.(`${finalText} ${interim}`.trim());
  };

  recognition.onerror = () => {
    /* keep finalText; user can edit */
  };

  recognition.onend = () => {
    /* restarted only by caller */
  };

  try {
    recognition.start();
  } catch {
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          /* ignore */
        }
      }
    },
    getTranscript: () => `${finalText} ${interim}`.trim(),
    getProvider: () => "browser_speech_recognition",
  };
}

export type TranscribeResult = {
  transcript: string;
  provider: ConversationSttProvider;
  languageHint: "en" | "hi" | "hinglish" | "auto" | "unknown";
  message?: string;
};

/**
 * Wave 1 post-process: use live STT buffer; otherwise manual entry required.
 * Does not fabricate demo business content.
 */
export function resolveWave1Transcript(input: {
  liveTranscript?: string | null;
  languageHint?: "en" | "hi" | "hinglish" | "auto";
}): TranscribeResult {
  const text = (input.liveTranscript ?? "").trim();
  if (text) {
    return {
      transcript: text,
      provider: "browser_speech_recognition",
      languageHint: input.languageHint ?? "auto",
    };
  }
  return {
    transcript: "",
    provider: "manual",
    languageHint: input.languageHint ?? "unknown",
    message:
      "Speech-to-text did not capture text. Enter or paste the transcript before saving. No demo transcript was invented.",
  };
}
