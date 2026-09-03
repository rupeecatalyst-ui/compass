/**
 * CO-CHANAKYA-037 / CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001
 * / CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * Run one employee Ask CHANAKYA turn (read-only).
 * Compiles CHANAKYA Enterprise Read Context, then generates a grounded facing answer.
 */

import "server-only";

import { createCorrelationId } from "@/lib/ops/correlation";
import { compileChanakyaEnterpriseReadContext } from "@/lib/chanakya-enterprise-read-context";
import {
  CHANAKYA_INAPP_CONVERSATION_SPRINT,
  CHANAKYA_INAPP_READ_ONLY_LIMITATIONS,
} from "@/constants/chanakya-inapp-conversation";
import {
  CHANAKYA_PHASE1_NOT_IN_CATALYST_ONE_MESSAGE,
  CHANAKYA_PHASE1_SELECT_TRANSACTION_MESSAGE,
} from "@/constants/chanakya-conversational-intelligence";
import { classifyChanakyaInappIntent, planChanakyaInappCompile } from "./intent";
import {
  appendChanakyaInappTurn,
  completeChanakyaInappStreamTurn,
  persistChanakyaInappUserMessage,
  resolveChanakyaInappSession,
} from "./session";
import { bindFollowUpEntity } from "@/lib/chanakya-conversation-intelligence/follow-up";
import { isChanakyaMutationRequest } from "@/lib/chanakya-conversation-intelligence/mutation-guard";
import { buildChanakyaGroundingBrief } from "@/lib/chanakya-conversation-intelligence/grounding-brief";
import {
  generateChanakyaConversationAnswer,
  streamChanakyaConversationAnswer,
} from "@/lib/chanakya-conversation-intelligence/generate-answer";
import { actorMayIncludeDocumentExcerpts } from "@/lib/chanakya-conversation-intelligence/document-excerpt-gate";
import { classifyChanakyaPhase1Domain } from "@/lib/chanakya-conversational-intelligence/domain-gate";
import { collectChanakyaDocumentGroundingNotes } from "@/lib/chanakya-conversational-intelligence/document-grounding";
import {
  generateChanakyaChatProposalDraft,
  isChanakyaMakeProposalRequest,
  rememberUnsavedChatProposalDraft,
} from "@/lib/chanakya-conversational-intelligence/proposal-chat";
import { looksLikeUnavailableMetricQuestion } from "@/lib/chanakya-conversational-intelligence/evidence-validate";
import type {
  ChanakyaInappSession,
  ChanakyaInappTurnRequest,
  ChanakyaInappTurnResult,
} from "@/types/chanakya-inapp-conversation";
import type { ChanakyaGeneratedAnswer } from "@/lib/chanakya-conversation-intelligence/generate-answer";
import type { ChanakyaCreditProposalDraft } from "@/types/chanakya-credit-proposal";
import { redactFacingIntelligenceText } from "@/lib/chanakya-conversation-intelligence/facing-redact";

function historyFromSession(
  session: ChanakyaInappSession,
): Array<{ role: "user" | "assistant"; text: string }> {
  return session.messages
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => ({
      role: msg.role as "user" | "assistant",
      text: msg.text,
    }));
}

