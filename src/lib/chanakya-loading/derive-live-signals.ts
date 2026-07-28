/**
 * CO-UX-008 — Derive live loading signals from EBI compose (single metric SSOT).
 * Safe for client; returns null if compose throws.
 */

import { composeBusinessIntelligenceSnapshot } from "@/lib/enterprise-business-intelligence";
import type { ChanakyaLoadingLiveSignals } from "@/types/chanakya-loading";

function healthLabel(status: string | undefined): string | null {
  if (!status) return null;
  if (status === "healthy") return "Good";
  if (status === "watch") return "Watch";
  if (status === "impaired") return "Needs Attention";
  return status;
}

export function deriveChanakyaLoadingSignalsFromEbi(): ChanakyaLoadingLiveSignals | null {
  try {
    const snap = composeBusinessIntelligenceSnapshot();
    const criticalAlerts = (snap.insights ?? [])
      .filter((i) => i.tone === "danger")
      .map((i) => i.text)
      .slice(0, 3);
    const pendingWorkLines = (snap.insights ?? [])
      .filter((i) => i.tone === "warning")
      .map((i) => i.text)
      .slice(0, 3);

    return {
      activeOpportunities: snap.executive.activeOpportunities,
      pipelineValueInr: snap.executive.pipelineValue,
      overdueTasks: snap.operational.overdueTasks,
      tasksDueToday: snap.operational.tasksDueToday,
      dealsNeedingLenderFollowUp: snap.operational.dealsAwaitingLenderAction,
      overdueDocumentRequests: snap.operational.dealsAwaitingDocuments,
      enterpriseHealthLabel: healthLabel(snap.health.status),
      topLenderByPipeline: null,
      criticalAlerts,
      pendingWorkLines,
      workflowErrors: 0,
      overnightMetricsOk: true,
    };
  } catch {
    return null;
  }
}
