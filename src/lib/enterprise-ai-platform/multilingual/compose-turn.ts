/**
 * Multilingual turn context composer (CO-AI-114).
 */

import type { EaiMultilingualTurnContext } from "@/types/enterprise-ai-multilingual";
import { resolveEaiLanguagePreference } from "./preference";
import { translateEaiUtteranceToCanonical } from "./translation";

export function buildEaiMultilingualTurnContext(input: {
  utterance: string;
  explicitPreference?: string | null;
  continuityPreference?: string | null;
}): EaiMultilingualTurnContext {
  const preference = resolveEaiLanguagePreference({
    utterance: input.utterance,
    explicitPreference: input.explicitPreference,
    continuityPreference: input.continuityPreference,
  });

  const canonical = translateEaiUtteranceToCanonical(
    input.utterance,
    preference.detection.primary,
  );

  return {
    preferredLanguage: preference.language,
    detected: preference.detection,
    preferenceSource: preference.source,
    canonicalUtterance: canonical.translatedText || input.utterance,
    facingLanguage: preference.language,
  };
}