async function prepareTurn(input: {
  actorUserId: string;
  actorRole?: string | null;
  organizationId: string;
  request: ChanakyaInappTurnRequest;
  correlationId: string;
}) {
  const message = (input.request.message || "").trim();
  if (!message) {
    throw Object.assign(new Error("message is required"), {
      code: "MESSAGE_REQUIRED",
      statusCode: 400,
    });
  }
  if (message.length > 4000) {
    throw Object.assign(new Error("message exceeds maximum length"), {
      code: "MESSAGE_TOO_LONG",
      statusCode: 400,
    });
  }

  const requestEntity = {
    opportunityId: input.request.opportunityId?.trim() || null,
    dealId: input.request.dealId?.trim() || null,
  };

  const session = await resolveChanakyaInappSession({
    sessionId: input.request.sessionId,
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    entity: requestEntity,
    actorRole: input.actorRole,
  });

  const mutationRefused = isChanakyaMutationRequest(message);
  const domain = classifyChanakyaPhase1Domain(message);
  const intent = isChanakyaMakeProposalRequest(message)
    ? ("make_proposal" as const)
    : classifyChanakyaInappIntent(message, session.lastIntent);
  const plan = planChanakyaInappCompile(intent);

  const entity = bindFollowUpEntity({
    message,
    requestEntity,
    sessionEntity: session.activeEntity,
    focusCards: session.focusEntities ?? [],
  });

  const entityRequiredMissing =
    !mutationRefused && plan.requireEntity && !entity.opportunityId && !entity.dealId;

  let compile = null as Awaited<
    ReturnType<typeof compileChanakyaEnterpriseReadContext>
  > | null;
  let compileMode = plan.mode as ChanakyaInappTurnResult["compileMode"];
  let dataUnavailable = false;
  let compileErrorCode: string | null = null;

  if (!mutationRefused && !entityRequiredMissing) {
    try {
      compile = await compileChanakyaEnterpriseReadContext({
        mode: plan.mode,
        organizationId: input.organizationId,
        opportunityRef: entity.opportunityId,
        dealRef: entity.dealId,
        domains: plan.domains,
        changePeriod: input.request.changePeriod || plan.changePeriod || null,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        sessionId: session.sessionId,
        correlationId: input.correlationId,
        requestHint: message,
        limit: 40,
        includeDocumentExcerpts: actorMayIncludeDocumentExcerpts(input.actorRole),
      });
      compileMode = compile.mode;
    } catch {
      dataUnavailable = true;
      compileErrorCode = "DATA_UNAVAILABLE";
    }
  }

  const brief = buildChanakyaGroundingBrief({
    intent,
    entity,
    compile,
  });

  const documentNotes = collectChanakyaDocumentGroundingNotes(compile);
  const informationUnavailable =
    (intent === "document_status" &&
      !entityRequiredMissing &&
      !dataUnavailable &&
      documentNotes.length === 0 &&
      brief.documentNotes.length === 0) ||
    looksLikeUnavailableMetricQuestion(message);

  return {
    message,
    session,
    mutationRefused,
    domain,
    intent,
    entity,
    entityRequiredMissing,
    compile,
    compileMode,
    dataUnavailable,
    compileErrorCode,
    brief,
    informationUnavailable,
  };
}

function facingResultMessages(session: { messages: ChanakyaInappTurnResult["messages"] }) {
  return session.messages.map((msg) => ({
    ...msg,
    provenance: [],
    availabilityNotes: [],
  }));
}

