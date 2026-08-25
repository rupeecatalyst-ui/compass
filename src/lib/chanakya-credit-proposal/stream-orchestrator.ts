/**
 * CO-CHANAKYA-CREDIT-PROPOSAL-002 — Stream orchestrator (stage events + text deltas).
 */

import "server-only";

import { CHANAKYA_CREDIT_PROPOSAL_STAGES } from "@/constants/chanakya-credit-proposal";
import { buildProposalReadinessReview } from "@/lib/chanakya-phase5-intelligence";
import { composeChanakyaCreditProposalDraft } from "./compose-proposal";
import { gatherChanakyaCreditProposalContext } from "./gather-context";
import type {
  ChanakyaCreditProposalStreamEvent,
  ChanakyaCreditProposalStreamRequest,
  ChanakyaCreditProposalStageId,
} from "@/types/chanakya-credit-proposal";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function* emitStage(
  stageId: ChanakyaCreditProposalStageId,
  status: "active" | "completed" | "skipped",
): AsyncGenerator<ChanakyaCreditProposalStreamEvent> {
  const label =
    CHANAKYA_CREDIT_PROPOSAL_STAGES.find((s) => s.id === stageId)?.label ?? stageId;
  yield { type: "stage", stageId, label, status };
}

/**
 * Progressive chunking for readable on-screen writing.
 * Not an artificial 20s delay — only paces already-composed text.
 */
async function* streamTextDeltas(
  fullText: string,
): AsyncGenerator<ChanakyaCreditProposalStreamEvent> {
  const chunkSize = 28;
  for (let i = 0; i < fullText.length; i += chunkSize) {
    yield { type: "delta", text: fullText.slice(i, i + chunkSize) };
    if (i + chunkSize < fullText.length) {
      await sleep(18);
    }
  }
}

export async function* runChanakyaCreditProposalStream(
  input: ChanakyaCreditProposalStreamRequest,
): AsyncGenerator<ChanakyaCreditProposalStreamEvent> {
  yield* emitStage("review_transaction", "active");
  const ctx = await gatherChanakyaCreditProposalContext(input);
  yield* emitStage("review_transaction", "completed");

  const stated = input.stated ?? {};
  const readiness = buildProposalReadinessReview({
    productName: ctx.productName,
    loanAmount: ctx.loanAmount,
    loanFileId: ctx.opportunityId,
    stated: {
      stated_income_information: stated.statedIncomeMonthly || null,
      stated_business_information:
        stated.statedTurnover || stated.statedNatureOfBusiness || null,
      stated_property_information:
        stated.statedPropertyValue || stated.statedPropertyType || null,
      stated_financial_information:
        stated.statedIncomeMonthly || ctx.loanAmount || null,
    },
  });
  if (!readiness.ready) {
    yield {
      type: "error",
      code: "PROPOSAL_NOT_READY",
      message:
        readiness.conversationalPrompt ||
        "Proposal readiness gate is not met for this Opportunity.",
    };
    return;
  }

  yield* emitStage("review_documents", "active");
  await sleep(40);
  yield* emitStage("review_documents", "completed");

  yield* emitStage("review_credit_workbench", "active");
  await sleep(40);
  yield* emitStage("review_credit_workbench", "completed");

  yield* emitStage("review_lender_product", "active");
  await sleep(30);
  yield* emitStage(
    "review_lender_product",
    ctx.lenderName ? "completed" : "skipped",
  );

  yield* emitStage("prepare_assessment", "active");
  const draft = composeChanakyaCreditProposalDraft(ctx);
  yield* emitStage("prepare_assessment", "completed");

  yield* emitStage("write_proposal", "active");
  yield { type: "draft", draft };
  yield* streamTextDeltas(draft.fullText);
  yield* emitStage("write_proposal", "completed");

  yield { type: "done", draftId: draft.draftId };
}

export function encodeSseEvent(event: ChanakyaCreditProposalStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
