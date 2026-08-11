/**
 * SARATHI intent classification (CO-AI-104A) — platform heuristic, not LLM.
 */

import type {
  EaiDomainMatchHit,
  EaiSarathiIntentClass,
} from "@/types/enterprise-ai-domain-governance";

/**
 * Classify conversational intent for domain-gated SARATHI requests.
 */
export function classifyEaiSarathiIntent(
  utterance: string,
  matchedTopics: EaiDomainMatchHit[] = [],
): EaiSarathiIntentClass {
  const text = utterance.trim();
  if (!text) return "unsupported";

  const hasOutsideOnly =
    matchedTopics.length > 0 &&
    matchedTopics.every((h) => h.zone === "zone_3_outside");
  if (hasOutsideOnly) return "unsupported";

  if (
    /\b(what is|what's|explain|meaning of|define|tell me about)\b/i.test(text) ||
    /\bhow does\b.*\bwork\b/i.test(text)
  ) {
    return "knowledge";
  }

  if (
    /\b(should i|can i|recommend|advise|better to|is it wise|worth it)\b/i.test(text) ||
    /\b(reduce my emi|afford)\b/i.test(text)
  ) {
    return "advisory";
  }

  if (
    /\b(i need|looking for|find|compare|which product|options for|₹|rs\.?|lakh|crore)\b/i.test(
      text,
    )
  ) {
    return "discovery";
  }

  if (
    /\b(status|stage|upload|document|next step|workflow|create lead|opportunity|callback|assign)\b/i.test(
      text,
    )
  ) {
    return "workflow";
  }

  if (matchedTopics.some((h) => h.zone === "zone_1_core" || h.zone === "zone_2_adjacent")) {
    return "knowledge";
  }

  return "unsupported";
}