export async function runChanakyaInappConversationTurn(input: {
  actorUserId: string;
  actorRole?: string | null;
  organizationId: string;
  request: ChanakyaInappTurnRequest;
}): Promise<ChanakyaInappTurnResult> {
  const correlationId = createCorrelationId();
  const prepared = await prepareTurn({ ...input, correlationId });
  const turnKey = input.request.idempotencyKey;

  if (prepared.intent === "make_proposal" && !prepared.mutationRefused) {
    if (prepared.entityRequiredMissing || !prepared.entity.opportunityId) {
      const generated: ChanakyaGeneratedAnswer = {
        text: CHANAKYA_PHASE1_SELECT_TRANSACTION_MESSAGE,
        modelStatus: "context_missing",
        evidence: [],
        freshness: prepared.brief.freshnessLabel,
        diagnostics: { reason: "proposal_needs_transaction" },
      };
      const appended = await appendChanakyaInappTurn({
        session: prepared.session,
        userText: prepared.message,
        replyText: generated.text,
        intent: prepared.intent,
        provenance: [],
        availabilityNotes: ["proposal_needs_transaction"],
        entity: prepared.entity,
        evidence: [],
        focusEntities: prepared.brief.interventionCards,
        idempotencyKey: turnKey,
      });
      return {
        sprint: CHANAKYA_INAPP_CONVERSATION_SPRINT,
        sessionId: appended.session.sessionId,
        readOnly: true,
        correlationId,
        intent: prepared.intent,
        compileMode: null,
        reply: appended.assistant,
        messages: facingResultMessages(appended.session),
        activeEntity: appended.session.activeEntity,
        limitations: [...CHANAKYA_INAPP_READ_ONLY_LIMITATIONS],
        errorCode: null,
        evidence: [],
        freshness: generated.freshness,
        modelStatus: generated.modelStatus,
      };
    }

    try {
      const draft = await generateChanakyaChatProposalDraft({
        opportunityId: prepared.entity.opportunityId,
        dealId: prepared.entity.dealId,
      });
      await rememberUnsavedChatProposalDraft({
        draft,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        sessionId: prepared.session.sessionId,
      });
      const generated: ChanakyaGeneratedAnswer = {
        text: redactFacingIntelligenceText(draft.fullText),
        modelStatus: "generated",
        evidence: [],
        freshness: prepared.brief.freshnessLabel,
        diagnostics: { reason: "credit_workbench_proposal" },
      };
      const appended = await appendChanakyaInappTurn({
        session: prepared.session,
        userText: prepared.message,
        replyText: generated.text,
        intent: prepared.intent,
        provenance: [],
        availabilityNotes: [],
        entity: prepared.entity,
        evidence: [],
        focusEntities: prepared.brief.interventionCards,
        proposalDraftId: draft.draftId,
        idempotencyKey: turnKey,
      });
      return {
        sprint: CHANAKYA_INAPP_CONVERSATION_SPRINT,
        sessionId: appended.session.sessionId,
        readOnly: true,
        correlationId,
        intent: prepared.intent,
        compileMode: prepared.compileMode,
        reply: { ...appended.assistant, proposalDraftId: draft.draftId },
        messages: facingResultMessages(appended.session),
        activeEntity: appended.session.activeEntity,
        limitations: [
          ...CHANAKYA_INAPP_READ_ONLY_LIMITATIONS,
          ...(prepared.compile?.limitations ?? []).slice(0, 6),
        ],
        errorCode: prepared.compileErrorCode,
        evidence: [],
        freshness: generated.freshness,
        modelStatus: generated.modelStatus,
      };
    } catch {
      const generated: ChanakyaGeneratedAnswer = {
        text: CHANAKYA_PHASE1_NOT_IN_CATALYST_ONE_MESSAGE,
        modelStatus: "not_in_catalyst_one",
        evidence: [],
        freshness: prepared.brief.freshnessLabel,
        diagnostics: { reason: "proposal_unavailable" },
      };
      const appended = await appendChanakyaInappTurn({
        session: prepared.session,
        userText: prepared.message,
        replyText: generated.text,
        intent: prepared.intent,
        provenance: [],
        availabilityNotes: ["proposal_unavailable"],
        entity: prepared.entity,
        evidence: [],
        focusEntities: prepared.brief.interventionCards,
        idempotencyKey: turnKey,
      });
      return {
        sprint: CHANAKYA_INAPP_CONVERSATION_SPRINT,
        sessionId: appended.session.sessionId,
        readOnly: true,
        correlationId,
        intent: prepared.intent,
        compileMode: prepared.compileMode,
        reply: appended.assistant,
        messages: facingResultMessages(appended.session),
        activeEntity: appended.session.activeEntity,
        limitations: [...CHANAKYA_INAPP_READ_ONLY_LIMITATIONS],
        errorCode: prepared.compileErrorCode,
        evidence: [],
        freshness: generated.freshness,
        modelStatus: generated.modelStatus,
      };
    }
  }

  const generated = await generateChanakyaConversationAnswer({
    question: prepared.message,
    brief: prepared.brief,
    history: historyFromSession(prepared.session),
    mutationRefused: prepared.mutationRefused,
    entityRequiredMissing: prepared.entityRequiredMissing,
    dataUnavailable: prepared.dataUnavailable,
    domain: prepared.domain,
    informationUnavailable: prepared.informationUnavailable,
  });

  const appended = await appendChanakyaInappTurn({
    session: prepared.session,
    userText: prepared.message,
    replyText: generated.text,
    intent: prepared.intent,
    provenance: [],
    availabilityNotes: generated.diagnostics ? [generated.diagnostics.reason] : [],
    entity: prepared.entity,
    evidence: generated.evidence,
    focusEntities: prepared.brief.interventionCards,
    idempotencyKey: turnKey,
  });

  return {
    sprint: CHANAKYA_INAPP_CONVERSATION_SPRINT,
    sessionId: appended.session.sessionId,
    readOnly: true,
    correlationId,
    intent: prepared.intent,
    compileMode:
      prepared.entityRequiredMissing || prepared.dataUnavailable ? null : prepared.compileMode,
    reply: appended.assistant,
    messages: facingResultMessages(appended.session),
    activeEntity: appended.session.activeEntity,
    limitations: [
      ...CHANAKYA_INAPP_READ_ONLY_LIMITATIONS,
      ...(prepared.compile?.limitations ?? []).slice(0, 6),
    ],
    errorCode: prepared.compileErrorCode,
    evidence: generated.evidence,
    freshness: generated.freshness,
    modelStatus: generated.modelStatus,
  };
}

