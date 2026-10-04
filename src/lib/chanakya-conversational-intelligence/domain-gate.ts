/**
 * CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * Intent / domain gate before generation. Phase 1 answers only from Catalyst One.
 */

import type { ChanakyaPhase1DomainDecision } from "@/types/chanakya-conversational-intelligence";

function norm(text: string): string {
  return (text || "").trim().toLowerCase().replace(/\s+/g, " ");
}

const PROMPT_INJECTION =
  /\b(ignore (all |any )?(previous|prior|above) (instructions|prompts)|you are now|system prompt|developer message|jailbreak|dan mode|pretend you are (chatgpt|a general)|override (your|the) (rules|guardrails)|reveal (your )?(system|hidden) prompt)\b/;

const WEB_RESEARCH =
  /\b(search the (web|internet)|browse (the )?(web|internet)|google (this|that|it)|look (it )?up online|wikipedia|external research|web research|current weather api)\b/;

const OUT_OF_DOMAIN =
  /\b(weather|forecast|temperature outside|directions to|how do i get to|google maps|traffic on|flight status|cricket score|football score|movie (showtimes|tickets)|netflix|recipe for|write (me )?(python|javascript|java|c\+\+|sql) code|debug this (code|function)|leetcode|capital of|who (won|is the president)|tell me a joke|horoscope|stock ticker(?! in catalyst))\b/;

const CATALYST_ONE_HINT =
  /\b(deal|opportunity|contact|company|lender|document|loan|credit|pipeline|sla|disburs|invoice|accounting|task|activity|dialogue|radar|mission control|applicant|guarantor|co-applicant|proposal|foir|dscr|ltv|gst|itr|emi|cibil|chanakya|catalyst one|rm\b|relationship manager)\b/;

function splitMixed(q: string): { catalyst: string; unsupported: string } | null {
  const parts = q
    .split(/\b(?:and also|as well as|;|\band then\b|\balso\b)/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  const catalyst: string[] = [];
  const unsupported: string[] = [];
  for (const part of parts) {
    const n = norm(part);
    if (OUT_OF_DOMAIN.test(n) && !CATALYST_ONE_HINT.test(n)) unsupported.push(part);
    else if (CATALYST_ONE_HINT.test(n)) catalyst.push(part);
    else if (OUT_OF_DOMAIN.test(n)) unsupported.push(part);
    else catalyst.push(part);
  }
  if (catalyst.length && unsupported.length) {
    return { catalyst: catalyst.join(" "), unsupported: unsupported.join(" ") };
  }
  return null;
}

export function classifyChanakyaPhase1Domain(message: string): ChanakyaPhase1DomainDecision {
  const q = norm(message);
  if (!q) {
    return { kind: "out_of_domain", catalystOnePortion: null, unsupportedPortion: message };
  }
  if (PROMPT_INJECTION.test(q)) {
    return { kind: "prompt_injection", catalystOnePortion: null, unsupportedPortion: message };
  }
  if (WEB_RESEARCH.test(q)) {
    return { kind: "web_research", catalystOnePortion: null, unsupportedPortion: message };
  }

  const mixed = splitMixed(message);
  if (mixed) {
    return {
      kind: "mixed",
      catalystOnePortion: mixed.catalyst,
      unsupportedPortion: mixed.unsupported,
    };
  }

  if (OUT_OF_DOMAIN.test(q) && !CATALYST_ONE_HINT.test(q)) {
    return { kind: "out_of_domain", catalystOnePortion: null, unsupportedPortion: message };
  }

  if (CATALYST_ONE_HINT.test(q) || q.length < 80) {
    return { kind: "catalyst_one", catalystOnePortion: message, unsupportedPortion: null };
  }

  if (OUT_OF_DOMAIN.test(q)) {
    return { kind: "out_of_domain", catalystOnePortion: null, unsupportedPortion: message };
  }

  return { kind: "catalyst_one", catalystOnePortion: message, unsupportedPortion: null };
}

export function isChanakyaPhase1OutOfDomain(kind: ChanakyaPhase1DomainDecision["kind"]): boolean {
  return kind === "out_of_domain" || kind === "prompt_injection" || kind === "web_research";
}
