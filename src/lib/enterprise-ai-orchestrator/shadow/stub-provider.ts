/**
 * CO-AI-G2-W1 — Shadow reasoning stub provider.
 * Produces a structured Orchestrator response for silent parallel invocation.
 * Not customer-facing. Does not invent EMI / eligibility / approval numbers.
 */

import type {
  EaoConversationRequestContract,
  EaoConversationResponseContract,
  EaoModelProviderPort,
} from "@/types/enterprise-ai-orchestrator";

export const EAO_SHADOW_STUB_PROVIDER_ID = "eao.shadow.stub" as const;
export const EAO_SHADOW_STUB_CONFIG_VERSION = "g2-w1.stub.1" as const;

function inferObjective(
  utterance: string,
): EaoConversationResponseContract["objective"] {
  const u = utterance.trim();
  if (/^(how|why|what|when|where|can i)\b/i.test(u) || /\?/.test(u)) return "answer";
  if (/document|paper|kyc/i.test(u)) return "educate";
  if (/yes|okay|ok|continue|sure/i.test(u) && u.length < 24) return "ask";
  return "clarify";
}

function buildShadowFacing(utterance: string, language: string): string {
  const objective = inferObjective(utterance);
  // Neutral consultant-shaped draft for comparison only — no fabricated rates.
  if (objective === "answer") {
    return language === "hi"
      ? "यह एक उचित प्रश्न है। समयसीमा और पात्रता प्रोफ़ाइल तथा दस्तावेज़ों पर निर्भर करती है — मैं अनुमानित आंकड़े नहीं बताऊँगा।"
      : "That's a fair question. Timelines and fit depend on your profile and documents — I won't invent numbers, but I can guide what typically matters next.";
  }
  if (objective === "educate") {
    return "Document needs usually follow your product and profile. I can outline the usual categories once we confirm the loan type you're exploring.";
  }
  if (objective === "ask") {
    return "Understood. To keep guidance specific, what is the main purpose of the funding you're exploring?";
  }
  return "Thank you for sharing that. To advise accurately, it helps to know which loan type you're exploring and roughly how much funding you need.";
}

export function createEaoShadowStubProvider(): EaoModelProviderPort {
  return {
    providerId: EAO_SHADOW_STUB_PROVIDER_ID,
    configVersion: EAO_SHADOW_STUB_CONFIG_VERSION,
    capabilities: {
      streaming: false,
      toolCalling: false,
      languages: ["en", "hi", "mr"],
    },
    async complete(
      request: EaoConversationRequestContract,
    ): Promise<EaoConversationResponseContract> {
      const objective = inferObjective(request.utterance);
      return {
        contractId: "eao.response.v1",
        requestId: request.requestId,
        responseId: `eao_shadow_resp_${crypto.randomUUID()}`,
        objective,
        facingText: buildShadowFacing(request.utterance, request.language),
        language: request.language,
        trustState: "unvalidated",
        memoryWriteIntents: [],
        proposalIntents: [],
        toolCallsRequested: [],
        modelProviderId: EAO_SHADOW_STUB_PROVIDER_ID,
        modelConfigVersion: EAO_SHADOW_STUB_CONFIG_VERSION,
        completedAt: new Date().toISOString(),
      };
    },
  };
}
