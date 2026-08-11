/**
 * CO-AI-G2-W5 — Context Quality Analyzer (offline).
 * Evaluates Enterprise Context Packages — no runtime modifications.
 */

import type { EaoBenchmarkProductPath } from "@/constants/enterprise-ai-orchestrator/consultant-benchmark";
import type {
  EaoEnterpriseContextContract,
  EaoProvenancedFact,
} from "@/types/enterprise-ai-orchestrator/contracts";
import {
  EAO_CONTEXT_QUALITY_DIMENSION_IDS,
  EAO_CONTEXT_QUALITY_DIMENSION_LABELS,
  EAO_CONTEXT_QUALITY_VERSION,
  type EaoContextQualityDimensionScore,
  type EaoContextQualityInput,
  type EaoContextQualityReport,
  type EaoContextQualitySuiteReport,
} from "@/types/enterprise-ai-orchestrator/context-quality";

const DEFAULT_BUDGET = 12_000;

const EXPECTED_KEYS: Record<string, string[]> = {
  home_loan: ["product", "loan_type", "purpose", "funding_amount", "employment", "location"],
  balance_transfer: [
    "product",
    "loan_type",
    "existing_lender",
    "existing_loan",
    "funding_amount",
  ],
  lap: ["product", "loan_type", "property_type", "purpose", "funding_amount"],
  business_loan: ["product", "loan_type", "business_type", "purpose", "funding_amount"],
  working_capital: ["product", "loan_type", "business_type", "purpose", "funding_amount"],
  personal_loan: ["product", "loan_type", "purpose", "funding_amount", "employment"],
  general: ["product", "loan_type", "purpose"],
};

const IRRELEVANT_KEY =
  /cricket|politics|movie|horoscope|astrology|recipe|gossip|unrelated_marketing/i;

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function grade(overall: number): EaoContextQualityReport["grade"] {
  if (overall >= 85) return "A";
  if (overall >= 75) return "B";
  if (overall >= 65) return "C";
  if (overall >= 50) return "D";
  return "F";
}

function allFacts(ctx: EaoEnterpriseContextContract): EaoProvenancedFact[] {
  return [
    ...ctx.customerFacts,
    ...ctx.opportunityFacts,
    ...ctx.dealFacts,
    ...ctx.productFacts,
    ...ctx.policyHints,
  ];
}

function factKeySet(facts: EaoProvenancedFact[]): Set<string> {
  return new Set(facts.map((f) => f.key.toLowerCase()));
}

function estimatePromptChars(ctx: EaoEnterpriseContextContract): number {
  return JSON.stringify(ctx).length;
}

function detectProduct(
  utterance: string | undefined,
  path?: EaoBenchmarkProductPath,
): EaoBenchmarkProductPath {
  if (path && path !== "general") return path;
  const u = (utterance ?? "").toLowerCase();
  if (/balance transfer|\bbt\b/.test(u)) return "balance_transfer";
  if (/loan against property|\blap\b/.test(u)) return "lap";
  if (/working capital/.test(u)) return "working_capital";
  if (/business loan/.test(u)) return "business_loan";
  if (/personal loan/.test(u)) return "personal_loan";
  if (/home loan|first home|buy.*(flat|home|house)/.test(u)) return "home_loan";
  return "general";
}

function scoreMissing(
  facts: EaoProvenancedFact[],
  productPath: EaoBenchmarkProductPath,
  readinessMissing: number,
): EaoContextQualityDimensionScore {
  const expected = EXPECTED_KEYS[productPath] ?? EXPECTED_KEYS.general;
  const keys = factKeySet(facts);
  const missing = expected.filter((k) => !keys.has(k) && ![...keys].some((x) => x.includes(k)));
  const coverage = expected.length === 0 ? 1 : (expected.length - missing.length) / expected.length;
  let score = coverage * 85;
  if (readinessMissing > 0) score -= Math.min(25, readinessMissing * 5);
  if (facts.length === 0) score = Math.min(score, 25);
  const findings: string[] = [];
  const optimizations: string[] = [];
  if (missing.length) {
    findings.push(`Missing expected keys for ${productPath}: ${missing.join(", ")}`);
    optimizations.push(
      `Enrich context pack with ${missing.slice(0, 4).join(", ")} from registries/CRE before model call`,
    );
  } else {
    findings.push("Core expected keys present for product path");
  }
  if (readinessMissing > 0) {
    findings.push(`CRE reports ${readinessMissing} missing information slots`);
    optimizations.push("Surface CRE missing slots into Context Pack gaps explicitly");
  }
  return {
    dimensionId: "missing_context",
    label: EAO_CONTEXT_QUALITY_DIMENSION_LABELS.missing_context,
    score: clamp(score),
    findings,
    optimizations,
  };
}

