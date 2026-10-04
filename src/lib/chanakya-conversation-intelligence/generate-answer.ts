/**
 * CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001 / CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * Generate a user-facing CHANAKYA answer from the shared grounding brief.
 */

import {
  CHANAKYA_CONTEXT_MISSING_MESSAGE,
  CHANAKYA_CONVERSATION_SYSTEM_PROMPT,
  CHANAKYA_MUTATION_REFUSED_MESSAGE,
  CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE,
} from "@/constants/chanakya-conversation-intelligence";
import {
  CHANAKYA_PHASE1_MIXED_REFUSAL_SUFFIX,
  CHANAKYA_PHASE1_NOT_IN_CATALYST_ONE_MESSAGE,
  CHANAKYA_PHASE1_OUT_OF_DOMAIN_MESSAGE,
} from "@/constants/chanakya-conversational-intelligence";
import type {
  ChanakyaConversationEvidenceLink,
  ChanakyaConversationModelStatus,
  ChanakyaGroundingBrief,
} from "@/types/chanakya-conversation-intelligence";
import type { ChanakyaPhase1DomainDecision } from "@/types/chanakya-conversational-intelligence";
import { redactFacingIntelligenceText } from "./facing-redact";
import { getChanakyaConversationModelPort } from "./model-port";
import {
  classifyChanakyaPhase1Domain,
  isChanakyaPhase1OutOfDomain,
} from "@/lib/chanakya-conversational-intelligence/domain-gate";
import { isChanakyaWebResearchEnabled } from "@/lib/chanakya-conversational-intelligence/web-research-flag";
import {
  groundingHasAuthorisedFacts,
  looksLikeUnavailableMetricQuestion,
  validateChanakyaGeneratedEvidence,
} from "@/lib/chanakya-conversational-intelligence/evidence-validate";

export type ChanakyaGeneratedAnswer = {
  text: string;
  modelStatus: ChanakyaConversationModelStatus;
  evidence: ChanakyaConversationEvidenceLink[];
  freshness: string | null;
  diagnostics: { reason: string } | null;
};

function evidenceFromBrief(brief: ChanakyaGroundingBrief): ChanakyaConversationEvidenceLink[] {
  return brief.interventionCards.slice(0, 8).map((card) => ({
    label: [card.dealRef || card.opportunityRef, card.customerName, card.stage]
      .filter(Boolean)
      .join(" · "),
    href: card.href,
    opportunityRef: card.opportunityRef,
    dealRef: card.dealRef,
    stage: card.stage,
    lastUpdated: card.lastUpdated,
    freshness: card.freshness,
  }));
}

