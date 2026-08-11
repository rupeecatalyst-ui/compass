/**
 * FDI Financial Scenario Framework (CO-AI-105).
 * Scenario templates only — FDI never fills calculated values.
 */

import { EAI_FDI_SCENARIO_CATALOGUE } from "@/constants/enterprise-ai-platform/financial-decision-intelligence";
import type { EaiFdiScenario } from "@/types/enterprise-ai-financial-decision";

/**
 * Select relevant scenario templates for the question.
 * Does not compute scenario outcomes.
 */
export function selectEaiFdiScenarios(question: string, blocked: boolean): EaiFdiScenario[] {
  if (blocked) return [];

  const q = question.toLowerCase();
  const selected: EaiFdiScenario[] = [];

  for (const scenario of EAI_FDI_SCENARIO_CATALOGUE) {
    if (
      scenario.scenarioId === "balance_transfer_explore" &&
      /\bbalance transfer\b|\bbt\b/.test(q)
    ) {
      selected.push(scenario);
    }
    if (
      scenario.scenarioId === "affordability_explore" &&
      /\bemi\b|\bafford|\bfoir|\bdbr/.test(q)
    ) {
      selected.push(scenario);
    }
    if (scenario.scenarioId === "tenure_tradeoff" && /\btenure\b|\bemi\b/.test(q)) {
      selected.push(scenario);
    }
    if (scenario.scenarioId === "top_up_explore" && /\btop[\s-]?up\b/.test(q)) {
      selected.push(scenario);
    }
    if (
      scenario.scenarioId === "documentation_gap" &&
      /\bdocument|kyc|paper/.test(q)
    ) {
      selected.push(scenario);
    }
  }

  if (selected.length === 0 && /\bloan|lend|borrow|emi|mortgage/.test(q)) {
    const affordability = EAI_FDI_SCENARIO_CATALOGUE.find(
      (s) => s.scenarioId === "affordability_explore",
    );
    if (affordability) selected.push(affordability);
  }

  return selected;
}

export function listEaiFdiScenarioCatalogue(): EaiFdiScenario[] {
  return [...EAI_FDI_SCENARIO_CATALOGUE];
}
