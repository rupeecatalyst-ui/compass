/**
 * Language detection (CO-AI-114).
 * Deterministic · provider-independent · no vendor MT/STT SDK.
 */

import type {
  EaiLanguageCode,
  EaiLanguageDetectionResult,
} from "@/types/enterprise-ai-multilingual";

const DEVANAGARI = /[\u0900-\u097F]/;
const LATIN_WORD = /[A-Za-z]{3,}/;

/** Hindi-leaning Latin (Hinglish) markers */
const HINGLISH =
  /\b(hai|hain|kya|mujhe|chahiye|nahi|nahin|karna|karo|please\s+batao|kitna)\b/i;

/** Marathi-leaning Latin markers */
const MARATHI_LATIN =
  /\b(ahe|aahot|mala|pahije|nako|kara|kay\s+aahe)\b/i;

export function detectEaiLanguage(text: string): EaiLanguageDetectionResult {
  const raw = (text ?? "").trim();
  const signals: string[] = [];
  if (!raw) {
    return {
      primary: "en",
      isMixed: false,
      confidence: "low",
      signals: ["empty_default_en"],
    };
  }

  const hasDevanagari = DEVANAGARI.test(raw);
  const hasLatin = LATIN_WORD.test(raw);
  const hinglish = HINGLISH.test(raw);
  const marathiLatin = MARATHI_LATIN.test(raw);

  if (hasDevanagari) signals.push("devanagari_script");
  if (hasLatin) signals.push("latin_script");
  if (hinglish) signals.push("hinglish_markers");
  if (marathiLatin) signals.push("marathi_latin_markers");

  // Devanagari-heavy: prefer hi unless Marathi-specific particles appear
  if (hasDevanagari) {
    const marathiHints = /आहे|पाहिजे|करणे|कर्ज|कागदपत्र/.test(raw);
    if (marathiHints) signals.push("marathi_devanagari_hints");
    const primary: EaiLanguageCode = marathiHints ? "mr" : "hi";
    const isMixed = hasLatin || hinglish;
    if (isMixed) {
      return {
        primary,
        secondary: "en",
        isMixed: true,
        confidence: "medium",
        signals: [...signals, "mixed_devanagari_latin"],
      };
    }
    return {
      primary,
      isMixed: false,
      confidence: "high",
      signals,
    };
  }

  if (marathiLatin && !hinglish) {
    return {
      primary: "mr",
      secondary: hasLatin ? "en" : undefined,
      isMixed: Boolean(hasLatin && LATIN_WORD.test(raw.replace(MARATHI_LATIN, ""))),
      confidence: "medium",
      signals,
    };
  }

  if (hinglish) {
    return {
      primary: "hi",
      secondary: "en",
      isMixed: true,
      confidence: "medium",
      signals: [...signals, "mixed_hinglish"],
    };
  }

  return {
    primary: "en",
    isMixed: false,
    confidence: hasLatin ? "high" : "low",
    signals: [...signals, "default_en"],
  };
}