function scoreIrrelevant(
  facts: EaoProvenancedFact[],
  utterance?: string,
): EaoContextQualityDimensionScore {
  const findings: string[] = [];
  const optimizations: string[] = [];
  let irrelevant = 0;
  for (const f of facts) {
    const blob = `${f.key} ${String(f.value ?? "")}`;
    if (IRRELEVANT_KEY.test(blob) || f.provenance === "model_inference_untrusted") {
      irrelevant += 1;
    }
  }
  // Weak utterance relevance: keys that never appear in utterance tokens when utterance exists
  if (utterance && utterance.trim().length > 8 && facts.length > 0) {
    const u = utterance.toLowerCase();
    const lendingCue = /loan|home|property|business|emi|transfer|funding|document/i.test(u);
    for (const f of facts) {
      if (
        lendingCue &&
        /zodiac|celebrity|ipl|election/i.test(`${f.key} ${String(f.value ?? "")}`)
      ) {
        irrelevant += 1;
      }
    }
  }
  const ratio = facts.length === 0 ? 0 : irrelevant / facts.length;
  const score = clamp(100 - ratio * 100 - (irrelevant > 0 ? 5 : 0));
  if (irrelevant > 0) {
    findings.push(`${irrelevant} fact(s) flagged as irrelevant or untrusted inference`);
    optimizations.push(
      "Filter model_inference_untrusted and non-lending noise before packaging context",
    );
  } else {
    findings.push("No obvious irrelevant / untrusted noise detected");
  }
  return {
    dimensionId: "irrelevant_context",
    label: EAO_CONTEXT_QUALITY_DIMENSION_LABELS.irrelevant_context,
    score,
    findings,
    optimizations,
  };
}

function scorePromptSize(
  estimatedPromptChars: number,
  budget: number,
): EaoContextQualityDimensionScore {
  const findings: string[] = [];
  const optimizations: string[] = [];
  const ratio = estimatedPromptChars / Math.max(1, budget);
  let score = 100;
  if (ratio <= 0.15) {
    score = 55;
    findings.push("Prompt/context payload may be too sparse");
    optimizations.push("Ensure minimum product + purpose + amount facts when known");
  } else if (ratio <= 0.85) {
    score = 95;
    findings.push(
      `Estimated size ${estimatedPromptChars} chars within budget ${budget}`,
    );
  } else if (ratio <= 1.15) {
    score = 70;
    findings.push("Approaching prompt size budget");
    optimizations.push("Deduplicate facts and drop low-value policy hints");
  } else {
    score = 35;
    findings.push(
      `Over budget: ${estimatedPromptChars} chars vs ${budget} (ratio ${ratio.toFixed(2)})`,
    );
    optimizations.push(
      "Cap history, compress readiness, and keep only high-provenance facts",
    );
  }
  return {
    dimensionId: "prompt_size",
    label: EAO_CONTEXT_QUALITY_DIMENSION_LABELS.prompt_size,
    score: clamp(score),
    findings,
    optimizations,
  };
}

