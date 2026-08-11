/**
 * CO-AI-G2-W1 — Assemble a minimal Conversation Request for shadow invocation.
 */

import type { EaoConversationRequestContract } from "@/types/enterprise-ai-orchestrator";
import type { EaoShadowLiveSnapshot } from "@/types/enterprise-ai-orchestrator/shadow";
import type { EaiPersonaPackId } from "@/types/enterprise-ai-platform";
import type { EaiVoiceLanguageCode } from "@/types/enterprise-ai-voice";

export function buildEaoShadowRequest(input: {
  live: EaoShadowLiveSnapshot;
  personaPackId?: EaiPersonaPackId;
  language?: EaiVoiceLanguageCode;
  history?: EaoConversationRequestContract["history"];
}): EaoConversationRequestContract {
  const requestId = `eao_shadow_req_${crypto.randomUUID()}`;
  return {
    contractId: "eao.request.v1",
    requestId,
    sessionId: input.live.sessionId,
    conversationId: input.live.conversationId,
    personaPackId: input.personaPackId ?? "sarathi_customer",
    utterance: input.live.utterance,
    channel: "text",
    language: input.language ?? "en",
    history: input.history ?? [],
    contextPackId: `eao_shadow_ctx_${requestId}`,
    allowedToolIds: [],
    readinessHints: null,
    requestedAt: new Date().toISOString(),
    sideEffectPolicy: "propose_only",
  };
}
