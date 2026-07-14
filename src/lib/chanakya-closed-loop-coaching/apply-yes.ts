/**
 * CF-CHANAKYA-003 — Apply YES workflow effects for closed-loop coaching.
 */

import type { LoanFile, LoanLenderExecution, PipelineStage } from "@/types/catalyst-one";
import type { ChanakyaCoachingPrompt } from "@/types/chanakya-closed-loop-coaching";
import { buildStageChangePatch } from "@/lib/loan-files-utils";
import { normalizeLenderCaseStage } from "@/constants/lender-pipeline";

export function applyChanakyaCoachingYesPatch(
  file: LoanFile,
  prompt: ChanakyaCoachingPrompt,
): Partial<LoanFile> {
  const now = new Date().toISOString();
  const coachingEvent = {
    id: `tl-coach-${Date.now()}`,
    title: "CHANAKYA coaching",
    description: `YES · ${prompt.question}`,
    timestamp: now,
    completed: true,
  };

  let patch: Partial<LoanFile> = {
    timeline: [coachingEvent, ...file.timeline],
  };

  const targetLoanStage = prompt.meta.targetLoanStage as PipelineStage | undefined;
  if (targetLoanStage && file.stage === "pre_login") {
    const stagePatch = buildStageChangePatch(file, targetLoanStage);
    if (stagePatch) {
      const stageTimeline = stagePatch.timeline ?? file.timeline;
      patch = {
        ...patch,
        ...stagePatch,
        loginDate: file.loginDate || now.slice(0, 10),
        timeline: [coachingEvent, ...stageTimeline.filter((e) => e.id !== coachingEvent.id)],
      };
    }
  }

  if (prompt.lenderCaseId && prompt.meta.targetLenderStage) {
    const cases = [...(file.lenders ?? [])];
    const idx = cases.findIndex((c) => c.id === prompt.lenderCaseId);
    if (idx >= 0) {
      const current = cases[idx]!;
      const alreadyLogged = normalizeLenderCaseStage(current.caseStage) === "logged_in_wip";
      const updated: LoanLenderExecution = {
        ...current,
        caseStage: alreadyLogged
          ? current.caseStage
          : (prompt.meta.targetLenderStage as LoanLenderExecution["caseStage"]),
        loginDate: current.loginDate || now.slice(0, 10),
        updatedAt: now,
        remarks: [current.remarks, "CHANAKYA: banker login acknowledged"]
          .filter(Boolean)
          .join(" · "),
      };
      cases[idx] = updated;
      patch.lenders = cases;
    }
  }

  return patch;
}

export function buildChanakyaCoachingRemindTask(prompt: ChanakyaCoachingPrompt): {
  id: string;
  title: string;
  priority: "high";
  dueDate: string;
  assignedTo: string;
  completed: boolean;
} {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const banker = prompt.meta.bankerName ?? "banker";
  const lender = prompt.meta.lenderName ?? "lender";
  return {
    id: `task-coach-${Date.now()}`,
    title: `Follow up · ${lender} · ${banker} (CHANAKYA remind)`,
    priority: "high",
    dueDate: tomorrow.toISOString(),
    assignedTo: "Relationship Manager",
    completed: false,
  };
}