function scoreRetrieval(facts: EaoProvenancedFact[]): EaoContextQualityDimensionScore {
  const findings: string[] = [];
  const optimizations: string[] = [];
  const withSource = facts.filter((f) => Boolean(f.sourceId)).length;
  const registryOrEngine = facts.filter(
    (f) =>
      f.provenance === "enterprise_registry" || f.provenance === "enterprise_engine",
  ).length;
  const total = facts.length;
  let score = 40;
  if (total === 0) {
    findings.push("No retrieved facts in pack");
    optimizations.push("Wire Read Connectors into Context Pack assembly");
  } else {
    score = 50 + (withSource / total) * 25 + (registryOrEngine / total) * 25;
    findings.push(
      `${withSource}/${total} facts have sourceId; ${registryOrEngine}/${total} from registry/engine`,
    );
    if (withSource / total < 0.5) {
      optimizations.push("Require sourceId on registry/engine facts for retrieval traceability");
    }
  }
  return {
    dimensionId: "retrieval_quality",
    label: EAO_CONTEXT_QUALITY_DIMENSION_LABELS.retrieval_quality,
    score: clamp(score),
    findings,
    optimizations,
  };
}

function scoreKnowledge(facts: EaoProvenancedFact[]): EaoContextQualityDimensionScore {
  const findings: string[] = [];
  const optimizations: string[] = [];
  const total = facts.length;
  const trusted = facts.filter(
    (f) =>
      f.provenance === "enterprise_registry" ||
      f.provenance === "enterprise_engine" ||
      f.provenance === "consultation_readiness" ||
      f.provenance === "user_utterance",
  ).length;
  const untrusted = facts.filter((f) => f.provenance === "model_inference_untrusted").length;
  const score = total === 0 ? 30 : 40 + (trusted / Math.max(1, total)) * 55 - untrusted * 10;
  if (untrusted > 0) {
    findings.push(`${untrusted} untrusted model-inferred facts in pack`);
    optimizations.push("Never promote model inferences into authoritative context fields");
  } else {
    findings.push("Knowledge facts use trusted provenance classes");
  }
  if (facts.some((f) => f.advisoryOnly)) {
    findings.push("Some facts marked advisoryOnly — good for non-authoritative hints");
  }
  return {
    dimensionId: "knowledge_quality",
    label: EAO_CONTEXT_QUALITY_DIMENSION_LABELS.knowledge_quality,
    score: clamp(score),
    findings,
    optimizations,
  };
}

function scoreFreshness(
  ctx: EaoEnterpriseContextContract,
  facts: EaoProvenancedFact[],
): EaoContextQualityDimensionScore {
  const findings: string[] = [];
  const optimizations: string[] = [];
  const assembled = Date.parse(ctx.assembledAt);
  const now = Date.now();
  let score = 70;
  if (!Number.isFinite(assembled)) {
    score = 40;
    findings.push("assembledAt missing or invalid");
    optimizations.push("Always stamp ISO assembledAt on context packs");
  } else {
    const ageMin = (now - assembled) / 60_000;
    if (ageMin <= 15) {
      score = 95;
      findings.push("Pack assembled within 15 minutes");
    } else if (ageMin <= 60) {
      score = 80;
      findings.push("Pack age under 1 hour");
    } else if (ageMin <= 24 * 60) {
      score = 60;
      findings.push("Pack older than 1 hour — consider refresh on turn");
      optimizations.push("Refresh context pack each turn from live registries");
    } else {
      score = 35;
      findings.push("Stale context pack (>24h)");
      optimizations.push("Invalidate and rebuild stale packs before reasoning");
    }
  }
  const withObserved = facts.filter((f) => f.observedAt).length;
  if (facts.length && withObserved / facts.length < 0.3) {
    score -= 10;
    findings.push("Few facts carry observedAt timestamps");
    optimizations.push("Stamp observedAt on registry/engine facts");
  }
  return {
    dimensionId: "context_freshness",
    label: EAO_CONTEXT_QUALITY_DIMENSION_LABELS.context_freshness,
    score: clamp(score),
    findings,
    optimizations,
  };
}

