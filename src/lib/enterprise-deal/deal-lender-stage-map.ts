/**
 * CO-ARCH-007 — Map Lender Case Stage ↔ Deal grossStage (PipelineStage).
 * EnterpriseDeal.grossStage is authoritative; caseStage is the Pipeline UI vocabulary.
 */

import type { LenderCaseStage, PipelineStage } from "@/types/catalyst-one";
import { migrateLegacyStage } from "@/constants/loan-stage-master";
import { normalizeLenderCaseStage } from "@/constants/lender-pipeline";

export function lenderCaseStageToGrossStage(
  caseStage: LenderCaseStage | string | null | undefined,
): PipelineStage {
  const s = normalizeLenderCaseStage(String(caseStage ?? "identified"));
  switch (s) {
    case "identified":
    case "prelogin":
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
    case "hold":
    case "lost":
      return "pre_login";
    default:
      return "pre_login";
  }
}

export function grossStageToLenderCaseStage(
  grossStage: PipelineStage | string | null | undefined,
): LenderCaseStage {
  const s = migrateLegacyStage(String(grossStage ?? "raw_lead"));
  switch (s) {
    case "raw_lead":
    case "pre_login":
      return "prelogin";
    case "logged_in":
    case "credit_wip":
      return "logged_in_wip";
    case "soft_approved":
      return "soft_approved";
    case "final_approved":
      return "final_approved";
    case "closure_wip":
      return "closure_wip";
    case "won":
      return "disbursed";
    default:
      return "identified";
  }
}
