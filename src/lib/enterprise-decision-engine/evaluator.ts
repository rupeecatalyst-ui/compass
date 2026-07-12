/**
 * EDE evaluator — Analyse → Recommend → Explain. Never executes.
 * No product eligibility, lender policies, or workflow rules.
 */

import { EDE_ADVISORY_LEVELS } from "@/constants/enterprise-decision-engine";
import type {
  EdeAdvisoryLevel,
  EdeConfidenceBand,
  EdeDecisionCategory,
  EdeDecisionContext,
  EdeEvaluationProfile,
  EdeRecommendationCategory,
  EdeSupportingFactor,
} from "@/types/enterprise-decision-engine";

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function docPct(ctx: EdeDecisionContext): number {
  if (!ctx.documentRequiredCount) return 100;
  return Math.round(((ctx.documentVerifiedCount ?? 0) / ctx.documentRequiredCount) * 100);
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "—");
}

function buildVars(ctx: EdeDecisionContext): Record<string, string> {
  const pct = docPct(ctx);
  const overdue = ctx.overdueTaskCount ?? 0;
  const open = ctx.openTaskCount ?? 0;
  const daysInactive = ctx.daysSinceLastActivity ?? 0;

  const focusArea =
    overdue > 0
      ? "overdue tasks"
      : pct < 80
        ? "document completion"
        : daysInactive >= 3
          ? "customer engagement"
          : "stage progression";

  const docAdvice =
    pct >= 80
      ? "Pack appears largely ready for review."
      : "Pending verification items may benefit from attention.";

  const taskAdvice =
    overdue > 0
      ? `${overdue} overdue task(s) are visible in context.`
      : open > 0
        ? `${open} open task(s) remain in flight.`
        : "Task queue looks clear in the provided context.";

  const workflowAdvice =
    (ctx.workflowProgressRatio ?? 0) >= 0.7
      ? "Orchestration progress looks healthy in context."
      : "Completion conditions may still be pending.";

  const lenderLine = ctx.lifeLenderName
    ? `LIFE shows lender signal: ${ctx.lifeLenderName}.`
    : "No lender selected in the provided context.";

  const customerAdvice =
    daysInactive >= 3
      ? `No recent interaction signal for ${daysInactive} day(s).`
      : "Recent activity signals look adequate.";

  return {
    opportunityCode: ctx.opportunityCode ?? ctx.opportunityId ?? "opportunity",
    customerName: ctx.customerName ?? "—",
    healthScore: `${ctx.healthScore ?? "—"}`,
    healthBand: ctx.healthBand ?? "—",
    pulseLabel: ctx.pulseLabel ?? "—",
    stageCode: (ctx.stageCode ?? "—").replace(/_/g, " "),
    subStage: (ctx.subStageCode ?? "—").replace(/_/g, " "),
    docPct: `${pct}`,
    docRequired: `${ctx.documentRequiredCount ?? 0}`,
    docUploaded: `${ctx.documentUploadedCount ?? 0}`,
    docVerified: `${ctx.documentVerifiedCount ?? 0}`,
    openTasks: `${open}`,
    overdueTasks: `${overdue}`,
    completedTasks: `${ctx.completedTaskCount ?? 0}`,
    focusArea,
    docAdvice,
    taskAdvice,
    workflowAdvice,
    workflowProgress: `${Math.round((ctx.workflowProgressRatio ?? 0) * 100)}`,
    workflowStatus: ctx.workflowStatus ?? "—",
    workflowCode: ctx.workflowDefinitionCode ?? "—",
    lifeLender: ctx.lifeLenderName ?? "none",
    lifeRecommended: ctx.lifeRecommended ? "yes" : "no",
    lifeSuccess: `${ctx.lifeSuccessProbability ?? "—"}`,
    lenderLine,
    customerAdvice,
    daysInactive: `${daysInactive}`,
    commCount: `${ctx.communicationEventCount ?? 0}`,
    dialogueSummary: ctx.dialogueSummary ?? ctx.communicationSummary ?? "none provided",
  };
}

function buildSupportingFactors(ctx: EdeDecisionContext): EdeSupportingFactor[] {
  const factors: EdeSupportingFactor[] = [];
  if (ctx.healthScore != null) {
    factors.push({
      code: "health_score",
      label: "Health Score",
      value: `${ctx.healthScore} (${ctx.healthBand ?? "—"})`,
      weightHint: "high",
    });
  }
  if (ctx.pulseLabel) {
    factors.push({
      code: "pulse",
      label: "Pulse",
      value: ctx.pulseLabel,
      weightHint: "medium",
    });
  }
  if (ctx.stageCode) {
    factors.push({
      code: "stage",
      label: "Stage / Sub-stage",
      value: `${ctx.stageCode.replace(/_/g, " ")}${
        ctx.subStageCode ? ` / ${ctx.subStageCode.replace(/_/g, " ")}` : ""
      }`,
      weightHint: "medium",
    });
  }
  factors.push({
    code: "documents",
    label: "Documents",
    value: `${ctx.documentVerifiedCount ?? 0}/${ctx.documentRequiredCount ?? 0} verified (${docPct(ctx)}%)`,
    weightHint: "high",
  });
  factors.push({
    code: "tasks",
    label: "Tasks",
    value: `open ${ctx.openTaskCount ?? 0} · overdue ${ctx.overdueTaskCount ?? 0} · done ${ctx.completedTaskCount ?? 0}`,
    weightHint: "high",
  });
  if (ctx.lifeLenderName) {
    factors.push({
      code: "life",
      label: "LIFE signal",
      value: `${ctx.lifeLenderName}${ctx.lifeRecommended ? " (recommended)" : ""}`,
      weightHint: "medium",
    });
  }
  if (ctx.workflowProgressRatio != null) {
    factors.push({
      code: "workflow",
      label: "Workflow progress",
      value: `${Math.round(ctx.workflowProgressRatio * 100)}% (${ctx.workflowStatus ?? "—"})`,
      weightHint: "medium",
    });
  }
  factors.push({
    code: "activity",
    label: "Days since last activity",
    value: `${ctx.daysSinceLastActivity ?? "—"}`,
    weightHint: "medium",
  });
  if (ctx.dialogueSummary || ctx.communicationSummary) {
    factors.push({
      code: "dialogue",
      label: "Dialogue / communication summary",
      value: ctx.dialogueSummary ?? ctx.communicationSummary ?? "—",
      weightHint: "low",
    });
  }
  return factors;
}

