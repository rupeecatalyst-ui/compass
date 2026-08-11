/**
 * CO-AI-G2-W4 — Triple Comparison Engine.
 * Compares Live SARATHI · Reasoning Model · Gold Standard per customer message.
 * Internal evaluation only — customerIsolated always.
 */

import { EAO_TRIPLE_COMPARISON_VERSION } from "@/types/enterprise-ai-orchestrator/triple-comparison";
import type {
  EaoTripleArmSnapshot,
  EaoTripleComparisonInput,
  EaoTripleComparisonResult,
  EaoTripleComparisonSuiteReport,
} from "@/types/enterprise-ai-orchestrator/triple-comparison";
import type { EaoBenchmarkProductPath } from "@/constants/enterprise-ai-orchestrator/consultant-benchmark";
import { scoreEaoConsultantConversation } from "@/lib/enterprise-ai-orchestrator/benchmark/score";
import { matchEaoGoldStandardTurn } from "./match-gold";

const BANNED =
  /explore your options|feels useful next|i'm listening|share whatever/i;
const INVENTED =
  /(?:₹\s*)?\d{1,3}(?:,\d{2,3})+(?:\.\d+)?\s*(?:emi|interest)|\b\d{1,2}(?:\.\d+)?\s*%\s*(?:p\.?a\.?|interest|roi)\b|\bguaranteed\b|\bapproved\b/i;

function detectProduct(utterance: string): EaoBenchmarkProductPath {
  const u = utterance.toLowerCase();
  if (/balance transfer|\bbt\b/.test(u)) return "balance_transfer";
  if (/loan against property|\blap\b/.test(u)) return "lap";
  if (/working capital/.test(u)) return "working_capital";
  if (/business loan|proprietorship|partnership/.test(u)) return "business_loan";
  if (/personal loan/.test(u)) return "personal_loan";
  if (/home loan|first home|buy.*(home|flat|house)/.test(u)) return "home_loan";
  return "general";
}

function scoreFacing(
  customerUtterance: string,
  facingText: string,
  productPath: EaoBenchmarkProductPath,
): number {
  return scoreEaoConsultantConversation({
    conversationId: `triple_tmp_${crypto.randomUUID()}`,
    productPath,
    scenarioLabel: "triple-arm",
    source: "fixture",
    turns: [
      {
        turnIndex: 0,
        customerUtterance,
        assistantFacingText: facingText,
      },
    ],
  }).overallScore;
}

