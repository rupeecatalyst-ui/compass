/**
 * CO-SARATHI-REASONING-001 — Intelligent Consultation Reasoning (experience layer).
 * Silent evaluate → Answer → Acknowledge → Advance.
 * Does not redesign Planner, Policy Gate, UI, or Voice.
 */

import { applyEaiMicroCommunication } from "../domain-governance/micro-communication";
import type { EaiLanguageCode } from "@/types/enterprise-ai-multilingual";
import {
  isBlockedFacingPhrase,
  normaliseFacingLine,
  pickSarathiAcknowledgement,
} from "./ux-flow";
import {
  mergeSarathiConsultationMemory,
  missingConsultationSlots,
  summariseKnownFacts,
  type SarathiConsultationMemory,
  emptySarathiConsultationMemory,
} from "./consultation-memory";

export type SarathiReasoningObjective =
  | "answer"
  | "educate"
  | "clarify"
  | "ask"
  | "recommend";

export type SarathiConsultationReasoningResult = {
  objective: SarathiReasoningObjective;
  customerGoal: string;
  directQuestion: string | null;
  facingText: string;
  memory: SarathiConsultationMemory;
  reasoningNotes: string[];
  validation: { ok: boolean; failures: string[] };
  askedKey?: string | null;
};

const GENERIC_BANNED = [
  "let's explore your options",
  "share whatever feels useful next",
  "take your time — i'm listening",
  "i'm listening",
  "i'm with you",
  "here is a clear next step",
  "preparing your recommendation",
  "let me check a few details",
  "buying a home matters",
];

const CONTEXTUAL_FOLLOW_UP =
  /^(how\??|why\??|what\??|what details\??|okay\.?|ok\.?|yes\.?|no\.?|continue\.?|tell me more\.?|and\??|then\??|sure\.?|hmm\.?|please\.?|go on\.?)$/i;

export function isSarathiContextualFollowUp(utterance: string): boolean {
  const t = utterance.trim();
  if (!t) return false;
  if (CONTEXTUAL_FOLLOW_UP.test(t)) return true;
  if (t.length <= 24 && /^(how|why|what|when|where)\b/i.test(t) && !/\bloan\b/i.test(t)) {
    return true;
  }
  return false;
}

/**
 * Enrich text sent to Domain Boundary without changing the Domain Boundary engine.
 * Keeps natural lending language + short follow-ups inside the consultation.
 */
export function enrichUtteranceForDomainGate(
  utterance: string,
  continuityTexts: string[],
  memory?: SarathiConsultationMemory,
): string {
  const u = utterance.trim();
  const prior = continuityTexts.slice(-4).join(" ");
  const memHint = [
    memory?.loanType,
    memory?.purpose,
    memory?.product !== "general" ? memory?.product.replace(/_/g, " ") : "",
    "loan financing lending consultation",
  ]
    .filter(Boolean)
    .join(" ");

  if (isSarathiContextualFollowUp(u) && (prior || memory?.loanType || memory?.product !== "general")) {
    return `${prior || memHint}\n${u}\n loan process financing consultation follow-up`;
  }

  if (/buy.+(home|house|flat|apartment)|first\s+home|want a flat|need a flat/i.test(u)) {
    return `${u}\n property purchase home loan financing requirement`;
  }

  if (/\bloan\b/i.test(u) && !/politic|cricket|movie|cook|recipe|election/i.test(u)) {
    return `${u}\n loan process financing lending requirement`;
  }

  if (prior && u.length < 80) {
    return `${prior}\n${u}`;
  }

  return prior ? `${prior}\n${u}` : u;
}

function extractDirectQuestion(utterance: string): string | null {
  const t = utterance.trim();
  if (!t) return null;
  if (/\?/.test(t)) return t;
  if (/^(how|why|what|when|where|can i|could i|is it|will i|do i)\b/i.test(t)) return t;
  if (/how\s+fast|how\s+long|how\s+much|timeline|how soon/i.test(t)) return t;
  return null;
}