function buildUserPrompt(input: {
  question: string;
  brief: ChanakyaGroundingBrief;
  entityRequiredMissing: boolean;
}): string {
  return [
    `Employee question: ${input.question}`,
    input.entityRequiredMissing ? "Case context is missing." : "",
    "Approved internal sources only. Web research is disabled.",
    "Grounding brief (authorised, privacy-redacted, live operational evidence):",
    JSON.stringify(input.brief),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function canned(input: {
  text: string;
  modelStatus: ChanakyaConversationModelStatus;
  evidence?: ChanakyaConversationEvidenceLink[];
  freshness: string | null;
  reason: string | null;
}): ChanakyaGeneratedAnswer {
  return {
    text: input.text,
    modelStatus: input.modelStatus,
    evidence: input.evidence ?? [],
    freshness: input.freshness,
    diagnostics: input.reason ? { reason: input.reason } : null,
  };
}

function resolveDomain(
  question: string,
  domain?: ChanakyaPhase1DomainDecision,
): ChanakyaPhase1DomainDecision {
  return domain ?? classifyChanakyaPhase1Domain(question);
}

export async function generateChanakyaConversationAnswer(input: {
  question: string;
  brief: ChanakyaGroundingBrief;
  history: Array<{ role: "user" | "assistant"; text: string }>;
  mutationRefused: boolean;
  entityRequiredMissing: boolean;
  dataUnavailable: boolean;
  domain?: ChanakyaPhase1DomainDecision;
  informationUnavailable?: boolean;
  signal?: AbortSignal;
}): Promise<ChanakyaGeneratedAnswer> {
  const evidence = input.dataUnavailable ? [] : evidenceFromBrief(input.brief);
  const freshness = input.brief.freshnessLabel;
  const domain = resolveDomain(input.question, input.domain);

  if (input.mutationRefused) {
    return canned({
      text: CHANAKYA_MUTATION_REFUSED_MESSAGE,
      modelStatus: "refused",
      freshness,
      reason: "mutation_refused",
    });
  }

  void isChanakyaWebResearchEnabled();
  if (isChanakyaPhase1OutOfDomain(domain.kind)) {
    return canned({
      text: CHANAKYA_PHASE1_OUT_OF_DOMAIN_MESSAGE,
      modelStatus: "out_of_domain",
      freshness,
      reason: domain.kind,
    });
  }

  if (input.dataUnavailable) {
    return canned({
      text: CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE,
      modelStatus: "unavailable",
      freshness: null,
      reason: "data_unavailable",
    });
  }

  if (input.entityRequiredMissing) {
    return canned({
      text: CHANAKYA_CONTEXT_MISSING_MESSAGE,
      modelStatus: "context_missing",
      freshness,
      reason: null,
    });
  }

  if (input.informationUnavailable || looksLikeUnavailableMetricQuestion(input.question)) {
    return canned({
      text: CHANAKYA_PHASE1_NOT_IN_CATALYST_ONE_MESSAGE,
      modelStatus: "not_in_catalyst_one",
      evidence,
      freshness,
      reason: "not_in_catalyst_one",
    });
  }

  const questionForModel = domain.catalystOnePortion || input.question;

  const port = getChanakyaConversationModelPort();
  let raw: string | null = null;
  try {
    raw = await port.generate({
      systemPrompt: CHANAKYA_CONVERSATION_SYSTEM_PROMPT,
      userPrompt: buildUserPrompt({
        question: questionForModel,
        brief: input.brief,
        entityRequiredMissing: input.entityRequiredMissing,
      }),
      history: input.history.map((turn) => ({
        role: turn.role,
        text: redactFacingIntelligenceText(turn.text),
      })),
      signal: input.signal,
    });
  } catch {
    raw = null;
  }

  if (!raw?.trim()) {
    if (!groundingHasAuthorisedFacts(input.brief)) {
      return canned({
        text: CHANAKYA_PHASE1_NOT_IN_CATALYST_ONE_MESSAGE,
        modelStatus: "not_in_catalyst_one",
        evidence,
        freshness,
        reason: "empty_authorised_facts",
      });
    }
    return canned({
      text: CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE,
      modelStatus: "unavailable",
      freshness: null,
      reason: "model_unavailable",
    });
  }

  const validated = validateChanakyaGeneratedEvidence({
    text: raw,
    brief: input.brief,
    question: input.question,
  });
  let text = validated.text;
  if (domain.kind === "mixed") {
    text = `${text}${CHANAKYA_PHASE1_MIXED_REFUSAL_SUFFIX}`;
  }

  return {
    text: redactFacingIntelligenceText(text),
    modelStatus: validated.rejectedInventedMetrics ? "not_in_catalyst_one" : "generated",
    evidence,
    freshness,
    diagnostics: validated.rejectedInventedMetrics
      ? { reason: "invented_metrics_rejected" }
      : null,
  };
}

/**
 * Stream genuine model tokens. Canned answers emit a single chunk (no fake typing timer).
 */
export async function* streamChanakyaConversationAnswer(input: {
  question: string;
  brief: ChanakyaGroundingBrief;
  history: Array<{ role: "user" | "assistant"; text: string }>;
  mutationRefused: boolean;
  entityRequiredMissing: boolean;
  dataUnavailable: boolean;
  domain?: ChanakyaPhase1DomainDecision;
  informationUnavailable?: boolean;
  signal?: AbortSignal;
}): AsyncGenerator<{ text?: string; done?: ChanakyaGeneratedAnswer }, void, void> {
  const domain = resolveDomain(input.question, input.domain);
  const shouldStreamModel =
    !input.mutationRefused &&
    !isChanakyaPhase1OutOfDomain(domain.kind) &&
    !input.dataUnavailable &&
    !input.entityRequiredMissing &&
    !input.informationUnavailable &&
    !looksLikeUnavailableMetricQuestion(input.question);

  if (!shouldStreamModel) {
    const answer = await generateChanakyaConversationAnswer({ ...input, domain });
    yield { text: answer.text };
    yield { done: answer };
    return;
  }

  const evidence = evidenceFromBrief(input.brief);
  const freshness = input.brief.freshnessLabel;
  const port = getChanakyaConversationModelPort();
  const questionForModel = domain.catalystOnePortion || input.question;
  const prompt = buildUserPrompt({
    question: questionForModel,
    brief: input.brief,
    entityRequiredMissing: false,
  });
  const history = input.history.map((turn) => ({
    role: turn.role,
    text: redactFacingIntelligenceText(turn.text),
  }));

  let assembled = "";
  try {
    if (port.stream) {
      for await (const piece of port.stream({
        systemPrompt: CHANAKYA_CONVERSATION_SYSTEM_PROMPT,
        userPrompt: prompt,
        history,
        signal: input.signal,
      })) {
        if (input.signal?.aborted) break;
        assembled += piece;
        yield { text: redactFacingIntelligenceText(piece) };
      }
    } else {
      const full = await port.generate({
        systemPrompt: CHANAKYA_CONVERSATION_SYSTEM_PROMPT,
        userPrompt: prompt,
        history,
        signal: input.signal,
      });
      if (full?.trim()) {
        assembled = full;
        yield { text: redactFacingIntelligenceText(full) };
      }
    }
  } catch {
    assembled = assembled.trim();
  }

  if (input.signal?.aborted) {
    const partial = redactFacingIntelligenceText(assembled);
    yield {
      done: {
        text: partial,
        modelStatus: partial ? "generated" : "unavailable",
        evidence,
        freshness,
        diagnostics: { reason: "cancelled" },
      },
    };
    return;
  }

  if (!assembled.trim()) {
    const fallback = await generateChanakyaConversationAnswer({ ...input, domain });
    if (fallback.text && fallback.modelStatus !== "generated") {
      yield { text: fallback.text };
    }
    yield { done: fallback };
    return;
  }

  const validated = validateChanakyaGeneratedEvidence({
    text: assembled,
    brief: input.brief,
    question: input.question,
  });
  let text = validated.text;
  if (domain.kind === "mixed") {
    const suffix = CHANAKYA_PHASE1_MIXED_REFUSAL_SUFFIX;
    if (!text.endsWith(suffix.trim())) {
      yield { text: suffix };
      text = `${text}${suffix}`;
    }
  }

  yield {
    done: {
      text: redactFacingIntelligenceText(text),
      modelStatus: validated.rejectedInventedMetrics ? "not_in_catalyst_one" : "generated",
      evidence,
      freshness,
      diagnostics: validated.rejectedInventedMetrics
        ? { reason: "invented_metrics_rejected" }
        : null,
    },
  };
}