export function deriveEdeAdvisoryLevel(
  category: EdeDecisionCategory,
  ctx: EdeDecisionContext,
): EdeAdvisoryLevel {
  const overdue = ctx.overdueTaskCount ?? 0;
  const pct = docPct(ctx);
  const inactive = ctx.daysSinceLastActivity ?? 0;
  const health = ctx.healthScore ?? 70;

  // Compliance block is reserved for explicit ECG compliance flags later.
  // SPR-006A never auto-blocks from heuristics (empowerment principle).
  const complianceFlag = ctx.extras?.complianceBlock === true;
  if (complianceFlag) return "compliance_block";

  if (category === "risk_observation" && (overdue >= 3 || health < 40)) return "escalation";
  if (overdue >= 2 || (pct < 40 && category === "document_readiness")) return "warning";
  if (inactive >= 5 && category === "customer_readiness") return "warning";
  if (overdue >= 1 || pct < 70 || inactive >= 3 || health < 55) return "recommendation";
  return "information";
}

function recommendationCategoryFor(
  level: EdeAdvisoryLevel,
): EdeRecommendationCategory {
  switch (level) {
    case "information":
      return "informational";
    case "recommendation":
      return "operational";
    case "warning":
      return "attention";
    case "escalation":
      return "escalation";
    case "compliance_block":
      return "compliance";
  }
}

export function computeEdeConfidence(
  ctx: EdeDecisionContext,
  profile: EdeEvaluationProfile,
): { confidence: number; band: EdeConfidenceBand } {
  const f = profile.confidenceFactors;
  const weightSum =
    f.healthWeight +
    f.documentWeight +
    f.taskWeight +
    f.workflowWeight +
    f.activityWeight +
    f.lenderWeight || 1;

  const docScore = docPct(ctx);
  const taskScore = clamp(100 - (ctx.overdueTaskCount ?? 0) * 20 - (ctx.openTaskCount ?? 0) * 5);
  const activityScore = clamp(100 - (ctx.daysSinceLastActivity ?? 0) * 10);
  const workflowScore = clamp((ctx.workflowProgressRatio ?? 0.5) * 100);
  const lenderScore = ctx.lifeLenderName ? (ctx.lifeRecommended ? 85 : 65) : 35;
  const healthScore = clamp(ctx.healthScore ?? 50);

  const weighted =
    (healthScore * f.healthWeight +
      docScore * f.documentWeight +
      taskScore * f.taskWeight +
      workflowScore * f.workflowWeight +
      activityScore * f.activityWeight +
      lenderScore * f.lenderWeight) /
    weightSum;

  const confidence = Math.round(clamp(profile.basConfidence * 0.35 + weighted * 0.65));
  const band: EdeConfidenceBand =
    confidence >= 75 ? "high" : confidence >= 50 ? "moderate" : "low";
  return { confidence, band };
}

export function evaluateEdeAgainstProfile(
  category: EdeDecisionCategory,
  ctx: EdeDecisionContext,
  profile: EdeEvaluationProfile,
): {
  summary: string;
  recommendation: string;
  explanation: string;
  confidence: number;
  confidenceBand: EdeConfidenceBand;
  supportingFactors: EdeSupportingFactor[];
  suggestedNextSteps: string[];
  advisoryLevel: EdeAdvisoryLevel;
  advisoryLevelNumber: 1 | 2 | 3 | 4 | 5;
  mayBlockProgression: boolean;
  recommendationCategory: EdeRecommendationCategory;
} {
  const vars = buildVars(ctx);
  const { confidence, band } = computeEdeConfidence(ctx, profile);
  const advisoryLevel = deriveEdeAdvisoryLevel(category, ctx);
  const meta = EDE_ADVISORY_LEVELS[advisoryLevel];

  const why =
    "Why: structured enterprise context was analysed against an ECG-ready advisory profile (no automated action).";
  const considered = fillTemplate(profile.explanationTemplate, vars);
  const next = profile.nextStepTemplates.map((t) => fillTemplate(t, vars));

  return {
    summary: fillTemplate(profile.summaryTemplate, vars),
    recommendation: fillTemplate(profile.recommendationTemplate, vars),
    explanation: `${why} ${considered} Next: ${next[0] ?? "Review and decide."}`,
    confidence,
    confidenceBand: band,
    supportingFactors: buildSupportingFactors(ctx),
    suggestedNextSteps: next,
    advisoryLevel,
    advisoryLevelNumber: meta.level,
    mayBlockProgression: meta.mayBlockProgression,
    recommendationCategory: recommendationCategoryFor(advisoryLevel),
  };
}