function scoreMemory(input: EaoContextQualityInput): EaoContextQualityDimensionScore {
  const findings: string[] = [];
  const optimizations: string[] = [];
  const mem = input.memory;
  let score = 55;
  if (!mem) {
    findings.push("No conversation memory attached to evaluation input");
    optimizations.push("Pass EaoEnterpriseMemoryContract into analyzer for fuller scoring");
    score = 50;
  } else {
    const known = mem.knownFacts?.length ?? 0;
    const pending = mem.pendingWriteIntents?.length ?? 0;
    const goals = mem.customerGoals?.length ?? 0;
    score = 40 + Math.min(30, known * 6) + Math.min(15, goals * 5);
    if (pending > 5) {
      score -= 15;
      findings.push("Many pending memory write intents — validation backlog risk");
      optimizations.push("Flush/validate pending memory intents before next turn");
    }
    if (mem.authorityNote !== "consultation_memory_not_crm_ssot") {
      findings.push("Memory authorityNote unexpected");
      optimizations.push("Keep consultation memory distinct from CRM SSOT");
    } else {
      findings.push("Memory correctly marked as non-CRM SSOT");
    }
    findings.push(`knownFacts=${known}, goals=${goals}, pendingWrites=${pending}`);
    if (known === 0) {
      optimizations.push("Persist validated consultation facts into memory across turns");
    }
  }
  // CRE readiness as memory-adjacent signal
  if (input.context.readiness) {
    score += 5;
    findings.push(
      `CRE confidence ${input.context.readiness.consultationConfidence} attached`,
    );
  } else {
    optimizations.push("Attach CRE readiness snapshot into context for gap awareness");
  }
  return {
    dimensionId: "conversation_memory_quality",
    label: EAO_CONTEXT_QUALITY_DIMENSION_LABELS.conversation_memory_quality,
    score: clamp(score),
    findings,
    optimizations,
  };
}

/**
 * Analyze an Enterprise Context Package and produce an optimization report.
 * Does not mutate the input pack.
 */
export function analyzeEaoContextQuality(
  input: EaoContextQualityInput,
): EaoContextQualityReport {
  const ctx = input.context;
  const facts = allFacts(ctx);
  const productPath = detectProduct(input.utterance, input.productPath);
  const budget = input.promptSizeBudgetChars ?? DEFAULT_BUDGET;
  const estimatedPromptChars = estimatePromptChars(ctx);
  const readinessMissing = ctx.readiness?.missingInformation?.length ?? 0;

  const dimensions: EaoContextQualityDimensionScore[] = [
    scoreMissing(facts, productPath, readinessMissing),
    scoreIrrelevant(facts, input.utterance),
    scorePromptSize(estimatedPromptChars, budget),
    scoreRetrieval(facts),
    scoreKnowledge(facts),
    scoreFreshness(ctx, facts),
    scoreMemory(input),
  ];

  // Ensure stable order
  const ordered = EAO_CONTEXT_QUALITY_DIMENSION_IDS.map(
    (id) => dimensions.find((d) => d.dimensionId === id)!,
  );

  const overallScore =
    Math.round(
      (ordered.reduce((s, d) => s + d.score, 0) / ordered.length) * 10,
    ) / 10;

  const optimizations = [
    ...new Set(ordered.flatMap((d) => d.optimizations)),
  ];

  return {
    reportId: `eao_ctxq_${crypto.randomUUID()}`,
    version: EAO_CONTEXT_QUALITY_VERSION,
    packId: ctx.packId,
    label: input.label ?? ctx.packId,
    overallScore,
    grade: grade(overallScore),
    dimensions: ordered,
    optimizations,
    estimatedPromptChars,
    factCounts: {
      customer: ctx.customerFacts.length,
      opportunity: ctx.opportunityFacts.length,
      deal: ctx.dealFacts.length,
      product: ctx.productFacts.length,
      policy: ctx.policyHints.length,
      total: facts.length,
    },
    analyzedAt: new Date().toISOString(),
    runtimeUnmodified: true,
  };
}

export function buildEaoContextQualitySuite(input: {
  title: string;
  items: EaoContextQualityInput[];
}): EaoContextQualitySuiteReport {
  const reports = input.items.map(analyzeEaoContextQuality);
  const suiteOverallScore =
    reports.length === 0
      ? 0
      : Math.round(
          (reports.reduce((s, r) => s + r.overallScore, 0) / reports.length) * 10,
        ) / 10;
  return {
    reportId: `eao_ctxq_suite_${crypto.randomUUID()}`,
    title: input.title,
    version: EAO_CONTEXT_QUALITY_VERSION,
    reports,
    suiteOverallScore,
    generatedAt: new Date().toISOString(),
    runtimeUnmodified: true,
  };
}
