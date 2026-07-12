/**
 * DKF knowledge evaluation — Request → Applicable packages → Match → Evidence → Recommendation.
 * Full traceability. Never executes.
 */

import type {
  DkfEvidenceBundle,
  DkfKnowledgeEvaluationTrace,
  DkfKnowledgePackage,
  DkfPackageEvaluationResult,
  EdeDecisionCategory,
  EdeDecisionContext,
} from "@/types/enterprise-decision-engine";
import { resolveDkfKnowledgePackages } from "./knowledge-registry";

function docPct(ctx: EdeDecisionContext): number {
  if (!ctx.documentRequiredCount) return 100;
  return Math.round(((ctx.documentVerifiedCount ?? 0) / ctx.documentRequiredCount) * 100);
}

function evaluatePackageMatch(
  pkg: DkfKnowledgePackage,
  category: EdeDecisionCategory,
  ctx: EdeDecisionContext,
): DkfPackageEvaluationResult {
  const notes: string[] = [];
  let score = 0;
  const m = pkg.match;

  if (m.decisionCategories?.length) {
    if (m.decisionCategories.includes(category)) {
      score += 40;
      notes.push(`Category ${category} in package scope`);
    } else {
      return {
        knowledgeId: pkg.knowledgeId,
        name: pkg.name,
        category: pkg.category,
        kind: pkg.kind,
        version: pkg.version,
        matched: false,
        matchScore: 0,
        matchNotes: [`Category ${category} out of package scope`],
      };
    }
  } else {
    score += 10;
    notes.push("No category filter — broadly applicable");
  }

  if (m.requireStagePresent) {
    if (ctx.stageCode) {
      score += 10;
      notes.push("Stage present");
    } else notes.push("Stage missing");
  }
  if (m.requireDocumentsPresent) {
    if ((ctx.documentRequiredCount ?? 0) > 0) {
      score += 10;
      notes.push("Document context present");
    } else notes.push("Document context missing");
  }
  if (m.requireTasksPresent) {
    if (
      (ctx.openTaskCount ?? 0) + (ctx.overdueTaskCount ?? 0) + (ctx.completedTaskCount ?? 0) >
      0
    ) {
      score += 10;
      notes.push("Task context present");
    } else notes.push("Task context missing");
  }
  if (m.requireLifePresent) {
    if (ctx.lifeLenderName) {
      score += 10;
      notes.push("LIFE signal present");
    } else notes.push("LIFE signal missing");
  }
  if (m.requireWorkflowPresent) {
    if (ctx.workflowProgressRatio != null || ctx.workflowStatus) {
      score += 10;
      notes.push("Workflow context present");
    } else notes.push("Workflow context missing");
  }
  if (m.requireHealthPresent) {
    if (ctx.healthScore != null) {
      score += 10;
      notes.push("Health score present");
    } else notes.push("Health score missing");
  }
  if (m.minDocumentCompletionPct != null) {
    const pct = docPct(ctx);
    if (pct >= m.minDocumentCompletionPct) {
      score += 5;
      notes.push(`Document completion ${pct}% meets scaffold threshold`);
    } else notes.push(`Document completion ${pct}% below scaffold threshold`);
  }
  if (m.maxDaysSinceActivity != null) {
    const days = ctx.daysSinceLastActivity;
    if (days == null) notes.push("Activity age unknown");
    else if (days <= m.maxDaysSinceActivity) {
      score += 5;
      notes.push(`Activity within ${m.maxDaysSinceActivity} days`);
    } else notes.push(`Activity older than ${m.maxDaysSinceActivity} days`);
  }

  const matched = score >= 40;
  return {
    knowledgeId: pkg.knowledgeId,
    name: pkg.name,
    category: pkg.category,
    kind: pkg.kind,
    version: pkg.version,
    matched,
    matchScore: score,
    matchNotes: notes,
    advisorySnippet: matched ? pkg.advisoryTemplate : undefined,
  };
}

