/**
 * LLM Provider Abstraction — vendor-invisible completion surface (CO-AI-101 + AI-4A).
 * Platform code must call these helpers; never import vendor LLM SDKs here.
 * Domain Boundary / Policy Gate may short-circuit before any provider call.
 */

import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import { getEaiPorts } from "./composition";
import { assertEaiLlmReasoningAllowed } from "./policy-gate";
import type {
  EaiLlmCompletionRequest,
  EaiLlmCompletionResult,
  EaiLlmProvider,
  EaiPolicyDecision,
} from "@/types/enterprise-ai-platform";

export function getActiveEaiLlmProvider(): EaiLlmProvider {
  return getEaiPorts().llmProvider;
}

export function getActiveEaiLlmProviderId(): string {
  return getEaiPorts().llmProvider.providerId;
}

/**
 * Complete via the configured provider.
 * When a Policy Decision is supplied and Domain Boundary blocks, the provider is never called.
 * Does not modify LLM prompts.
 */
export async function completeEaiLlm(
  request: EaiLlmCompletionRequest,
  policyDecision?: EaiPolicyDecision,
): Promise<EaiLlmCompletionResult> {
  if (policyDecision) {
    const gate = assertEaiLlmReasoningAllowed(policyDecision);
    if (!gate.ok) {
      return {
        requestId: request.requestId,
        providerId: "eai.domain-boundary",
        modelId: "domain-governance",
        content: gate.refusalText ?? EAI_OUTSIDE_DOMAIN_REFUSAL,
        finishReason: "blocked",
        rawProviderMeta: {
          blockedBy: "domain_boundary",
          reason: gate.reason,
        },
      };
    }
  }
  return getEaiPorts().llmProvider.complete(request);
}

/**
 * Extension point: swap providers via composition without touching business modules.
 * Example (future): configureEaiPorts({ llmProvider: createExternalProviderAdapter(...) })
 */
export type { EaiLlmProvider };
