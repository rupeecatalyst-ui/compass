/**
 * CO-CHANAKYA-037 / CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001
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
import { classifyChanakyaInappIntent, planChanakyaInappCompile } from "./intent";
import {
  appendChanakyaInappTurn,
  resolveChanakyaInappSession,
} from "./session";
import { bindFollowUpEntity } from "@/lib/chanakya-conversation-intelligence/follow-up";
import { isChanakyaMutationRequest } from "@/lib/chanakya-conversation-intelligence/mutation-guard";
import { buildChanakyaGroundingBrief } from "@/lib/chanakya-conversation-intelligence/grounding-brief";
import { generateChanakyaConversationAnswer } from "@/lib/chanakya-conversation-intelligence/generate-answer";
import { actorMayIncludeDocumentExcerpts } from "@/lib/chanakya-conversation-intelligence/document-excerpt-gate";
import type {
  ChanakyaInappTurnRequest,
  ChanakyaInappTurnResult,
} from "@/types/chanakya-inapp-conversation";

export async function runChanakyaInappConversationTurn(input: {
  actorUserId: string;
  actorRole?: string | null;
  organizationId: string;
  request: ChanakyaInappTurnRequest;
}): Promise<ChanakyaInappTurnResult> {
  const correlationId = createCorrelationId();
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

  const session = resolveChanakyaInappSession({
    sessionId: input.request.sessionId,
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    entity: requestEntity,
  });

  const mutationRefused = isChanakyaMutationRequest(message);
  const intent = classifyChanakyaInappIntent(message, session.lastIntent);
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
        correlationId,
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

  const generated = await generateChanakyaConversationAnswer({
    question: message,
    brief,
    history: session.messages
      .filter((msg) => msg.role === "user" || msg.role === "assistant")
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        text: msg.text,
      })),
    mutationRefused,
    entityRequiredMissing,
    dataUnavailable,
  });

  const { assistant } = appendChanakyaInappTurn({
    session,
    userText: message,
    replyText: generated.text,
    intent,
    provenance: [],
    availabilityNotes: generated.diagnostics ? [generated.diagnostics.reason] : [],
    entity,
    evidence: generated.evidence,
    focusEntities: brief.interventionCards,
  });

  return {
    sprint: CHANAKYA_INAPP_CONVERSATION_SPRINT,
    sessionId: session.sessionId,
    readOnly: true,
    correlationId,
    intent,
    compileMode: entityRequiredMissing || dataUnavailable ? null : compileMode,
    reply: assistant,
    messages: session.messages.map((msg) => ({
      ...msg,
      provenance: [],
      availabilityNotes: [],
    })),
    activeEntity: session.activeEntity,
    limitations: [
      ...CHANAKYA_INAPP_READ_ONLY_LIMITATIONS,
      ...(compile?.limitations ?? []).slice(0, 6),
    ],
    errorCode: compileErrorCode,
    evidence: generated.evidence,
    freshness: generated.freshness,
    modelStatus: generated.modelStatus,
  };
}