function answerDirectQuestion(
  question: string,
  mem: SarathiConsultationMemory,
): string {
  const q = question.toLowerCase();
  const product = mem.loanType ?? "loan";

  if (/how\s+fast|how\s+long|how soon|timeline|how many days|turnaround/i.test(q)) {
    return `With complete documents, some ${product.toLowerCase()} cases can move quite quickly, although timelines depend on the lender and your profile.`;
  }
  if (/why\b/.test(q) && /document|salary|kyc|property type|emi|amount/i.test(q + (mem.lastAssistantQuestion ?? ""))) {
    return `Lenders use that detail to assess fit and risk — it helps us guide you accurately rather than guess.`;
  }
  if (/why\b/.test(q)) {
    return `It helps us understand your case clearly so the next guidance stays relevant to you.`;
  }
  if (/what details|what do you need|what (info|information)/i.test(q)) {
    const miss = missingConsultationSlots(mem)[0];
    return miss
      ? `The most useful detail right now is your ${miss.label.toLowerCase()}.`
      : `The basics we usually confirm are loan type, purpose, amount, and your income profile.`;
  }
  if (/emi|instal?lment/i.test(q)) {
    return `EMI depends on amount, tenure, and rate — I can outline ranges once amount and tenure are clearer, without treating any figure as a final quote.`;
  }
  if (/eligib|qualify|approve|sanction/i.test(q)) {
    return `Eligibility depends on income, obligations, credit profile, and lender policy — I won't claim approval, but I can guide what typically matters.`;
  }
  if (/document|paper/i.test(q)) {
    return `Usually KYC, income proofs, and transaction papers apply — the exact list depends on your product and profile.`;
  }
  if (/how\b/.test(q) && mem.lastAssistantQuestion) {
    return `Happy to clarify — for “${mem.lastAssistantQuestion.replace(/\?$/, "")}”, even an approximate answer helps us proceed.`;
  }
  return `That's a fair question — for ${product.toLowerCase()}, the practical answer depends on your documents and profile, and I'll keep guidance specific to your case.`;
}

function acknowledgeLatest(
  utterance: string,
  mem: SarathiConsultationMemory,
  priorAssistant: string[],
): string {
  const t = utterance.trim();
  if (/^(yes|yeah|yep|ok|okay|sure|continue|go on)\.?$/i.test(t)) {
    return pickSarathiAcknowledgement(priorAssistant).replace(/\.+$/, "");
  }
  if (/^(no|nope|not really)\.?$/i.test(t)) {
    return "Understood";
  }
  if (/salaried/i.test(t)) return "Thank you — salaried profile noted";
  if (/self[-\s]?employed|business/i.test(t) && /run|own|operate/i.test(t)) {
    return "Thank you — self-employed context noted";
  }
  if (/hdfc|icici|sbi|axis|kotak/i.test(t)) {
    const bank = t.match(/hdfc|icici|sbi|axis|kotak/i)?.[0];
    return `Noted — ${bank?.toUpperCase()} as current bank`;
  }
  if (/\d+\s*(lakh|lac|crore|cr)/i.test(t)) {
    return `Got it — ${t.match(/\d+\s*(lakh|lac|crore|cr)/i)?.[0]} noted`;
  }
  if (/residential|commercial/i.test(t)) {
    return `Understood — ${/commercial/i.test(t) ? "commercial" : "residential"} property`;
  }
  if (/expans/i.test(t)) return "Understood — funds for business expansion";
  if (/first\s+home|buy/i.test(t)) return "I'd be glad to help with your home purchase";
  if (mem.loanType && t.length > 20) {
    return pickSarathiAcknowledgement(priorAssistant).replace(/\.+$/, "");
  }
  return pickSarathiAcknowledgement(priorAssistant).replace(/\.+$/, "");
}