function lexicalOverlap(a: string, b: string): number {
  const ta = new Set(
    a
      .toLowerCase()
      .split(/[^a-z0-9\u0900-\u097f]+/i)
      .filter((t) => t.length > 2),
  );
  const tb = new Set(
    b
      .toLowerCase()
      .split(/[^a-z0-9\u0900-\u097f]+/i)
      .filter((t) => t.length > 2),
  );
  if (ta.size === 0 && tb.size === 0) return 1;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function analyseArm(input: {
  armId: EaoTripleArmSnapshot["armId"];
  label: string;
  facingText: string;
  customerUtterance: string;
  productPath: EaoBenchmarkProductPath;
  goldText: string | null;
  goldScore: number | null;
}): EaoTripleArmSnapshot {
  const score = scoreFacing(
    input.customerUtterance,
    input.facingText,
    input.productPath,
  );
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (input.facingText.trim().length >= 60) {
    strengths.push("Substantive reply length");
  } else {
    weaknesses.push("Reply may be too brief for consultation depth");
  }
  if (!BANNED.test(input.facingText)) {
    strengths.push("Avoids banned generic chatbot phrasing");
  } else {
    weaknesses.push("Contains banned generic phrasing");
  }
  if (!INVENTED.test(input.facingText)) {
    strengths.push("No invented EMI/rate/approval claims detected");
  } else {
    weaknesses.push("Possible invented financial precision or approval claim");
  }
  if (/\?/.test(input.facingText)) {
    strengths.push("Includes a follow-up question");
  } else if (input.armId !== "gold_standard") {
    weaknesses.push("Missing a clear next question");
  }
  if (
    /\?/.test(input.customerUtterance) &&
    input.facingText.trim().length > 40 &&
    /[.!]/.test(input.facingText)
  ) {
    strengths.push("Addresses a direct customer question with substance");
  }

  if (input.goldText) {
    const overlap = lexicalOverlap(input.facingText, input.goldText);
    if (overlap >= 0.25) {
      strengths.push("Meaningful lexical alignment with gold standard");
    } else if (input.armId !== "gold_standard") {
      weaknesses.push("Low lexical alignment with matched gold consultant reply");
    }
  }

  const deviationFromGold =
    input.goldScore == null
      ? 0
      : Math.round(Math.abs(score - input.goldScore) * 10) / 10;

  let recommendation = "Maintain current consultant posture.";
  if (weaknesses.some((w) => /invented|approval/i.test(w))) {
    recommendation =
      "Remove invented figures/approvals; qualify with profile and lender dependency.";
  } else if (weaknesses.some((w) => /generic/i.test(w))) {
    recommendation =
      "Replace generic chatbot lines with answer-first, case-specific guidance.";
  } else if (weaknesses.some((w) => /next question/i.test(w))) {
    recommendation =
      "Advance with one high-value missing fact question after answering.";
  } else if (weaknesses.some((w) => /alignment/i.test(w))) {
    recommendation =
      "Move closer to gold-standard pacing: acknowledge, answer, then one targeted ask.";
  } else if (score >= 85) {
    recommendation = "Strong consultant pattern — preserve answer-first and safety.";
  }

  return {
    armId: input.armId,
    label: input.label,
    facingText: input.facingText,
    score,
    strengths,
    weaknesses,
    deviationFromGold,
    recommendation,
  };
}

/**
 * Compare Current SARATHI · Reasoning Model · Gold Standard for one customer message.
 */
export function runEaoTripleComparison(
  input: EaoTripleComparisonInput,
): EaoTripleComparisonResult {
  const productPath =
    input.productPath && input.productPath !== "general"
      ? input.productPath
      : detectProduct(input.customerUtterance);

  const goldMatch = matchEaoGoldStandardTurn({
    customerUtterance: input.customerUtterance,
    productPath,
  });

  const goldText = goldMatch?.consultantGoldText ?? null;
  const goldScore = goldText
    ? scoreFacing(
        goldMatch?.customerGoldText ?? input.customerUtterance,
        goldText,
        goldMatch?.productId ?? productPath,
      )
    : null;

  const liveArm = analyseArm({
    armId: "live_sarathi",
    label: "Current SARATHI",
    facingText: input.liveFacingText,
    customerUtterance: input.customerUtterance,
    productPath,
    goldText,
    goldScore,
  });

  const modelArm = analyseArm({
    armId: "reasoning_model",
    label: "Conversational Reasoning Model",
    facingText: input.modelFacingText,
    customerUtterance: input.customerUtterance,
    productPath,
    goldText,
    goldScore,
  });

  const goldArm: EaoTripleArmSnapshot = goldText
    ? analyseArm({
        armId: "gold_standard",
        label: "Gold Standard Consultation",
        facingText: goldText,
        customerUtterance: goldMatch?.customerGoldText ?? input.customerUtterance,
        productPath: goldMatch?.productId ?? productPath,
        goldText,
        goldScore,
      })
    : {
        armId: "gold_standard",
        label: "Gold Standard Consultation",
        facingText: "",
        score: 0,
        strengths: [],
        weaknesses: ["No sufficiently matching gold-standard turn found"],
        deviationFromGold: 0,
        recommendation:
          "Add or refine gold-standard coverage for this customer utterance pattern.",
      };

  // Gold arm deviation from itself is 0 by definition
  goldArm.deviationFromGold = 0;
  if (goldScore != null) goldArm.score = goldScore;

  const arms = [liveArm, modelArm, goldArm];
  const score =
    Math.round(((liveArm.score + modelArm.score) / 2) * 10) / 10;
  const deviation =
    Math.round(
      ((liveArm.deviationFromGold + modelArm.deviationFromGold) / 2) * 10,
    ) / 10;

  const strengths = [
    ...new Set(
      [...liveArm.strengths, ...modelArm.strengths].filter((s) =>
        /answer|safety|banned|substantive|question/i.test(s),
      ),
    ),
  ].slice(0, 5);

  const weaknesses = [
    ...new Set([...liveArm.weaknesses, ...modelArm.weaknesses]),
  ].slice(0, 6);

  let recommendation =
    "Continue shadow evaluation; prefer the arm closer to gold on safety and answer-first behaviour.";
  if (liveArm.score >= modelArm.score + 5 && liveArm.deviationFromGold <= modelArm.deviationFromGold) {
    recommendation =
      "Live SARATHI currently closer to gold — keep live facing; use model for gap analysis only.";
  } else if (modelArm.score >= liveArm.score + 5) {
    recommendation =
      "Reasoning model outperforms live on this turn — candidate insight for future Hybrid (not customer-visible).";
  } else if (deviation >= 20) {
    recommendation =
      "High deviation from gold — review answer-first, banned generics, and inventing numbers.";
  }

  return {
    comparisonId: `eao_triple_${crypto.randomUUID()}`,
    version: EAO_TRIPLE_COMPARISON_VERSION,
    customerUtterance: input.customerUtterance,
    productPath: goldMatch?.productId ?? productPath,
    matchedGold: goldMatch
      ? {
          conversationId: goldMatch.conversationId,
          productLabel: goldMatch.productLabel,
          title: goldMatch.title,
          customerGoldText: goldMatch.customerGoldText,
          consultantGoldText: goldMatch.consultantGoldText,
          matchScore: goldMatch.matchScore,
        }
      : null,
    arms,
    score,
    deviation,
    strengths,
    weaknesses,
    recommendation,
    customerIsolated: true,
    comparedAt: new Date().toISOString(),
  };
}

export function buildEaoTripleComparisonSuite(input: {
  title: string;
  comparisons: EaoTripleComparisonInput[];
}): EaoTripleComparisonSuiteReport {
  const comparisons = input.comparisons.map(runEaoTripleComparison);
  const suiteScore =
    comparisons.length === 0
      ? 0
      : Math.round(
          (comparisons.reduce((s, c) => s + c.score, 0) / comparisons.length) * 10,
        ) / 10;
  const suiteDeviation =
    comparisons.length === 0
      ? 0
      : Math.round(
          (comparisons.reduce((s, c) => s + c.deviation, 0) / comparisons.length) *
            10,
        ) / 10;

  return {
    reportId: `eao_triple_suite_${crypto.randomUUID()}`,
    title: input.title,
    version: EAO_TRIPLE_COMPARISON_VERSION,
    comparisons,
    suiteScore,
    suiteDeviation,
    generatedAt: new Date().toISOString(),
    customerIsolated: true,
  };
}
