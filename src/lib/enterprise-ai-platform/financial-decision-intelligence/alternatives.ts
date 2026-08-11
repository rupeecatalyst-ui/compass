/**
 * FDI Alternative Options Framework (CO-AI-105).
 * Informational alternatives — not product ranking or scored recommendations.
 */

import type { EaiFdiAlternativeOption } from "@/types/enterprise-ai-financial-decision";

function newId(): string {
  return `eai_fdi_alt_${crypto.randomUUID()}`;
}

/**
 * Build non-ranked alternative exploration options.
 * Never sorts products by score or invents pricing.
 */
export function buildEaiFdiAlternatives(input: {
  question: string;
  blocked: boolean;
}): EaiFdiAlternativeOption[] {
  if (input.blocked) return [];

  const q = input.question.toLowerCase();
  const options: EaiFdiAlternativeOption[] = [];

  if (/\bbalance transfer\b|\bbt\b/.test(q)) {
    options.push({
      optionId: newId(),
      label: "Explore Balance Transfer framing",
      description: "Gather outstanding amount and current rate for engines to evaluate.",
      conditionHint: "Requires existing loan details",
      requiresEnterpriseEngineConfirmation: true,
    });
  }

  if (/\bemi\b|\bafford|\breduce/.test(q)) {
    options.push({
      optionId: newId(),
      label: "Explore tenure adjustment framing",
      description: "Discuss tenure trade-offs; engines compute EMI outcomes.",
      requiresEnterpriseEngineConfirmation: true,
    });
    options.push({
      optionId: newId(),
      label: "Explore top-up vs fresh application framing",
      description: "Clarify structure; engines own eligibility.",
      requiresEnterpriseEngineConfirmation: true,
    });
  }

  if (/\blakh|₹|amount|need/.test(q)) {
    options.push({
      optionId: newId(),
      label: "Confirm product family before engine evaluation",
      description: "Home Loan, LAP, Business Loan, or Personal Loan — engines evaluate later.",
      requiresEnterpriseEngineConfirmation: true,
    });
  }

  if (options.length === 0) {
    options.push({
      optionId: newId(),
      label: "Continue with clarifying questions",
      description: "Stay within lending domain; defer calculations to enterprise engines.",
      requiresEnterpriseEngineConfirmation: false,
    });
  }

  return options;
}
