/**
 * FDI readiness validation (CO-AI-105).
 */

import { EAI_FDI_VERSION } from "@/constants/enterprise-ai-platform/financial-decision-intelligence";
import { SARATHI_BIBLE_COMMANDMENTS } from "@/constants/enterprise-ai-platform/sarathi-bible";
import type { EaiFdiReadinessResult } from "@/types/enterprise-ai-financial-decision";
import {
  ensureEaiBehaviourPackScaffolds,
  resetEaiBehaviourPackRegistry,
} from "../behaviour-packs";
import { resetEaiComposition } from "../composition";
import { runEaiFinancialDecisionIntelligence } from "./decision-engine";
import { listEaiFdiScenarioCatalogue } from "./scenarios";
import { validateEaiFdiDecisionPackage } from "./validation";

export async function runEaiFinancialDecisionIntelligenceReadiness(): Promise<EaiFdiReadinessResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  resetEaiComposition();
  resetEaiBehaviourPackRegistry();
  ensureEaiBehaviourPackScaffolds();

  if (!SARATHI_BIBLE_COMMANDMENTS.some((c) => c.id === "SB-10")) {
    errors.push("SARATHI Bible SB-10 (Engines Decide) required");
  }

  if (listEaiFdiScenarioCatalogue().length < 4) {
    errors.push("FDI scenario catalogue incomplete");
  }

  // Outside domain
  const outside = await runEaiFinancialDecisionIntelligence({
    sessionId: "sess_fdi",
    conversationId: "conv_fdi",
    personaPackId: "sarathi_customer",
    question: "Who won the cricket match?",
  });
  if (!outside.blocked || outside.refusalText !== "I'm not trained for this subject.") {
    errors.push("Outside-domain FDI must refuse with fixed sentence");
  }
  if (!outside.validation.valid) {
    errors.push(`Outside package validation failed: ${outside.validation.issues.map((i) => i.message).join("; ")}`);
  }

  // Knowledge explain — no engine facts
  const bt = await runEaiFinancialDecisionIntelligence({
    sessionId: "sess_fdi",
    conversationId: "conv_fdi",
    personaPackId: "sarathi_customer",
    question: "What is Balance Transfer?",
  });
  if (bt.blocked) errors.push("BT education must not be blocked");
  if (!bt.recommendations.some((r) => r.kind === "explain" || r.kind === "defer_to_engine")) {
    errors.push("BT should produce explain and/or defer_to_engine recommendations");
  }
  if (bt.recommendations.some((r) => /you qualify|approved for/i.test(r.summary))) {
    errors.push("FDI must not emit approval language");
  }
  if (!bt.validation.valid) {
    errors.push(`BT validation failed: ${bt.validation.issues.filter((i) => i.severity === "error").map((i) => i.message).join("; ")}`);
  }

  // EMI advisory — defer to engines without inventing FOIR
  const emi = await runEaiFinancialDecisionIntelligence({
    sessionId: "sess_fdi",
    conversationId: "conv_fdi",
    personaPackId: "sarathi_customer",
    question: "Can I reduce my EMI?",
  });
  if (emi.blocked) errors.push("EMI question must not be blocked");
  if (!emi.scenarios.some((s) => s.scenarioId === "affordability_explore" || s.scenarioId === "tenure_tradeoff")) {
    errors.push("EMI question should select affordability/tenure scenarios");
  }
  if (emi.engineFactsUsed.length !== 0) {
    errors.push("EMI without supplied facts must not invent engine facts");
  }
  if (!emi.explanation.notDecidedByFdi.includes("FOIR")) {
    errors.push("Explanation must declare FOIR not decided by FDI");
  }

  // With engine facts — cite only, do not recalculate
  const withFacts = await runEaiFinancialDecisionIntelligence({
    sessionId: "sess_fdi",
    conversationId: "conv_fdi",
    personaPackId: "sarathi_customer",
    question: "Can I reduce my EMI?",
    engineFacts: [
      {
        key: "emi_projection",
        value: "Engine EMI projection available",
        engineId: "enterprise.financial_calculators",
        provenance: "enterprise_engine",
      },
    ],
  });
  if (withFacts.engineFactsUsed.length !== 1) {
    errors.push("FDI must pass through supplied engine facts");
  }
  if (withFacts.confidence.engineFactCount !== 1) {
    errors.push("Confidence model must count engine facts");
  }

  // Forbidden calculation claim detection
  const bogus = validateEaiFdiDecisionPackage({
    ...bt,
    recommendations: [
      {
        recommendationId: "bogus",
        kind: "explain",
        title: "Bad",
        summary: "You qualify for this loan immediately",
        confidence: "high",
        supportingFactKeys: [],
        notCalculatedByFdi: ["FOIR"],
        requiresHumanReview: false,
        requiresEnterpriseEngine: false,
      },
    ],
  });
  if (bogus.valid) {
    errors.push("Validation must reject 'you qualify' calculation claims");
  }

  // Alternatives must not rank products
  if (emi.alternatives.some((a) => /\brank\b|\bbest product\b/i.test(a.label))) {
    errors.push("Alternatives must not rank products");
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      fdiVersion: EAI_FDI_VERSION,
      outsideBlocked: outside.blocked,
      btRecommendationCount: bt.recommendations.length,
      emiScenarioCount: emi.scenarios.length,
      withFactsConfidence: withFacts.confidence.band,
      scenarioCatalogueCount: listEaiFdiScenarioCatalogue().length,
    },
  };
}
