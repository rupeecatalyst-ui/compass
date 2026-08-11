/**
 * Multilingual Intelligence Engine barrel (CO-AI-114).
 */

export { buildEaiMultilingualTurnContext } from "./compose-turn";
export { detectEaiLanguage } from "./detect";
export {
  getEaiOutsideDomainRefusalLocalised,
  isEaiOutsideDomainRefusalEquivalent,
  localiseEaiMicroCommunication,
  localiseEaiOutsideDomainRefusal,
  localiseEaiResponseFacingText,
  localiseEaiToneLines,
} from "./localisation";
export {
  analyzeEaiMixedLanguage,
  isEaiMixedLanguageUtterance,
} from "./mixed-language";
export {
  coerceEaiLanguageCode,
  resolveEaiLanguagePreference,
} from "./preference";
export { runEaiMultilingualEngineReadiness } from "./readiness";
export {
  localiseEaiEnglishFacingText,
  translateEaiUtteranceToCanonical,
} from "./translation";
