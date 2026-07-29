/**
 * CO-INC-001A — Canonical Deal / Lender Pipeline stage vocabulary = LenderCaseStage.
 *
 * UI · Business Rules · Persistence · Registry · Reload all use LenderCaseStage ids.
 * Legacy PipelineStage strings (pre_login, logged_in, won, …) are normalized on read only.
 * No lossy Identified↔Pre Login collapse on write.
 */

import type { LenderCaseStage, PipelineStage } from "@/types/catalyst-one";
import { normalizeLenderCaseStage } from "@/constants/lender-pipeline";

/**
 * Persist path: Kanban caseStage → Registry grossStage.
 * Identity after normalize — no PipelineStage translation.
 */
export function lenderCaseStageToGrossStage(
  caseStage: LenderCaseStage | string | null | undefined,
): LenderCaseStage {
  return normalizeLenderCaseStage(String(caseStage ?? "identified"));
}

/**
 * Reload / projection path: Registry grossStage → Kanban caseStage.
 * Accepts canonical LenderCaseStage and legacy PipelineStage aliases.
 */
export function grossStageToLenderCaseStage(
  grossStage: PipelineStage | LenderCaseStage | string | null | undefined,
): LenderCaseStage {
  return normalizeLenderCaseStage(String(grossStage ?? "identified"));
}

/**
 * My Deals / LoanFile-shaped surfaces still speak PipelineStage.
 * One-way display projection only — never used for Kanban persist.
 */
export function lenderCaseStageToPipelineStageProjection(
  caseStage: LenderCaseStage | string | null | undefined,
): PipelineStage {
  const s = normalizeLenderCaseStage(String(caseStage ?? "identified"));
  switch (s) {
    case "identified":
    case "prelogin":
    case "hold":
      return "pre_login";
    case "logged_in_wip":
      return "logged_in";
    case "soft_approved":
      return "soft_approved";
    case "final_approved":
      return "final_approved";
    case "closure_wip":
      return "closure_wip";
    case "disbursed":
      return "won";
    case "lost":
      return "pre_login";
    default:
      return "pre_login";
  }
}
