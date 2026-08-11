/**
 * Outside-domain refusal (CO-AI-104 DIE + CO-AI-114 localisation).
 * Canonical English SSOT unchanged. Facing text may be localised with identical meaning.
 */

import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type { EaiLanguageCode } from "@/types/enterprise-ai-multilingual";
import { getEaiOutsideDomainRefusalLocalised } from "../multilingual/localisation";

/**
 * Outside / unknown domain — English canonical (policy / audit SSOT).
 * Signature retained for callers; outcome is intentionally ignored.
 */
export function buildEaiSafeRefusal(_unused?: {
  outcome?: string;
  matchedOutside?: string[];
}): string {
  void _unused;
  return EAI_OUTSIDE_DOMAIN_REFUSAL;
}

export function getEaiOutsideDomainRefusal(
  language: EaiLanguageCode = "en",
): string {
  return getEaiOutsideDomainRefusalLocalised(language);
}
