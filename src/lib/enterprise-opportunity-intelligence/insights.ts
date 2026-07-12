/**
 * CHANAKYA advisory insights (SPR-003) — advisory only, no automation.
 */

import type {
  ChanakyaInsight,
  OpportunityHealthResult,
  OpportunityOperationalSignals,
} from "@/types/enterprise-opportunity-intelligence";

export function generateChanakyaInsights(
  signals: OpportunityOperationalSignals,
  health: OpportunityHealthResult,
  previousScore?: number,
): ChanakyaInsight[] {
  const insights: ChanakyaInsight[] = [];

  if (signals.daysSinceLastActivity >= 3) {
    insights.push({
      id: "inactivity",
      severity: "attention",
      code: "CHANAKYA_NO_INTERACTION",
      message: `No customer interaction in last ${signals.daysSinceLastActivity} days.`,
    });
  }

  if (signals.documentRequiredCount > 0) {
    const pct = Math.round((signals.documentVerifiedCount / signals.documentRequiredCount) * 100);
    insights.push({
      id: "docs",
      severity: pct >= 80 ? "info" : "advisory",
      code: "CHANAKYA_DOC_COMPLETION",
      message: `Document collection is ${pct}% complete.`,
    });
  }

  if (signals.overdueTaskCount === 1) {
    insights.push({
      id: "overdue-one",
      severity: "attention",
      code: "CHANAKYA_OVERDUE_TASK",
      message: "One overdue task needs attention.",
    });
  } else if (signals.overdueTaskCount > 1) {
    insights.push({
      id: "overdue-many",
      severity: "attention",
      code: "CHANAKYA_OVERDUE_TASKS",
      message: `${signals.overdueTaskCount} overdue tasks need attention.`,
    });
  }

  if (health.score >= 70 && signals.overdueTaskCount === 0) {
    insights.push({
      id: "lender",
      severity: "advisory",
      code: "CHANAKYA_LENDER_HINT",
      message: "Recommended lender has high historical success for this product profile.",
    });
  }

  if (previousScore !== undefined) {
    if (health.score > previousScore + 2) {
      insights.push({
        id: "improving",
        severity: "info",
        code: "CHANAKYA_HEALTH_IMPROVING",
        message: "Opportunity health is improving.",
      });
    } else if (health.score < previousScore - 2) {
      insights.push({
        id: "declining",
        severity: "attention",
        code: "CHANAKYA_HEALTH_DECLINING",
        message: "Opportunity health is declining.",
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: "stable",
      severity: "info",
      code: "CHANAKYA_STABLE",
      message: "Opportunity posture is stable. Continue planned execution.",
    });
  }

  return insights;
}
