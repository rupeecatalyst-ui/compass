/**
 * Mixed-language support helpers (CO-AI-114).
 */

import type { EaiLanguageDetectionResult } from "@/types/enterprise-ai-multilingual";
import { detectEaiLanguage } from "./detect";

export function analyzeEaiMixedLanguage(text: string): EaiLanguageDetectionResult {
  return detectEaiLanguage(text);
}

export function isEaiMixedLanguageUtterance(text: string): boolean {
  return detectEaiLanguage(text).isMixed;
}
