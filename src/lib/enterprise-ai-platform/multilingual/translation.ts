/**
 * Translation Layer (CO-AI-114).
 * Provider-independent catalogue / phrase map — no vendor MT SDK in platform core.
 * Used to normalize utterances for Domain Boundary + engines (behaviour unchanged).
 */

import {
  EAI_CANONICAL_PHRASE_MAP,
  EAI_RESPONSE_PHRASE_LOCALISATION,
} from "@/constants/enterprise-ai-platform/multilingual";
import type {
  EaiLanguageCode,
  EaiTranslationResult,
} from "@/types/enterprise-ai-multilingual";
import { detectEaiLanguage } from "./detect";

/**
 * Normalize user text toward English tokens Domain Boundary / engines already understand.
 * Does not invent business facts — only appends known catalogue English phrases.
 */
export function translateEaiUtteranceToCanonical(
  text: string,
  sourceHint?: EaiLanguageCode,
): EaiTranslationResult {
  const raw = (text ?? "").trim();
  const detected = detectEaiLanguage(raw);
  const sourceLanguage = sourceHint ?? detected.primary;
  const notes: string[] = [`source:${sourceLanguage}`];
  if (detected.isMixed) notes.push("mixed_language");

  if (!raw) {
    return {
      sourceLanguage,
      targetLanguage: "en",
      originalText: raw,
      translatedText: raw,
      catalogueHit: false,
      notes: [...notes, "empty"],
    };
  }

  if (sourceLanguage === "en" && !detected.isMixed) {
    return {
      sourceLanguage: "en",
      targetLanguage: "en",
      originalText: raw,
      translatedText: raw,
      catalogueHit: false,
      notes: [...notes, "passthrough_en"],
    };
  }

  const extras: string[] = [];
  let hit = false;
  for (const entry of EAI_CANONICAL_PHRASE_MAP) {
    if (entry.pattern.test(raw)) {
      hit = true;
      if (entry.english.trim()) extras.push(entry.english.trim());
      notes.push(`phrase:${entry.english.trim() || "hinglish_noise"}`);
    }
  }

  const translatedText = hit
    ? [raw, ...extras].filter(Boolean).join("\n")
    : raw;

  return {
    sourceLanguage,
    targetLanguage: "en",
    originalText: raw,
    translatedText,
    catalogueHit: hit,
    notes,
  };
}

/**
 * Localise known English facing fragments into the target language.
 * Unknown English remains (behaviour consistency > inventing translations).
 */
export function localiseEaiEnglishFacingText(
  englishText: string,
  targetLanguage: EaiLanguageCode,
): EaiTranslationResult {
  const originalText = (englishText ?? "").trim();
  if (!originalText || targetLanguage === "en") {
    return {
      sourceLanguage: "en",
      targetLanguage,
      originalText,
      translatedText: originalText,
      catalogueHit: false,
      notes: ["passthrough"],
    };
  }

  let text = originalText;
  let hit = false;
  const notes: string[] = [];
  for (const rule of EAI_RESPONSE_PHRASE_LOCALISATION[targetLanguage]) {
    if (rule.from.test(text)) {
      hit = true;
      text = text.replace(rule.from, rule.to);
      notes.push(`localised_phrase:${rule.to}`);
    }
  }

  return {
    sourceLanguage: "en",
    targetLanguage,
    originalText,
    translatedText: text,
    catalogueHit: hit,
    notes: notes.length ? notes : ["no_catalogue_match_kept_english"],
  };
}