export function buildDkfEvidenceBundle(
  ctx: EdeDecisionContext,
  matched: DkfPackageEvaluationResult[],
): DkfEvidenceBundle {
  const evidenceUsed: string[] = [];
  const missingInformation: string[] = [];
  const positiveFactors: string[] = [];
  const riskFactors: string[] = [];
  const unknownFactors: string[] = [];

  if (ctx.healthScore != null) {
    evidenceUsed.push(`Health score ${ctx.healthScore} (${ctx.healthBand ?? "—"})`);
    if (ctx.healthScore >= 70) positiveFactors.push("Health score is in a favourable band");
    else if (ctx.healthScore < 50) riskFactors.push("Health score is under pressure");
  } else {
    missingInformation.push("Health score");
    unknownFactors.push("Opportunity health posture");
  }

  if (ctx.pulseLabel) {
    evidenceUsed.push(`Pulse ${ctx.pulseLabel}`);
    if (ctx.pulseLabel === "low") positiveFactors.push("Pulse intensity is low");
    if (ctx.pulseLabel === "critical" || ctx.pulseLabel === "high") {
      riskFactors.push(`Pulse labelled ${ctx.pulseLabel}`);
    }
  } else {
    missingInformation.push("Pulse");
    unknownFactors.push("Live activity intensity");
  }

  if (ctx.stageCode) evidenceUsed.push(`Stage ${ctx.stageCode}`);
  else missingInformation.push("Stage");

  if ((ctx.documentRequiredCount ?? 0) > 0) {
    const pct = docPct(ctx);
    evidenceUsed.push(`Documents ${pct}% verified`);
    if (pct >= 80) positiveFactors.push("Document verification is largely complete");
    else if (pct < 50) riskFactors.push("Document verification is incomplete");
  } else {
    missingInformation.push("Document requirements");
    unknownFactors.push("Document readiness");
  }

  const overdue = ctx.overdueTaskCount ?? 0;
  const open = ctx.openTaskCount ?? 0;
  if (open + overdue + (ctx.completedTaskCount ?? 0) > 0) {
    evidenceUsed.push(`Tasks open=${open} overdue=${overdue}`);
    if (overdue === 0) positiveFactors.push("No overdue tasks in context");
    else riskFactors.push(`${overdue} overdue task(s)`);
  } else {
    missingInformation.push("Task inventory");
    unknownFactors.push("Task health");
  }

  if (ctx.lifeLenderName) {
    evidenceUsed.push(`LIFE lender ${ctx.lifeLenderName}`);
    if (ctx.lifeRecommended) positiveFactors.push("LIFE marks lender as recommended");
  } else {
    missingInformation.push("LIFE lender selection");
    unknownFactors.push("Lender fit");
  }

  if (ctx.workflowProgressRatio != null) {
    evidenceUsed.push(`Workflow progress ${Math.round(ctx.workflowProgressRatio * 100)}%`);
  } else {
    missingInformation.push("Workflow progress");
    unknownFactors.push("Orchestration posture");
  }

  if (ctx.daysSinceLastActivity != null) {
    evidenceUsed.push(`Days since activity ${ctx.daysSinceLastActivity}`);
    if (ctx.daysSinceLastActivity >= 3) {
      riskFactors.push("Recent customer interaction appears quiet");
    } else positiveFactors.push("Recent activity signal present");
  } else {
    missingInformation.push("Last activity timestamp");
    unknownFactors.push("Customer engagement cadence");
  }

  if (matched.length) {
    evidenceUsed.push(
      `Knowledge packages matched: ${matched.map((m) => m.name).join("; ")}`,
    );
  } else {
    unknownFactors.push("No applicable published knowledge packages matched");
  }

  return {
    evidenceUsed,
    missingInformation,
    positiveFactors,
    riskFactors,
    unknownFactors,
  };
}

/**
 * Evaluate applicable knowledge for a decision category + context.
 * Does not recommend product eligibility or approve loans.
 */
export function evaluateDkfKnowledge(
  category: EdeDecisionCategory,
  ctx: EdeDecisionContext,
): DkfKnowledgeEvaluationTrace {
  const { packages, source } = resolveDkfKnowledgePackages();
  const applicable = packages.map((pkg) => evaluatePackageMatch(pkg, category, ctx));
  const matched = applicable
    .filter((r) => r.matched)
    .sort((a, b) => b.matchScore - a.matchScore);
  const evidence = buildDkfEvidenceBundle(ctx, matched);

  return {
    applicablePackages: applicable,
    matchedPackages: matched,
    evidence,
    knowledgeSource: source,
    evaluatedOn: new Date().toISOString(),
  };
}

/** Compose explainable recommendation text from matched knowledge (advisory). */
export function composeDkfRecommendationFromKnowledge(
  trace: DkfKnowledgeEvaluationTrace,
  fallbackRecommendation: string,
  fallbackNextSteps: string[],
): { recommendation: string; nextSteps: string[]; explanationSuffix: string } {
  if (trace.matchedPackages.length === 0) {
    return {
      recommendation: fallbackRecommendation,
      nextSteps: fallbackNextSteps,
      explanationSuffix:
        "No matching Decision Knowledge packages were applicable; framework advisory profile was used with explicit evidence limits.",
    };
  }

  const top = trace.matchedPackages.slice(0, 3);
  const recommendation = top
    .map((p) => p.advisorySnippet)
    .filter(Boolean)
    .join(" ");
  const nextSteps = [
    ...fallbackNextSteps.slice(0, 1),
    ...top
      .map((p) => {
        const pkg = resolveDkfKnowledgePackages().packages.find(
          (k) => k.knowledgeId === p.knowledgeId,
        );
        return pkg?.nextStepTemplate;
      })
      .filter((s): s is string => !!s),
  ].slice(0, 4);

  const explanationSuffix = `Knowledge used: ${top
    .map((p) => `${p.name} v${p.version}`)
    .join("; ")}. Evidence used: ${trace.evidence.evidenceUsed.slice(0, 4).join("; ")}.`;

  return {
    recommendation: recommendation || fallbackRecommendation,
    nextSteps: nextSteps.length ? nextSteps : fallbackNextSteps,
    explanationSuffix,
  };
}