function buildAdvance(
  mem: SarathiConsultationMemory,
  plannerQuestion: string | null,
  advising: boolean,
): { text: string | null; key: string | null; objective: SarathiReasoningObjective } {
  if (advising) {
    const known = summariseKnownFacts(mem);
    return {
      text: known
        ? `Based on ${known}, sensible next steps are preparing documents and reviewing lender fit.`
        : `Based on what you've shared, a practical next step is preparing documents and reviewing lender fit.`,
      key: null,
      objective: "recommend",
    };
  }

  const missing = missingConsultationSlots(mem);
  const next = missing[0];
  if (next) {
    // Prefer our memory-driven question; planner text only if aligned / unused slot
    let q = next.question;
    if (
      plannerQuestion &&
      !mem.askedKeys.includes(next.key) &&
      /amount|purpose|bank|emi|propert|business|salaried|document|fund/i.test(plannerQuestion) &&
      !mem.lastAssistantQuestion?.toLowerCase().includes(plannerQuestion.toLowerCase().slice(0, 20))
    ) {
      // Prefer specific memory question over generic planner KYC loops
      if (!/kyc|document/i.test(plannerQuestion) || next.key === "documents") {
        q = /kyc|document/i.test(plannerQuestion) ? next.question : next.question;
      }
    }
    return { text: q, key: next.key, objective: "ask" };
  }

  if (plannerQuestion && !/kyc documents ready/i.test(plannerQuestion)) {
    return { text: plannerQuestion, key: null, objective: "ask" };
  }

  return {
    text: mem.loanType
      ? `Would you like me to outline what typically happens next for a ${mem.loanType}?`
      : `Would you like me to outline the usual next steps for your case?`,
    key: null,
    objective: "educate",
  };
}

function isGenericFacing(text: string): boolean {
  const n = normaliseFacingLine(text);
  return GENERIC_BANNED.some((g) => n.includes(g)) || isBlockedFacingPhrase(text);
}

function validateFacing(input: {
  facing: string;
  utterance: string;
  hadDirectQuestion: boolean;
  priorAssistant: string[];
}): { ok: boolean; failures: string[] } {
  const failures: string[] = [];
  const n = normaliseFacingLine(input.facing);
  if (!input.facing.trim()) failures.push("empty");
  if (isGenericFacing(input.facing)) failures.push("generic");
  if (input.hadDirectQuestion && !/[.!]/.test(input.facing)) {
    failures.push("no_answer_shape");
  }
  if (input.priorAssistant.some((p) => normaliseFacingLine(p) === n)) {
    failures.push("repeat");
  }
  if (input.facing.split(/(?<=[.!?])/).filter((s) => s.trim()).length > 3) {
    failures.push("verbose");
  }
  return { ok: failures.length === 0, failures };
}

