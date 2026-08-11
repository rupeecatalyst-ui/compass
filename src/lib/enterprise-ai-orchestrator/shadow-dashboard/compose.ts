/**
 * CO-AI-G2-W8 — Compose Product Owner Shadow Mode Dashboard rows.
 * Consumes W4 triple · W6 policy · W7 cost/latency · CRE consultation confidence.
 * Never mutates live facing text. Never customer-accessible.
 */

import type { EaoBenchmarkProductPath } from "@/constants/enterprise-ai-orchestrator/consultant-benchmark";
import {
  deriveSarathiConsultationConfidence,
  type SarathiProductContextId,
} from "@/lib/enterprise-ai-platform/conversation-experience/ux-flow";
import { runEaoTripleComparison } from "@/lib/enterprise-ai-orchestrator/triple-comparison/engine";
import { validateEaoShadowPolicy } from "@/lib/enterprise-ai-orchestrator/policy-validation/validate";
import {
  createEaoPerfSample,
} from "@/lib/enterprise-ai-orchestrator/perf-profiler/profile";
import {
  EAO_SHADOW_DASHBOARD_VERSION,
  type EaoShadowDashboardComposeInput,
  type EaoShadowDashboardRow,
  type EaoShadowDashboardSnapshot,
} from "@/types/enterprise-ai-orchestrator/shadow-dashboard";

function mapProduct(path?: string): {
  eao: EaoBenchmarkProductPath;
  sarathi: SarathiProductContextId;
} {
  switch (path) {
    case "home_loan":
      return { eao: "home_loan", sarathi: "home_loan" };
    case "lap":
      return { eao: "lap", sarathi: "lap" };
    case "business_loan":
      return { eao: "business_loan", sarathi: "business_loan" };
    case "working_capital":
      return { eao: "working_capital", sarathi: "working_capital" };
    case "balance_transfer":
      return { eao: "balance_transfer", sarathi: "balance_transfer" };
    case "personal_loan":
      return { eao: "personal_loan", sarathi: "personal_loan" };
    default:
      return { eao: "general", sarathi: "general" };
  }
}

function extractConsultationFacts(utterance: string): Array<{ key: string; value: string }> {
  const u = utterance.toLowerCase();
  const facts: Array<{ key: string; value: string }> = [];
  if (/buy|purchase|home|flat|house|property|business|loan|emi|transfer/.test(u)) {
    facts.push({ key: "purpose", value: "stated" });
  }
  if (/₹|rs\.?|lakh|crore|amount|funding|emi|reduce/.test(u)) {
    facts.push({ key: "required_amount", value: "hinted" });
  }
  if (/pune|mumbai|delhi|bangalore|property|flat|house|office/.test(u)) {
    facts.push({ key: "city", value: "hinted" });
  }
  if (/salaried|self-employed|proprietorship|partnership|private limited/.test(u)) {
    facts.push({ key: "employment", value: "hinted" });
  }
  return facts;
}

function deriveConsultationScore(
  input: EaoShadowDashboardComposeInput,
  product: SarathiProductContextId,
): number {
  if (typeof input.consultationScore === "number") {
    return Math.max(0, Math.min(100, Math.round(input.consultationScore)));
  }
  return deriveSarathiConsultationConfidence({
    product,
    facts: extractConsultationFacts(input.customerUtterance),
    userTurnCount: 2,
    openMissingSlotIds: ["funding_amount", "borrower_profile"],
  }).score;
}

export function composeEaoShadowDashboardRow(
  input: EaoShadowDashboardComposeInput,
): EaoShadowDashboardRow {
  const { eao, sarathi } = mapProduct(input.productPath);
  const triple = runEaoTripleComparison({
    customerUtterance: input.customerUtterance,
    liveFacingText: input.liveFacingText,
    modelFacingText: input.modelFacingText,
    productPath: eao,
    sessionId: input.sessionId,
    conversationId: input.conversationId,
  });

  const policy = validateEaoShadowPolicy({
    customerUtterance: input.customerUtterance,
    shadowFacingText: input.modelFacingText,
    liveFacingText: input.liveFacingText,
    label: input.label ?? "shadow-dashboard-row",
    sessionId: input.sessionId,
    conversationId: input.conversationId,
  });

  const latencyMs = input.latencyMs ?? 1200;
  const perf = createEaoPerfSample({
    latencyMs,
    inputText: input.customerUtterance,
    outputText: input.modelFacingText,
    toolCallCount: 0,
    contextSizeChars: input.customerUtterance.length + input.liveFacingText.length,
    memorySizeChars: 0,
    providerId: "eao.shadow.dashboard",
    sessionId: input.sessionId,
    conversationId: input.conversationId,
    label: input.label,
  });

  const gold =
    triple.arms.find((a) => a.armId === "gold_standard")?.facingText ??
    triple.matchedGold?.consultantGoldText ??
    "";

  return {
    rowId: `eao_shadow_dash_${crypto.randomUUID()}`,
    customerUtterance: input.customerUtterance,
    currentSarathiResponse: input.liveFacingText,
    reasoningModelResponse: input.modelFacingText,
    goldStandardResponse: gold,
    benchmarkScore: triple.score,
    policyScore: policy.overallScore,
    consultationScore: deriveConsultationScore(input, sarathi),
    latencyMs: perf.latencyMs,
    estimatedCostUsd: perf.estimatedCostUsd,
    productPath: triple.productPath,
    recommendation: triple.recommendation,
    comparedAt: new Date().toISOString(),
  };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10;
}

export function buildEaoShadowDashboardSnapshot(input: {
  title?: string;
  rows: EaoShadowDashboardComposeInput[];
}): EaoShadowDashboardSnapshot {
  const rows = input.rows.map(composeEaoShadowDashboardRow);
  return {
    snapshotId: `eao_shadow_dash_snap_${crypto.randomUUID()}`,
    version: EAO_SHADOW_DASHBOARD_VERSION,
    title: input.title ?? "Shadow Mode Dashboard — Product Owner Review",
    audience: "product_owner_only",
    customerAccess: false,
    customerIsolated: true,
    rows,
    averages: {
      benchmarkScore: avg(rows.map((r) => r.benchmarkScore)),
      policyScore: avg(rows.map((r) => r.policyScore)),
      consultationScore: avg(rows.map((r) => r.consultationScore)),
      latencyMs: avg(rows.map((r) => r.latencyMs)),
      estimatedCostUsd:
        Math.round(
          (rows.reduce((s, r) => s + r.estimatedCostUsd, 0) / Math.max(1, rows.length)) *
            1_000_000,
        ) / 1_000_000,
    },
    generatedAt: new Date().toISOString(),
  };
}
