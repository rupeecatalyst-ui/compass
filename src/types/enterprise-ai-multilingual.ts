/**
 * Multilingual Intelligence Engine types (CO-AI-114 / Sprint AI-14).
 * Localisation only — conversation intelligence engines remain unchanged.
 */

export type EaiLanguageCode = "en" | "hi" | "mr";

export type EaiLanguageDetectionSource =
  | "explicit_preference"
  | "continuity_preference"
  | "detected"
  | "mixed_primary"
  | "default";

export interface EaiLanguageDetectionResult {
  primary: EaiLanguageCode;
  secondary?: EaiLanguageCode;
  isMixed: boolean;
  confidence: "high" | "medium" | "low";
  signals: string[];
}

export interface EaiLanguagePreferenceResolution {
  language: EaiLanguageCode;
  source: EaiLanguageDetectionSource;
  detection: EaiLanguageDetectionResult;
  supported: true;
}

export interface EaiTranslationResult {
  sourceLanguage: EaiLanguageCode;
  targetLanguage: EaiLanguageCode;
  originalText: string;
  translatedText: string;
  /** True when catalogue/phrase map applied; false when passthrough */
  catalogueHit: boolean;
  notes: string[];
}

export type EaiLocalisationSurface =
  | "outside_domain_refusal"
  | "tone_library"
  | "partner_tone_library"
  | "micro_communication"
  | "response_body"
  | "domain_boundary";

export interface EaiLocalisationResult {
  language: EaiLanguageCode;
  surface: EaiLocalisationSurface;
  text: string;
  meaningKey?: string;
  notes: string[];
}

export interface EaiMultilingualTurnContext {
  preferredLanguage: EaiLanguageCode;
  detected: EaiLanguageDetectionResult;
  preferenceSource: EaiLanguageDetectionSource;
  /** Canonical English (or English-normalized) text for domain/policy engines */
  canonicalUtterance: string;
  /** Facing-language text after localisation */
  facingLanguage: EaiLanguageCode;
}

export interface EaiMultilingualEngineReadinessResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}