export async function* runChanakyaInappConversationTurnStream(input: {
  actorUserId: string;
  actorRole?: string | null;
  organizationId: string;
  request: ChanakyaInappTurnRequest;
  signal?: AbortSignal;
}): AsyncGenerator<
  | { type: "session"; sessionId: string }
  | { type: "delta"; text: string }
  | { type: "proposal"; draft: ChanakyaCreditProposalDraft; saved: false }
  | { type: "done"; result: ChanakyaInappTurnResult }
  | { type: "cancelled" },
  void,
  void
> {
  const correlationId = createCorrelationId();
  const prepared = await prepareTurn({ ...input, correlationId });
  yield { type: "session", sessionId: prepared.session.sessionId };

  if (input.signal?.aborted) {
    yield { type: "cancelled" };
    return;
  }

  if (prepared.intent === "make_proposal" && !prepared.mutationRefused) {
    const result = await runChanakyaInappConversationTurn(input);
    if (result.reply.proposalDraftId) {
      const { getUnsavedChatProposalDraft } = await import(
        "@/lib/chanakya-conversational-intelligence/proposal-chat"
      );
      const draft = await getUnsavedChatProposalDraft({
        draftId: result.reply.proposalDraftId,
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        sessionId: result.sessionId,
      });
      if (draft) {
        yield { type: "proposal", draft, saved: false as const };
        yield { type: "delta", text: result.reply.text };
        yield { type: "done", result };
        return;
      }
    }
    yield { type: "delta", text: result.reply.text };
    yield { type: "done", result };
    return;
  }

  await persistChanakyaInappUserMessage({
    session: prepared.session,
    userText: prepared.message,
    intent: prepared.intent,
    entity: prepared.entity,
    idempotencyKey: input.request.idempotencyKey,
  });

  let assembled = "";
  let generated: ChanakyaGeneratedAnswer | null = null;
  for await (const event of streamChanakyaConversationAnswer({
    question: prepared.message,
    brief: prepared.brief,
    history: historyFromSession(prepared.session),
    mutationRefused: prepared.mutationRefused,
    entityRequiredMissing: prepared.entityRequiredMissing,
    dataUnavailable: prepared.dataUnavailable,
    domain: prepared.domain,
    informationUnavailable: prepared.informationUnavailable,
    signal: input.signal,
  })) {
    if (event.text) {
      assembled += event.text;
      yield { type: "delta", text: event.text };
    }
    if (event.done) generated = event.done;
  }

  if (input.signal?.aborted) {
    yield { type: "cancelled" };
    return;
  }

  const finalAnswer: ChanakyaGeneratedAnswer = generated ?? {
    text: redactFacingIntelligenceText(assembled),
    modelStatus: assembled.trim() ? "generated" : "unavailable",
    evidence: [],
    freshness: prepared.brief.freshnessLabel,
    diagnostics: assembled.trim() ? null : { reason: "model_unavailable" },
  };

  if (!finalAnswer.text.trim()) {
    yield { type: "cancelled" };
    return;
  }

  const completed = await completeChanakyaInappStreamTurn({
    session: prepared.session,
    userText: prepared.message,
    replyText: finalAnswer.text,
    intent: prepared.intent,
    entity: prepared.entity,
    evidence: finalAnswer.evidence,
    focusEntities: prepared.brief.interventionCards,
  });
  if (!completed.assistant) {
    yield { type: "cancelled" };
    return;
  }

  yield {
    type: "done",
    result: {
      sprint: CHANAKYA_INAPP_CONVERSATION_SPRINT,
      sessionId: completed.session.sessionId,
      readOnly: true,
      correlationId,
      intent: prepared.intent,
      compileMode:
        prepared.entityRequiredMissing || prepared.dataUnavailable
          ? null
          : prepared.compileMode,
      reply: completed.assistant,
      messages: facingResultMessages(completed.session),
      activeEntity: completed.session.activeEntity,
      limitations: [
        ...CHANAKYA_INAPP_READ_ONLY_LIMITATIONS,
        ...(prepared.compile?.limitations ?? []).slice(0, 6),
      ],
      errorCode: prepared.compileErrorCode,
      evidence: finalAnswer.evidence,
      freshness: finalAnswer.freshness,
      modelStatus: finalAnswer.modelStatus,
    },
  };
}