/**
 * CO-WF-006 — CHANAKYA advisory sub-stage recommendation (not a policy gate).
 */

import {
  listEoleSubStagesForStage,
  listLenderSubStagesForStage,
  type EnterpriseSubStageOption,
} from "@/constants/enterprise-stage-transition";
import type { LenderCaseStage } from "@/types/catalyst-one";

export type StageTransitionRecommendContext = {
  engine: "lender_pipeline" | "opportunity_eole";
  fromStage: string;
  toStage: string;
  fromSubStage?: string | null;
  pendingTaskCount?: number;
  pendingDocumentCount?: number;
  hasOpenQuery?: boolean;
};

export type StageTransitionRecommendation = {
  recommendedSubStageId: string | null;
  recommendedSubStageLabel: string | null;
  message: string;
  rationale: string[];
};

function optionsFor(ctx: StageTransitionRecommendContext): EnterpriseSubStageOption[] {
  if (ctx.engine === "opportunity_eole") {
    return listEoleSubStagesForStage(ctx.toStage);
  }
  return listLenderSubStagesForStage(ctx.toStage as LenderCaseStage);
}

/**
 * Advisory only — user must confirm. Never blocks transition.
 */
export function recommendStageTransitionSubStage(
  ctx: StageTransitionRecommendContext,
): StageTransitionRecommendation {
  const options = optionsFor(ctx);
  const rationale: string[] = [];

  if (options.length === 0) {
    return {
      recommendedSubStageId: null,
      recommendedSubStageLabel: null,
      message:
        "No configured sub-stages for this stage. You may continue with Stage only, or add a note for audit.",
      rationale: ["Target stage has no sub-stage catalogue entries."],
    };
  }

  const pendingTasks = ctx.pendingTaskCount ?? 0;
  const pendingDocs = ctx.pendingDocumentCount ?? 0;

  let pick = options[0]!;

  if (ctx.engine === "lender_pipeline") {
    if (ctx.toStage === "prelogin" && pendingDocs > 0) {
      const docs = options.find((o) => o.id === "documents_pending");
      if (docs) {
        pick = docs;
        rationale.push(`${pendingDocs} document gap(s) — prefer Documents Pending.`);
      }
    } else if (ctx.toStage === "logged_in_wip" && (ctx.hasOpenQuery || pendingTasks > 0)) {
      const query = options.find((o) => o.id === "query_raised");
      if (query) {
        pick = query;
        rationale.push(
          pendingTasks > 0
            ? `${pendingTasks} pending task(s) — prefer Query Raised / WIP follow-up.`
            : "Open query signal — prefer Query Raised.",
        );
      }
    } else if (ctx.toStage === "prelogin" && pendingDocs === 0) {
      const ready = options.find((o) => o.id === "login_ready");
      if (ready) {
        pick = ready;
        rationale.push("No pending document signal — Login Ready is a sensible next sub-stage.");
      }
    } else if (ctx.toStage === "closure_wip") {
      const signing = options.find((o) => o.id === "agreement_signing");
      if (signing) {
        pick = signing;
        rationale.push("Closure WIP typically begins at Agreement Signing.");
      }
    }
  } else {
    if (ctx.toStage === "document_collection" && pendingDocs > 0) {
      const kyc = options.find((o) => o.id === "kyc_pending") ?? options[0]!;
      pick = kyc;
      rationale.push("Document gaps remain — KYC / Income collection sub-stage recommended.");
    } else if (ctx.toStage === "lender_review") {
      const credit = options.find((o) => o.id === "credit_check") ?? options[0]!;
      pick = credit;
      rationale.push("Lender Review — Credit Check is the usual entry sub-stage.");
    }
  }

  if (rationale.length === 0) {
    rationale.push(`Defaulting to first sub-stage for ${ctx.toStage}: ${pick.label}.`);
  }
  rationale.push("Recommendation is advisory — confirm or choose another sub-stage.");

  return {
    recommendedSubStageId: pick.id,
    recommendedSubStageLabel: pick.label,
    message: `CHANAKYA recommends: ${pick.label}`,
    rationale,
  };
}
