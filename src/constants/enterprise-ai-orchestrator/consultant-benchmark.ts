/**
 * CO-AI-G2-W2 — Consultant Benchmark Engine (evaluation only).
 * Does not modify live SARATHI runtime behaviour.
 */

export const EAO_CONSULTANT_BENCHMARK_VERSION = "1.0.0-g2-w2" as const;

/** Eight frozen benchmark dimensions (PO G2-W2). */
export const EAO_BENCHMARK_DIMENSION_IDS = [
  "intent_understanding",
  "technical_accuracy",
  "consultation_quality",
  "natural_conversation",
  "customer_trust",
  "completeness",
  "best_next_question",
  "business_safety",
] as const;

export type EaoBenchmarkDimensionId = (typeof EAO_BENCHMARK_DIMENSION_IDS)[number];

export const EAO_BENCHMARK_DIMENSION_LABELS: Record<EaoBenchmarkDimensionId, string> = {
  intent_understanding: "Intent Understanding",
  technical_accuracy: "Technical Accuracy",
  consultation_quality: "Consultation Quality",
  natural_conversation: "Natural Conversation",
  customer_trust: "Customer Trust",
  completeness: "Completeness",
  best_next_question: "Best Next Question",
  business_safety: "Business Safety",
};

export type EaoBenchmarkProductPath =
  | "home_loan"
  | "lap"
  | "business_loan"
  | "working_capital"
  | "balance_transfer"
  | "personal_loan"
  | "general";

export const EAO_BENCHMARK_PRODUCT_PATHS: readonly EaoBenchmarkProductPath[] = [
  "home_loan",
  "lap",
  "business_loan",
  "working_capital",
  "balance_transfer",
  "personal_loan",
] as const;
