/**
 * CF-CHANAKYA-005 — Capture meaningful stage movements at change time.
 */

import { getStageIndex } from "@/constants/loan-stage-master";
import type { LoanFile, PipelineStage } from "@/types/catalyst-one";
import { recordChanakyaStageTransition } from "./transition-store";

function resolveDaysInPreviousStage(file: LoanFile, fromStage: PipelineStage): number {
  if (file.daysInStage > 0) return file.daysInStage;
  if (fromStage === "raw_lead" && file.createdAt) {
    const created = new Date(file.createdAt);
    if (!Number.isNaN(created.getTime())) {
      const elapsed = Date.now() - created.getTime();
      return Math.max(1, Math.ceil(elapsed / 86_400_000));
    }
  }
  return 1;
}

/** Record a forward stage movement for intelligent coaching (client-side). */
export function captureChanakyaStageTransition(
  file: LoanFile,
  newStage: PipelineStage,
): void {
  if (file.stage === newStage) return;
  const fromIdx = getStageIndex(file.stage);
  const toIdx = getStageIndex(newStage);
  if (fromIdx < 0 || toIdx <= fromIdx) return;

  recordChanakyaStageTransition({
    loanFileId: file.id,
    fromStage: file.stage,
    toStage: newStage,
    daysInPreviousStage: resolveDaysInPreviousStage(file, file.stage),
  });
}
