/**
 * CO-AI-G2-W8 — Shadow Mode Dashboard (Product Owner review only).
 * Internal evaluation surface — never customer-facing.
 */

export const EAO_SHADOW_DASHBOARD_VERSION = "1.0.0-g2-w8" as const;

export interface EaoShadowDashboardRow {
  rowId: string;
  customerUtterance: string;
  /** Current SARATHI (live) facing text */
  currentSarathiResponse: string;
  /** Conversational reasoning / shadow model facing text */
  reasoningModelResponse: string;
  /** Gold-standard consultant facing text (may be empty if unmatched) */
  goldStandardResponse: string;
  /** Consultant benchmark score (0–100) — triple aggregate */
  benchmarkScore: number;
  /** Policy validation score on reasoning response (0–100) */
  policyScore: number;
  /** Consultation readiness / CRE confidence (0–100) */
  consultationScore: number;
  /** End-to-end latency ms for this evaluation sample */
  latencyMs: number;
  /** Heuristic estimated cost USD for this sample */
  estimatedCostUsd: number;
  productPath?: string;
  recommendation?: string;
  comparedAt: string;
}

export interface EaoShadowDashboardSnapshot {
  snapshotId: string;
  version: typeof EAO_SHADOW_DASHBOARD_VERSION;
  title: string;
  audience: "product_owner_only";
  customerAccess: false;
  customerIsolated: true;
  rows: EaoShadowDashboardRow[];
  /** Suite-level averages for header KPIs */
  averages: {
    benchmarkScore: number;
    policyScore: number;
    consultationScore: number;
    latencyMs: number;
    estimatedCostUsd: number;
  };
  generatedAt: string;
}

export interface EaoShadowDashboardComposeInput {
  customerUtterance: string;
  liveFacingText: string;
  modelFacingText: string;
  productPath?: string;
  /** Optional CRE confidence override; otherwise derived */
  consultationScore?: number;
  latencyMs?: number;
  sessionId?: string;
  conversationId?: string;
  label?: string;
}
