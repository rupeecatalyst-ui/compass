/**
 * CO-AI-G2-W5 — Context Quality Analyzer types.
 * Optimization reports only — no runtime modifications.
 */

import type {
  EaoEnterpriseContextContract,
  EaoEnterpriseMemoryContract,
  EaoProvenancedFact,
} from "./contracts";
import type { EaoBenchmarkProductPath } from "@/constants/enterprise-ai-orchestrator/consultant-benchmark";

export const EAO_CONTEXT_QUALITY_VERSION = "1.0.0-g2-w5" as const;

export const EAO_CONTEXT_QUALITY_DIMENSION_IDS = [
  "missing_context",
  "irrelevant_context",
  "prompt_size",
  "retrieval_quality",
  "knowledge_quality",
  "context_freshness",
  "conversation_memory_quality",
] as const;

export type EaoContextQualityDimensionId =
  (typeof EAO_CONTEXT_QUALITY_DIMENSION_IDS)[number];

export const EAO_CONTEXT_QUALITY_DIMENSION_LABELS: Record<
  EaoContextQualityDimensionId,
  string
> = {
  missing_context: "Missing Context",
  irrelevant_context: "Irrelevant Context",
  prompt_size: "Prompt Size",
  retrieval_quality: "Retrieval Quality",
  knowledge_quality: "Knowledge Quality",
  context_freshness: "Context Freshness",
  conversation_memory_quality: "Conversation Memory Quality",
};

export interface EaoContextQualityDimensionScore {
  dimensionId: EaoContextQualityDimensionId;
  label: string;
  /** 0–100 (higher = healthier) */
  score: number;
  findings: string[];
  optimizations: string[];
}

export interface EaoContextQualityInput {
  /** Pack under evaluation */
  context: EaoEnterpriseContextContract;
  /** Optional utterance for relevance scoring */
  utterance?: string;
  /** Optional product path for expected-slot checks */
  productPath?: EaoBenchmarkProductPath;
  /** Optional enterprise/consultation memory */
  memory?: EaoEnterpriseMemoryContract | null;
  /** Soft target for serialized prompt size (chars) */
  promptSizeBudgetChars?: number;
  label?: string;
}

export interface EaoContextQualityReport {
  reportId: string;
  version: typeof EAO_CONTEXT_QUALITY_VERSION;
  packId: string;
  label: string;
  /** 0–100 overall */
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  dimensions: EaoContextQualityDimensionScore[];
  /** Flattened optimization backlog */
  optimizations: string[];
  /** Estimated serialized size of context payload */
  estimatedPromptChars: number;
  factCounts: {
    customer: number;
    opportunity: number;
    deal: number;
    product: number;
    policy: number;
    total: number;
  };
  analyzedAt: string;
  /** Evaluation artefact — must not mutate runtime packs */
  runtimeUnmodified: true;
}

export interface EaoContextQualitySuiteReport {
  reportId: string;
  title: string;
  version: typeof EAO_CONTEXT_QUALITY_VERSION;
  reports: EaoContextQualityReport[];
  suiteOverallScore: number;
  generatedAt: string;
  runtimeUnmodified: true;
}

export type { EaoProvenancedFact };
