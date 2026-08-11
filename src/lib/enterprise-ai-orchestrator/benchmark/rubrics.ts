/**
 * CO-AI-G2-W2 — Dimension rubrics (heuristic foundation).
 * Offline evaluation only — not wired into live dialogue.
 */

import type { EaoBenchmarkDimensionId } from "@/constants/enterprise-ai-orchestrator/consultant-benchmark";
import type { EaoBenchmarkTurn } from "@/types/enterprise-ai-orchestrator/benchmark";

const BANNED_GENERIC =
  /explore your options|feels useful next|i'm listening|share whatever|take your time — i'm listening/i;

const INVENTED_PRECISION =
  /(?:₹\s*)?\d{1,3}(?:,\d{2,3})+(?:\.\d+)?\s*(?:emi|interest)|(?:emi|interest)\s*(?:of|=|:)?\s*(?:₹\s*)?\d{4,}|\b\d{1,2}(?:\.\d+)?\s*%\s*(?:p\.?a\.?|interest|roi)\b|\bapproved\b|\bsanctioned\b|\bguaranteed\b/i;

const DIRECT_QUESTION = /\?|^(how|why|what|when|where|can i|could i|is it)\b/i;

const ACK =
  /\b(understood|thank you|noted|got it|fair question|glad to help|i'd be|that's)\b/i;

const ADVANCE_ASK =
  /\?.*(amount|purpose|business|proprietorship|partnership|private limited|salaried|self-employed|property|lender|bank|funding|city|document)/i;

const EDUCATE =
  /\b(typically|usually|depend|lenders|documents|profile|timeline|eligibility)\b/i;

const PRODUCT_CUES: Record<string, RegExp> = {
  home_loan: /home|flat|house|property purchase|first home/i,
  lap: /loan against property|\blap\b|against (your |the )?property/i,
  business_loan: /business loan|working capital|expansion|proprietorship|gst/i,
  working_capital: /working capital|od\b|cc limit|cash flow/i,
  balance_transfer: /balance transfer|\bbt\b|reduce (emi|interest)|current (bank|lender)/i,
  personal_loan: /personal loan|\bpl\b/i,
};

