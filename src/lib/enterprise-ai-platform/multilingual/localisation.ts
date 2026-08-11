/**
 * Response / Tone / Micro / Domain Boundary localisation (CO-AI-114).
 */

import {
  EAI_OUTSIDE_DOMAIN_REFUSAL_BY_LANGUAGE,
  EAI_OUTSIDE_DOMAIN_REFUSAL_MEANING_KEY,
  EAI_OUTSIDE_DOMAIN_REFUSAL_VARIANTS,
  EAI_PARTNER_TONE_LIBRARY_LOCALISED,
  EAI_TONE_LIBRARY_LOCALISED,
} from "@/constants/enterprise-ai-platform/multilingual";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import { EAI_PARTNER_TONE_LIBRARY } from "@/constants/enterprise-ai-platform/partner-tone-library";
import { EAI_TONE_LIBRARY } from "@/constants/enterprise-ai-platform/tone-library";
import type { EaiToneAudience } from "@/types/enterprise-ai-wealth-partner-behaviour";
import type { EaiToneCategoryId } from "@/types/enterprise-ai-domain-governance";
import type {
  EaiLanguageCode,
  EaiLocalisationResult,
} from "@/types/enterprise-ai-multilingual";
import { localiseEaiEnglishFacingText } from "./translation";

export function getEaiOutsideDomainRefusalLocalised(
  language: EaiLanguageCode = "en",
): string {
  return EAI_OUTSIDE_DOMAIN_REFUSAL_BY_LANGUAGE[language] ?? EAI_OUTSIDE_DOMAIN_REFUSAL;
}

export function isEaiOutsideDomainRefusalEquivalent(text: string): boolean {
  const raw = (text ?? "").trim();
  if (!raw) return false;
  return EAI_OUTSIDE_DOMAIN_REFUSAL_VARIANTS.some((v) => v === raw);
}

export function localiseEaiOutsideDomainRefusal(
  language: EaiLanguageCode,
): EaiLocalisationResult {
  return {
    language,
    surface: "outside_domain_refusal",
    text: getEaiOutsideDomainRefusalLocalised(language),
    meaningKey: EAI_OUTSIDE_DOMAIN_REFUSAL_MEANING_KEY,
    notes: ["identical_meaning_across_en_hi_mr"],
  };
}

export function localiseEaiToneLines(input: {
  categoryId: EaiToneCategoryId;
  audience: EaiToneAudience;
  language: EaiLanguageCode;
  englishLines: readonly string[];
}): EaiLocalisationResult {
  const { categoryId, audience, language, englishLines } = input;
  if (language === "en") {
    return {
      language,
      surface: audience === "partner" ? "partner_tone_library" : "tone_library",
      text: englishLines.join("\n"),
      notes: ["english_canonical"],
    };
  }

  const catalogue =
    audience === "partner"
      ? EAI_PARTNER_TONE_LIBRARY_LOCALISED[language]
      : EAI_TONE_LIBRARY_LOCALISED[language];
  const local = catalogue[categoryId];
  if (local?.length) {
    return {
      language,
      surface: audience === "partner" ? "partner_tone_library" : "tone_library",
      text: local.join("\n"),
      notes: ["catalogue_hit"],
    };
  }

  return {
    language,
    surface: audience === "partner" ? "partner_tone_library" : "tone_library",
    text: englishLines.join("\n"),
    notes: ["fallback_english_missing_local_catalogue"],
  };
}

/**
 * Micro Communication localisation: preserve refusal variants; shape other text.
 * Shaping for Devanagari uses danda / period splits without inventing content.
 */
export function localiseEaiMicroCommunication(
  text: string,
  language: EaiLanguageCode,
): EaiLocalisationResult {
  const raw = (text ?? "").trim();
  if (isEaiOutsideDomainRefusalEquivalent(raw)) {
    const localised = getEaiOutsideDomainRefusalLocalised(language);
    return {
      language,
      surface: "micro_communication",
      text: localised,
      meaningKey: EAI_OUTSIDE_DOMAIN_REFUSAL_MEANING_KEY,
      notes: ["outside_domain_refusal_preserved"],
    };
  }

  if (language === "en") {
    return {
      language,
      surface: "micro_communication",
      text: raw,
      notes: ["english_passthrough_shaped_elsewhere"],
    };
  }

  const translated = localiseEaiEnglishFacingText(raw, language);
  let shaped = translated.translatedText;
  const danda = "\u0964";
  if (shaped.includes(danda)) {
    shaped = shaped
      .split(danda)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => {
        if (s.endsWith(".") || s.endsWith(danda)) return s;
        return `${s}${danda}`;
      })
      .join("\n");
  }

  return {
    language,
    surface: "micro_communication",
    text: shaped,
    notes: translated.notes,
  };
}

export function localiseEaiResponseFacingText(input: {
  englishFacingText: string;
  language: EaiLanguageCode;
  audience?: EaiToneAudience;
}): EaiLocalisationResult {
  const raw = (input.englishFacingText ?? "").trim();
  const audience = input.audience ?? "customer";

  if (isEaiOutsideDomainRefusalEquivalent(raw) || raw === EAI_OUTSIDE_DOMAIN_REFUSAL) {
    return localiseEaiOutsideDomainRefusal(input.language);
  }

  if (input.language === "en") {
    return {
      language: "en",
      surface: "response_body",
      text: raw,
      notes: ["english_canonical"],
    };
  }

  let text = raw;
  const notes: string[] = ["response_localisation"];
  const library = audience === "partner" ? EAI_PARTNER_TONE_LIBRARY : EAI_TONE_LIBRARY;
  const localCatalogue =
    audience === "partner"
      ? EAI_PARTNER_TONE_LIBRARY_LOCALISED[input.language]
      : EAI_TONE_LIBRARY_LOCALISED[input.language];

  for (const entry of library) {
    const localLines = localCatalogue[entry.categoryId];
    if (!localLines?.length) continue;
    for (let i = 0; i < entry.lines.length; i += 1) {
      const enLine = entry.lines[i];
      const localLine = localLines[i] ?? localLines[0];
      if (!enLine || !localLine) continue;
      if (text.includes(enLine)) {
        text = text.split(enLine).join(localLine);
        notes.push(`tone:${entry.categoryId}`);
      }
    }
  }

  const phrases = localiseEaiEnglishFacingText(text, input.language);
  text = phrases.translatedText;
  notes.push(...phrases.notes);

  const micro = localiseEaiMicroCommunication(text, input.language);
  return {
    language: input.language,
    surface: "response_body",
    text: micro.text,
    meaningKey: micro.meaningKey,
    notes: [...notes, ...micro.notes],
  };
}
