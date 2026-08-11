/**
 * FDI Explainability Engine (CO-AI-105).
 * Explains reasoning sources — never invents calculation results.
 */

import type { EaiContextPackage } from "@/types/enterprise-ai-context-intelligence";
import type {
  EaiFdiEngineFact,
  EaiFdiExplanation,
} from "@/types/enterprise-ai-financial-decision";

function newId(): string {
  return `eai_fdi_exp_${crypto.randomUUID()}`;
}

export function buildEaiFdiExplanation(input: {
  question: string;
  contextPackage?: EaiContextPackage;
  engineFacts: EaiFdiEngineFact[];
  blocked: boolean;
}): EaiFdiExplanation {
  const considered: string[] = [];
  const narrativeLines: string[] = [];

  if (input.blocked) {
    return {
      explanationId: newId(),
      questionSummary: input.question.slice(0, 160),
      considered: [],
      notDecidedByFdi: [
        "eligibility",
        "credit_approval",
        "FOIR",
        "DBR",
        "pricing",
        "lender_policy",
      ],
      narrativeLines: [
        "This request is outside SARATHI's financial domain.",
        "Financial Decision Intelligence did not reason on it.",
      ],
      engineOwnershipNotes: [
        "Enterprise engines remain the only calculators when domain allows.",
      ],
    };
  }

  for (const domain of input.contextPackage?.domainsIncluded ?? []) {
    considered.push(`context_domain:${domain}`);
  }
  for (const fact of input.engineFacts) {
    considered.push(`engine_fact:${fact.key}@${fact.engineId}`);
  }

  narrativeLines.push("FDI reviewed available context projections.");
  if (input.engineFacts.length === 0) {
    narrativeLines.push("No enterprise engine results were supplied.");
    narrativeLines.push("FDI can explain concepts and ask clarifying questions only.");
  } else {
    narrativeLines.push(
      `FDI cited ${input.engineFacts.length} engine-supplied fact(s) without recalculating them.`,
    );
  }
  narrativeLines.push("Eligibility, FOIR, DBR, pricing, and approvals stay with enterprise engines.");

  return {
    explanationId: newId(),
    questionSummary: input.question.slice(0, 160),
    considered,
    notDecidedByFdi: [
      "eligibility",
      "credit_approval",
      "FOIR",
      "DBR",
      "pricing",
      "lender_policy",
      "product_ranking",
    ],
    narrativeLines,
    engineOwnershipNotes: [
      "SB-10: Engines decide. FDI explains.",
      "Any numeric decision must originate from an enterprise engine fact.",
    ],
  };
}
