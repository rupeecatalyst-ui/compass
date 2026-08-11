/**
 * Language preference resolution (CO-AI-114).
 */

import {
  isEaiLanguageSupported,
} from "@/constants/enterprise-ai-platform/multilingual";
import type {
  EaiLanguageCode,
  EaiLanguagePreferenceResolution,
} from "@/types/enterprise-ai-multilingual";
import { detectEaiLanguage } from "./detect";

export function resolveEaiLanguagePreference(input: {
  utterance: string;
  explicitPreference?: string | null;
  continuityPreference?: string | null;
}): EaiLanguagePreferenceResolution {
  const detection = detectEaiLanguage(input.utterance);

  if (isEaiLanguageSupported(input.explicitPreference)) {
    return {
      language: input.explicitPreference,
      source: "explicit_preference",
      detection,
      supported: true,
    };
  }

  if (isEaiLanguageSupported(input.continuityPreference)) {
    return {
      language: input.continuityPreference,
      source: "continuity_preference",
      detection,
      supported: true,
    };
  }

  if (detection.isMixed) {
    return {
      language: detection.primary,
      source: "mixed_primary",
      detection,
      supported: true,
    };
  }

  if (detection.confidence !== "low") {
    return {
      language: detection.primary,
      source: "detected",
      detection,
      supported: true,
    };
  }

  return {
    language: "en",
    source: "default",
    detection,
    supported: true,
  };
}

export function coerceEaiLanguageCode(
  code: string | undefined | null,
  fallback: EaiLanguageCode = "en",
): EaiLanguageCode {
  return isEaiLanguageSupported(code) ? code : fallback;
}
