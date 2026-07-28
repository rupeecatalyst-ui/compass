/**
 * CO-UX-008 — Compose prioritised loading messages.
 * Live insights consume EBI compose outputs — never duplicate KPI formulas.
 */

import {
  CHANAKYA_LOADING_BUSINESS_KNOWLEDGE,
  CHANAKYA_LOADING_COMPLETION,
  CHANAKYA_LOADING_ENTERPRISE_STATUS,
  CHANAKYA_LOADING_PRODUCTIVITY_TIPS,
  CHANAKYA_LOADING_PROGRESS,
} from "@/constants/chanakya-loading/catalog";
import { CHANAKYA_LOADING_CATEGORY_PRIORITY } from "@/constants/chanakya-loading/timing";
import { formatINRCompact } from "@/lib/format-currency";
import type {
  ChanakyaLoadingLiveSignals,
  ChanakyaLoadingMessage,
  ChanakyaLoadingModule,
} from "@/types/chanakya-loading";

function msg(
  id: string,
  category: ChanakyaLoadingMessage["category"],
  text: string,
): ChanakyaLoadingMessage {
  return {
    id,
    category,
    text,
    priority: CHANAKYA_LOADING_CATEGORY_PRIORITY[category],
  };
}

/** Build live insight lines from optional signals (EBI/ETE-derived). */
export function buildLiveInsightMessages(
  signals?: ChanakyaLoadingLiveSignals | null,
): ChanakyaLoadingMessage[] {
  if (!signals) return [];
  const out: ChanakyaLoadingMessage[] = [];
  let i = 0;

  for (const alert of signals.criticalAlerts ?? []) {
    if (alert.trim()) {
      out.push(msg(`critical-${i++}`, "critical", alert.trim()));
    }
  }

  for (const line of signals.pendingWorkLines ?? []) {
    if (line.trim()) {
      out.push(msg(`pending-${i++}`, "pending_work", line.trim()));
    }
  }

  if ((signals.overdueTasks ?? 0) > 0) {
    out.push(
      msg(
        "pending-overdue-tasks",
        "pending_work",
        `${signals.overdueTasks} overdue task${signals.overdueTasks === 1 ? "" : "s"} need attention.`,
      ),
    );
  }
  if ((signals.tasksDueToday ?? 0) > 0) {
    out.push(
      msg(
        "pending-due-today",
        "pending_work",
        `${signals.tasksDueToday} task${signals.tasksDueToday === 1 ? "" : "s"} due today.`,
      ),
    );
  }
  if ((signals.overdueDocumentRequests ?? 0) > 0) {
    out.push(
      msg(
        "pending-docs",
        "pending_work",
        `${signals.overdueDocumentRequests} Document Request${signals.overdueDocumentRequests === 1 ? " is" : "s are"} overdue.`,
      ),
    );
  }
  if ((signals.dealsNeedingLenderFollowUp ?? 0) > 0) {
    out.push(
      msg(
        "pending-lender",
        "pending_work",
        `${signals.dealsNeedingLenderFollowUp} Deal${signals.dealsNeedingLenderFollowUp === 1 ? "" : "s"} require lender follow-up.`,
      ),
    );
  }

  if ((signals.opportunitiesCreatedToday ?? 0) > 0) {
    out.push(
      msg(
        "insight-opp-today",
        "business_insight",
        `${signals.opportunitiesCreatedToday} Opportunit${signals.opportunitiesCreatedToday === 1 ? "y was" : "ies were"} created today.`,
      ),
    );
  }
  if ((signals.pipelineValueInr ?? 0) > 0) {
    out.push(
      msg(
        "insight-pipeline",
        "business_insight",
        `${formatINRCompact(signals.pipelineValueInr!)} Opportunity Value is currently under discussion.`,
      ),
    );
  }
  if ((signals.activeOpportunities ?? 0) > 0) {
    out.push(
      msg(
        "insight-active-opp",
        "business_insight",
        `${signals.activeOpportunities} active Opportunit${signals.activeOpportunities === 1 ? "y is" : "ies are"} in the registry.`,
      ),
    );
  }
  if (signals.topLenderByPipeline?.trim()) {
    out.push(
      msg(
        "insight-top-lender",
        "business_insight",
        `${signals.topLenderByPipeline.trim()} currently has the highest active Opportunity Value.`,
      ),
    );
  }

  if (signals.enterpriseHealthLabel?.trim()) {
    out.push(
      msg(
        "status-health",
        "enterprise_status",
        `Enterprise Health is ${signals.enterpriseHealthLabel.trim()}.`,
      ),
    );
  }
  if (signals.overnightMetricsOk === true) {
    out.push(
      msg(
        "status-overnight",
        "enterprise_status",
        "Overnight metrics completed successfully.",
      ),
    );
  }
  if (signals.workflowErrors === 0) {
    out.push(
      msg("status-workflow", "enterprise_status", "No workflow errors detected."),
    );
  }

  return out;
}

/**
 * Priority-ordered rotation queue.
 * When critical / pending work exists, educational tips & knowledge are deferred.
 */
export function composeChanakyaLoadingMessages(
  module: ChanakyaLoadingModule,
  signals?: ChanakyaLoadingLiveSignals | null,
): ChanakyaLoadingMessage[] {
  const live = buildLiveInsightMessages(signals);
  const hasCriticalOrPending = live.some(
    (m) => m.category === "critical" || m.category === "pending_work",
  );

  const progress = (CHANAKYA_LOADING_PROGRESS[module] ?? CHANAKYA_LOADING_PROGRESS.enterprise).map(
    (text, idx) => msg(`progress-${module}-${idx}`, "progress", text),
  );

  const tips = hasCriticalOrPending
    ? []
    : CHANAKYA_LOADING_PRODUCTIVITY_TIPS.map((text, idx) =>
        msg(`tip-${idx}`, "productivity_tip", text),
      );

  const knowledge = hasCriticalOrPending
    ? []
    : CHANAKYA_LOADING_BUSINESS_KNOWLEDGE.map((text, idx) =>
        msg(`knowledge-${idx}`, "business_knowledge", text),
      );

  const status = CHANAKYA_LOADING_ENTERPRISE_STATUS.map((text, idx) =>
    msg(`status-${idx}`, "enterprise_status", text),
  );

  const all = [...live, ...progress, ...tips, ...knowledge, ...status];
  all.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  return all;
}

export function pickCompletionMessage(
  module: ChanakyaLoadingModule,
  signals?: ChanakyaLoadingLiveSignals | null,
): string {
  const pending =
    (signals?.overdueTasks ?? 0) +
    (signals?.tasksDueToday ?? 0) +
    (signals?.dealsNeedingLenderFollowUp ?? 0);
  if (pending > 0) {
    return `✓ Workspace ready. ${pending} item${pending === 1 ? "" : "s"} require your attention.`;
  }
  const catalog = CHANAKYA_LOADING_COMPLETION[module] ?? CHANAKYA_LOADING_COMPLETION.enterprise;
  return catalog[0] ?? "✓ Workspace ready.";
}

/** Legacy helper — module insight strings for older callers. */
export function getChanakyaLoadingInsights(
  module: ChanakyaLoadingModule,
): readonly string[] {
  const composed = composeChanakyaLoadingMessages(module);
  return composed.map((m) => m.text);
}