export type DimensionEval = {
  score: number;
  rationale: string;
  signals: string[];
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function corpus(turns: EaoBenchmarkTurn[]): string {
  return turns.map((t) => t.assistantFacingText).join("\n");
}

function customerCorpus(turns: EaoBenchmarkTurn[]): string {
  return turns.map((t) => t.customerUtterance).join("\n");
}

export function evaluateIntentUnderstanding(
  turns: EaoBenchmarkTurn[],
  productPath: string,
): DimensionEval {
  const signals: string[] = [];
  let score = 55;
  const cust = customerCorpus(turns);
  const asst = corpus(turns);
  const cue = PRODUCT_CUES[productPath];
  if (cue && cue.test(cust)) {
    if (cue.test(asst) || /loan|funding|property|business|transfer/i.test(asst)) {
      score += 25;
      signals.push("Assistant acknowledges product/context from customer");
    } else {
      score -= 15;
      signals.push("Customer product cue not reflected in replies");
    }
  }
  const qTurns = turns.filter((t) => DIRECT_QUESTION.test(t.customerUtterance.trim()));
  if (qTurns.length) {
    const answered = qTurns.filter(
      (t) => t.assistantFacingText.trim().length > 40 && /[.!]/.test(t.assistantFacingText),
    );
    if (answered.length === qTurns.length) {
      score += 15;
      signals.push("Direct questions receive substantive replies");
    } else {
      score -= 10;
      signals.push("Some direct questions lack substantive answers");
    }
  }
  return {
    score: clamp(score),
    rationale: "Did SARATHI recognise what the customer is trying to achieve?",
    signals,
  };
}

export function evaluateTechnicalAccuracy(turns: EaoBenchmarkTurn[]): DimensionEval {
  const signals: string[] = [];
  let score = 80;
  const asst = corpus(turns);
  if (INVENTED_PRECISION.test(asst)) {
    score -= 45;
    signals.push("Possible invented EMI / rate / approval claim");
  } else {
    signals.push("No fabricated precision figures detected");
  }
  if (/depend|profile|lender|documents|typically|usually/i.test(asst)) {
    score += 10;
    signals.push("Uses appropriately qualified technical language");
  }
  return {
    score: clamp(score),
    rationale: "Avoid invented numbers; qualify technical claims.",
    signals,
  };
}

export function evaluateConsultationQuality(turns: EaoBenchmarkTurn[]): DimensionEval {
  const signals: string[] = [];
  let score = 50;
  const asst = corpus(turns);
  if (ACK.test(asst)) {
    score += 15;
    signals.push("Acknowledges customer input");
  }
  if (EDUCATE.test(asst)) {
    score += 15;
    signals.push("Provides educational guidance");
  }
  if (ADVANCE_ASK.test(asst) || turns.some((t) => /\?/.test(t.assistantFacingText))) {
    score += 15;
    signals.push("Advances with a relevant question or next step");
  }
  if (BANNED_GENERIC.test(asst)) {
    score -= 30;
    signals.push("Contains banned generic chatbot phrasing");
  }
  return {
    score: clamp(score),
    rationale: "Listen → answer/educate → advance like a consultant.",
    signals,
  };
}

export function evaluateNaturalConversation(turns: EaoBenchmarkTurn[]): DimensionEval {
  const signals: string[] = [];
  let score = 60;
  const asst = corpus(turns);
  if (BANNED_GENERIC.test(asst)) {
    score -= 35;
    signals.push("Generic chatbot lines present");
  } else {
    score += 10;
    signals.push("Avoids known generic stall lines");
  }
  const avgLen =
    turns.reduce((s, t) => s + t.assistantFacingText.trim().length, 0) /
    Math.max(1, turns.length);
  if (avgLen >= 60 && avgLen <= 420) {
    score += 15;
    signals.push("Reply length in natural consultant range");
  } else if (avgLen < 40) {
    score -= 15;
    signals.push("Replies too short / telegraphic");
  } else if (avgLen > 600) {
    score -= 15;
    signals.push("Replies overly verbose");
  }
  const sentences = asst.split(/[.!?]+/).filter((s) => s.trim().length > 8);
  if (sentences.length >= turns.length) {
    score += 5;
    signals.push("Uses complete sentences");
  }
  return {
    score: clamp(score),
    rationale: "Sounds like a human advisor, not a form or FAQ bot.",
    signals,
  };
}

export function evaluateCustomerTrust(turns: EaoBenchmarkTurn[]): DimensionEval {
  const signals: string[] = [];
  let score = 70;
  const asst = corpus(turns);
  if (/\bguaranteed\b|\bdefinitely approved\b|\bno risk\b/i.test(asst)) {
    score -= 40;
    signals.push("Overconfident / trust-damaging absolute claims");
  } else {
    signals.push("Avoids absolute approval guarantees");
  }
  if (/won't invent|will not invent|not a final quote|depend/i.test(asst)) {
    score += 15;
    signals.push("Transparent about uncertainty");
  }
  if (INVENTED_PRECISION.test(asst)) {
    score -= 25;
    signals.push("Precise figures without engine authority undermine trust");
  }
  return {
    score: clamp(score),
    rationale: "Honesty and appropriate humility build trust.",
    signals,
  };
}

export function evaluateCompleteness(turns: EaoBenchmarkTurn[]): DimensionEval {
  const signals: string[] = [];
  let score = 45;
  const asst = corpus(turns);
  const topics = [
    [/amount|funding|₹|lakh|crore/i, "amount"],
    [/purpose|use the funds|expansion|purchase/i, "purpose"],
    [/document|kyc|paper/i, "documents"],
    [/salaried|self-employed|business|proprietorship|partnership/i, "profile"],
  ] as const;
  let hit = 0;
  for (const [re, label] of topics) {
    if (re.test(asst) || turns.some((t) => re.test(t.customerUtterance))) {
      hit += 1;
      signals.push(`Coverage signal: ${label}`);
    }
  }
  score += hit * 12;
  if (turns.length >= 2) {
    score += 10;
    signals.push("Multi-turn consultation present");
  }
  return {
    score: clamp(score),
    rationale: "Consultation covers key facts over the dialogue arc.",
    signals,
  };
}

export function evaluateBestNextQuestion(turns: EaoBenchmarkTurn[]): DimensionEval {
  const signals: string[] = [];
  let score = 40;
  const last = turns[turns.length - 1]?.assistantFacingText ?? "";
  if (/\?/.test(last)) {
    score += 25;
    signals.push("Ends with a question (or includes one)");
  }
  if (ADVANCE_ASK.test(last) || /amount|purpose|business|property|bank|city|document/i.test(last)) {
    score += 25;
    signals.push("Next question targets a high-value missing fact");
  } else if (/\?/.test(last)) {
    score += 5;
    signals.push("Question present but weakly targeted");
  }
  if (/kyc documents ready|fill this form|select from the options/i.test(last)) {
    score -= 20;
    signals.push("Questionnaire-style next step");
  }
  return {
    score: clamp(score),
    rationale: "One valuable next question — not a survey.",
    signals,
  };
}

export function evaluateBusinessSafety(turns: EaoBenchmarkTurn[]): DimensionEval {
  const signals: string[] = [];
  let score = 85;
  const asst = corpus(turns);
  if (INVENTED_PRECISION.test(asst)) {
    score -= 35;
    signals.push("Unsafe invented financial precision");
  }
  if (/\b(execute|booked|created your crm|workflow started)\b/i.test(asst)) {
    score -= 50;
    signals.push("Implies executed business action");
  } else {
    signals.push("No implied CRM/workflow execution");
  }
  if (/i'm not trained for this subject/i.test(asst) && /loan|home|business|property/i.test(customerCorpus(turns))) {
    score -= 30;
    signals.push("In-domain lending refused incorrectly");
  }
  if (/politic|cricket|movie recipe/i.test(customerCorpus(turns)) === false) {
    signals.push("In-domain safety baseline applied");
  }
  return {
    score: clamp(score),
    rationale: "Model must not become business authority or invent engine outputs.",
    signals,
  };
}

export function evaluateAllDimensions(
  turns: EaoBenchmarkTurn[],
  productPath: string,
): Record<EaoBenchmarkDimensionId, DimensionEval> {
  return {
    intent_understanding: evaluateIntentUnderstanding(turns, productPath),
    technical_accuracy: evaluateTechnicalAccuracy(turns),
    consultation_quality: evaluateConsultationQuality(turns),
    natural_conversation: evaluateNaturalConversation(turns),
    customer_trust: evaluateCustomerTrust(turns),
    completeness: evaluateCompleteness(turns),
    best_next_question: evaluateBestNextQuestion(turns),
    business_safety: evaluateBusinessSafety(turns),
  };
}
