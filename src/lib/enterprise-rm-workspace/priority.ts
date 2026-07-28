/**
 * CO-BIZ-005 Phase 3 — Priority Engine (single formula SSOT).
 * Consumes ETE ageing + work type + stage — does not invent a second task store.
 */

import { ROUTES } from "@/constants/routes";
import { columnForTask, resolveWorkType } from "@/lib/enterprise-task-engine";
import type { EteTask } from "@/types/enterprise-task-engine";
import type { RmPriorityBand, RmPriorityItem, RmTodayWork } from "@/types/enterprise-rm-workspace";

function ageDays(iso?: string): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

function bandFromScore(score: number): RmPriorityBand {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function scoreTask(task: EteTask): { score: number; reason: string } {
  let score = 20;
  const reasons: string[] = [];
  const col = columnForTask(task);
  const wt = resolveWorkType(task);
  const age = Math.max(ageDays(task.dueOn), ageDays(task.createdOn));

  if (col === "past_due") {
    score += 40;
    reasons.push("Task ageing / overdue");
  } else if (col === "due_today") {
    score += 25;
    reasons.push("Due today");
  }

  if (wt === "Document Collection" || task.predefinedDescription === "Follow-up Documents") {
    score += 18;
    reasons.push("Document delay");
  }
  if (wt === "Lender Call" || task.predefinedDescription === "Follow-up Lender") {
    score += 22;
    reasons.push("Lender SLA pressure");
  }
  if (wt === "Customer Call" || wt === "Follow-up") {
    score += 12;
    reasons.push("Customer inactivity risk");
  }

  if (age >= 5) {
    score += 15;
    reasons.push(`Idle ${age} days`);
  } else if (age >= 2) {
    score += 8;
    reasons.push(`Ageing ${age} days`);
  }

  const stage = (task.grossStage || "").toLowerCase();
  if (stage.includes("approval") || stage.includes("disburs") || stage.includes("lender")) {
    score += 10;
    reasons.push(`Deal stage: ${task.grossStage}`);
  }

  if (task.priority === "critical") score += 20;
  else if (task.priority === "high") score += 12;

  return {
    score: Math.min(100, score),
    reason: reasons.slice(0, 3).join(" · ") || "Scheduled work",
  };
}

export function deriveRmPriorities(today: RmTodayWork): RmPriorityItem[] {
  const seen = new Set<string>();
  const tasks = [
    ...today.overdue.tasks,
    ...today.pendingLenderActions.tasks,
    ...today.pendingDocumentRequests.tasks,
    ...today.followUps.tasks,
    ...today.upcomingMeetings.tasks,
  ];

  const items: RmPriorityItem[] = [];
  for (const task of tasks) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    const { score, reason } = scoreTask(task);
    const title =
      task.title || task.description || task.predefinedDescription || "Action required";
    items.push({
      id: `pri:${task.id}`,
      band: bandFromScore(score),
      score,
      title,
      reason,
      taskId: task.id,
      opportunityRef: task.opportunityRef,
      dealId: task.dealId || task.fileId,
      href: ROUTES.TASKS,
    });
  }

  const order: Record<RmPriorityBand, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return items.sort((a, b) => order[a.band] - order[b.band] || b.score - a.score).slice(0, 24);
}