function composeOrdered(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

/**
 * Core reasoning: Understand → Answer → Acknowledge → Advance (one primary objective).
 */
export function reasonSarathiConsultationResponse(input: {
  utterance: string;
  priorMemory?: SarathiConsultationMemory;
  priorAssistantTexts: string[];
  keyFacts?: Array<{ key: string; value: string }>;
  plannerQuestion?: string | null;
  seedText?: string;
  advising?: boolean;
  language?: EaiLanguageCode;
}): SarathiConsultationReasoningResult {
  const language = input.language ?? "en";
  const notes: string[] = [];
  const directQuestion = extractDirectQuestion(input.utterance);
  const contextual = isSarathiContextualFollowUp(input.utterance);

  let memory = mergeSarathiConsultationMemory(input.priorMemory, {
    utterance: input.utterance,
    keyFacts: input.keyFacts,
    lastAssistantQuestion: input.priorMemory?.lastAssistantQuestion,
  });

  notes.push(`goal:${memory.loanType ?? memory.product}`);
  if (directQuestion) notes.push("direct_question");
  if (contextual) notes.push("contextual_follow_up");

  const customerGoal =
    memory.customerGoals[memory.customerGoals.length - 1] ??
    memory.loanType ??
    "Understand the customer's financing need";

  let objective: SarathiReasoningObjective = "ask";
  const parts: string[] = [];

  if (directQuestion) {
    objective = "answer";
    parts.push(answerDirectQuestion(directQuestion, memory));
    notes.push("answered_first");
  } else if (contextual && /why/i.test(input.utterance)) {
    objective = "educate";
    parts.push(answerDirectQuestion("why?", memory));
  } else if (contextual && /how|what details|tell me more/i.test(input.utterance)) {
    objective = "clarify";
    parts.push(answerDirectQuestion(input.utterance, memory));
  } else {
    parts.push(acknowledgeLatest(input.utterance, memory, input.priorAssistantTexts));
    notes.push("acknowledged");
  }

  // If we answered a direct question, still briefly acknowledge if they also gave a fact
  if (directQuestion && extractDirectQuestion(input.utterance) !== input.utterance.trim()) {
    // combined question+fact rare
  } else if (!directQuestion && !contextual) {
    // ack already added
  } else if (directQuestion) {
    // skip separate ack to keep micro; advance carries the consultation forward
  }

  const advance = buildAdvance(memory, input.plannerQuestion ?? null, input.advising === true);
  if (!directQuestion && !contextual) {
    objective = advance.objective;
  } else if (advance.text && objective === "answer") {
    // Answer then one advance question — mandatory order
    notes.push("advance_after_answer");
  }

  if (advance.text) {
    // Avoid re-asking same question
    if (
      memory.lastAssistantQuestion &&
      normaliseFacingLine(advance.text) === normaliseFacingLine(memory.lastAssistantQuestion)
    ) {
      const alt = missingConsultationSlots(memory).find((m) => m.key !== advance.key);
      if (alt) {
        parts.push(alt.question);
        memory = {
          ...memory,
          lastAssistantQuestion: alt.question,
          askedKeys: [...memory.askedKeys, alt.key],
        };
      } else if (input.advising) {
        parts.push(advance.text);
      }
    } else {
      parts.push(advance.text);
      if (advance.key) {
        memory = {
          ...memory,
          lastAssistantQuestion: advance.text,
          askedKeys: memory.askedKeys.includes(advance.key)
            ? memory.askedKeys
            : [...memory.askedKeys, advance.key],
        };
      } else {
        memory = { ...memory, lastAssistantQuestion: advance.text };
      }
    }
  }

  let facing = applyEaiMicroCommunication(composeOrdered(parts), language).text;
  let validation = validateFacing({
    facing,
    utterance: input.utterance,
    hadDirectQuestion: Boolean(directQuestion),
    priorAssistant: input.priorAssistantTexts,
  });

  // Self-validation regenerate once
  if (!validation.ok) {
    notes.push(`regen:${validation.failures.join(",")}`);
    const safeAnswer = directQuestion
      ? answerDirectQuestion(directQuestion, memory)
      : acknowledgeLatest(input.utterance, memory, input.priorAssistantTexts);
    const miss = missingConsultationSlots(memory)[0];
    const regen = composeOrdered([
      safeAnswer,
      miss?.question ??
        (memory.loanType
          ? `What else would help me guide your ${memory.loanType} more precisely?`
          : "What matters most for you in this loan — speed, amount, or simplicity?"),
    ]);
    facing = applyEaiMicroCommunication(regen, language).text;
    validation = validateFacing({
      facing,
      utterance: input.utterance,
      hadDirectQuestion: Boolean(directQuestion),
      priorAssistant: input.priorAssistantTexts,
    });
    if (miss) {
      memory = {
        ...memory,
        lastAssistantQuestion: miss.question,
        askedKeys: memory.askedKeys.includes(miss.key)
          ? memory.askedKeys
          : [...memory.askedKeys, miss.key],
      };
    }
  }

  // Strip residual generics
  if (isGenericFacing(facing)) {
    const known = summariseKnownFacts(memory);
    facing = applyEaiMicroCommunication(
      known
        ? `Thanks — I have ${known}. What would you like to clarify next?`
        : `Thanks for sharing that. What would you like to focus on next for this loan?`,
      language,
    ).text;
  }

  return {
    objective,
    customerGoal,
    directQuestion,
    facingText: facing,
    memory,
    reasoningNotes: notes,
    validation,
    askedKey: advance.key,
  };
}

export { emptySarathiConsultationMemory };
