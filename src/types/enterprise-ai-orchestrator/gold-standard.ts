/**
 * CO-AI-G2-W3 — Gold Standard Consultation Library types.
 * Benchmarking / Product Owner reference ONLY — never runtime dialogue SSOT.
 */

import type { EaoBenchmarkProductPath } from "@/constants/enterprise-ai-orchestrator/consultant-benchmark";

export type EaoGoldStandardProductId = Exclude<EaoBenchmarkProductPath, "general">;

export interface EaoGoldStandardTurn {
  speaker: "customer" | "consultant";
  text: string;
  /** Optional note for evaluators */
  note?: string;
}

export interface EaoGoldStandardConversation {
  conversationId: string;
  title: string;
  /** Short premise for the scenario */
  premise: string;
  turns: EaoGoldStandardTurn[];
}

export interface EaoGoldStandardProductEntry {
  productId: EaoGoldStandardProductId;
  productLabel: string;
  /** Typical customer goals for this product */
  typicalCustomerGoals: string[];
  /** Gold-standard dialogue examples (benchmark only) */
  typicalConversations: EaoGoldStandardConversation[];
  /** How an experienced Rupee Catalyst consultant should behave */
  expectedConsultantBehaviour: string[];
  /** How follow-ups should be sequenced (not a rigid script) */
  expectedFollowUpStrategy: string[];
  /** Notes for scorers using the eight benchmark dimensions */
  evaluationNotes: string[];
  /** Explicit non-use reminder */
  runtimePolicy: "benchmark_only_never_runtime_ssot";
}

export interface EaoGoldStandardLibrary {
  libraryId: "eao.gold_standard.v1";
  version: string;
  products: EaoGoldStandardProductEntry[];
  authorityNote: "product_owner_benchmark_library";
}
