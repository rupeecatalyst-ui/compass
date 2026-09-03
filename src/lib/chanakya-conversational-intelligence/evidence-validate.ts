/**
 * CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * Post-generation evidence checks — never ship invented ratios or contact channels.
 */

import {
  CHANAKYA_INAPP_PHASE2_RATIO_TERMS,
} from "@/constants/chanakya-inapp-conversation";
import { CHANAKYA_PHASE1_NOT_IN_CATALYST_ONE_MESSAGE } from "@/constants/chanakya-conversational-intelligence";
import { redactFacingIntelligenceText } from "@/lib/chanakya-conversation-intelligence/facing-redact";
import type { ChanakyaGroundingBrief } from "@/types/chanakya-conversation-intelligence";

const INVENTED_RATIO =
  /\b(FOIR|DSCR|LTV|DBR)\s*(=|is|of|:)?\s*\d+(\.\d+)?\s*%?/i;

const BEST_LENDER = /\b(best lender|guaranteed sanction|sanction certainty|will be sanctioned)\b/i;

function briefMentionsTerm(brief: ChanakyaGroundingBrief, term: string): boolean {
  const blob = JSON.stringify(brief).toLowerCase();
  return blob.includes(term.toLowerCase());
}

export function looksLikeUnavailableMetricQuestion(question: string): boolean {
  const q = (question || "").toLowerCase();
  return CHANAKYA_INAPP_PHASE2_RATIO_TERMS.some((term) =>
    new RegExp(`\\b${term}\\b`, "i").test(q),
  );
}

export function validateChanakyaGeneratedEvidence(input: {
  text: string;
  brief: ChanakyaGroundingBrief;
  question: string;
}): { text: string; rejectedInventedMetrics: boolean } {
  let text = redactFacingIntelligenceText(input.text);
  let rejectedInventedMetrics = false;

  if (INVENTED_RATIO.test(text)) {
    const allowed = CHANAKYA_INAPP_PHASE2_RATIO_TERMS.some((term) =>
      briefMentionsTerm(input.brief, term),
    );
    if (!allowed) {
      text = CHANAKYA_PHASE1_NOT_IN_CATALYST_ONE_MESSAGE;
      rejectedInventedMetrics = true;
    }
  }

  if (BEST_LENDER.test(text)) {
    text = text.replace(BEST_LENDER, "an authorised lender comparison");
  }

  return { text: redactFacingIntelligenceText(text), rejectedInventedMetrics };
}

export function groundingHasAuthorisedFacts(brief: ChanakyaGroundingBrief): boolean {
  return Boolean(
    brief.interventionCards.length > 0 ||
      brief.deskSummary ||
      brief.entityNotes.length > 0 ||
      brief.creditSummary ||
      brief.lenderSummary ||
      brief.documentNotes.length > 0 ||
      brief.changeSummary,
  );
}
