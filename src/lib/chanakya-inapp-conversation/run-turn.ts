/**
 * CO-CHANAKYA-037 — Run one employee Ask CHANAKYA turn (read-only).
 * Compiles CHANAKYA Enterprise Read Context, then composes an evidence-first reply.
 */

import "server-only";

import { createCorrelationId } from "@/lib/ops/correlation";
import { compileChanakyaEnterpriseReadContext } from "@/lib/chanakya-enterprise-read-context";
import {
  CHANAKYA_INAPP_CONVERSATION_SPRINT,
  CHANAKYA_INAPP_READ_ONLY_LIMITATIONS,
} from "@/constants/chanakya-inapp-conversation";
import { composeChanakyaInappAnswer } from "./compose-answer";
import { classifyChanakyaInappIntent, planChanakyaInappCompile } from "./intent";
import {
  appendChanakyaInappTurn,
  resolveChanakyaInappSession,
} from "./session";
import type {
  ChanakyaInappTurnRequest,
  ChanakyaInappTurnResult,
} from "@/types/chanakya-inapp-conversation";

export async function runChanakyaInappConversationTurn(input: {
  actorUserId: string;
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

  const entity = {
    opportunityId:
      requestEntity.opportunityId || session.activeEntity.opportunityId || null,
    dealId: requestEntity.dealId || session.activeEntity.dealId || null,
  };

  const intent = classifyChanakyaInappIntent(message, session.lastIntent);
  const plan = planChanakyaInappCompile(intent);
  const entityRequiredMissing =
    plan.requireEntity && !entity.opportunityId && !entity.dealId;

  let compile = null as Awaited<
    ReturnType<typeof compileChanakyaEnterpriseReadContext>
  > | null;
  let compileMode = plan.mode as ChanakyaInappTurnResult["compileMode"];

  if (!entityRequiredMissing) {
    try {
      compile = await compileChanakyaEnterpriseReadContext({
        mode: plan.mode,
        organizationId: input.organizationId,
        opportunityRef: entity.opportunityId,
        dealRef: entity.dealId,
        domains: plan.domains,
        changePeriod: input.request.changePeriod || plan.changePeriod || null,
        actorUserId: input.actorUserId,
        sessionId: session.sessionId,
        correlationId,
        requestHint: message,
        limit: 40,
      });
      compileMode = compile.mode;
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code || "COMPILE_FAILED")
          : "COMPILE_FAILED";
      const composed = composeChanakyaInappAnswer({
        intent,
        question: message,
        entity,
        compile: null,
        entityRequiredMissing: false,
      });
      const { assistant } = appendChanakyaInappTurn({
        session,
        userText: message,
        replyText: [
          composed.text,
          `Enterprise read context could not be compiled (${code}). No fabricated fallback was used.`,
        ].join("\n\n"),
        intent,
        provenance: [...composed.provenance, `compile_error:${code}`],
        availabilityNotes: [...composed.availabilityNotes, `compile_error:${code}`],
        entity,
      });

      return {
        sprint: CHANAKYA_INAPP_CONVERSATION_SPRINT,
        sessionId: session.sessionId,
        readOnly: true,
        correlationId,
        intent,
        compileMode: null,
        reply: assistant,
        messages: session.messages,
        activeEntity: session.activeEntity,
        limitations: [...CHANAKYA_INAPP_READ_ONLY_LIMITATIONS],
        errorCode: code,
      };
    }
  }

  const composed = composeChanakyaInappAnswer({
    intent,
    question: message,
    entity,
    compile,
    entityRequiredMissing,
  });

  const { assistant } = appendChanakyaInappTurn({
    session,
    userText: message,
    replyText: composed.text,
    intent,
    provenance: composed.provenance,
    availabilityNotes: composed.availabilityNotes,
    entity,
  });

  return {
    sprint: CHANAKYA_INAPP_CONVERSATION_SPRINT,
    sessionId: session.sessionId,
    readOnly: true,
    correlationId,
    intent,
    compileMode: entityRequiredMissing ? null : compileMode,
    reply: assistant,
    messages: session.messages,
    activeEntity: session.activeEntity,
    limitations: [
      ...CHANAKYA_INAPP_READ_ONLY_LIMITATIONS,
      ...(compile?.limitations ?? []).slice(0, 6),
    ],
    errorCode: null,
  };
}
