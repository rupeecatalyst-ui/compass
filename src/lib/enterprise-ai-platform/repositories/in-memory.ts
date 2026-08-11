/**
 * Enterprise AI Platform — in-memory adapters (CO-AI-101).
 * Framework storage only; production persistence arrives in a later sprint.
 */

import type {
  EaiActionProposal,
  EaiCompiledContext,
  EaiConversationTurn,
  EaiInteractionRecord,
  EaiLlmCompletionRequest,
  EaiLlmCompletionResult,
  EaiLlmProvider,
  EaiSession,
  EaiToolDefinition,
} from "@/types/enterprise-ai-platform";
import type { EaiPorts } from "@/types/enterprise-ai-platform-ports";
import {
  EAI_STUB_LLM_MODEL_ID,
  EAI_STUB_LLM_PROVIDER_ID,
} from "@/constants/enterprise-ai-platform";

function createMutableListStore<T>() {
  let items: T[] = [];
  return {
    list: () => items,
    replaceAll: (next: T[]) => {
      items = next;
    },
    upsert: (item: T, key: (item: T) => string) => {
      const id = key(item);
      items = [item, ...items.filter((i) => key(i) !== id)];
    },
  };
}

/** Deterministic stub provider — never calls an external LLM. */
export function createStubEaiLlmProvider(): EaiLlmProvider {
  return {
    providerId: EAI_STUB_LLM_PROVIDER_ID,
    async complete(request: EaiLlmCompletionRequest): Promise<EaiLlmCompletionResult> {
      const lastUser = [...request.messages].reverse().find((m) => m.role === "user");
      return {
        requestId: request.requestId,
        providerId: EAI_STUB_LLM_PROVIDER_ID,
        modelId: EAI_STUB_LLM_MODEL_ID,
        content: lastUser?.content
          ? `[stub] Acknowledged: ${lastUser.content.slice(0, 240)}`
          : "[stub] No user message provided.",
        finishReason: "stop",
        usage: { promptTokens: 0, completionTokens: 0 },
        rawProviderMeta: { mode: "stub" },
      };
    },
  };
}

export function createInMemoryEaiPorts(
  llmProvider: EaiLlmProvider = createStubEaiLlmProvider(),
): EaiPorts {
  const sessions = createMutableListStore<EaiSession>();
  const turns = createMutableListStore<EaiConversationTurn>();
  const contexts = createMutableListStore<EaiCompiledContext>();
  const proposals = createMutableListStore<EaiActionProposal>();
  const interactions = createMutableListStore<EaiInteractionRecord>();
  const tools = createMutableListStore<EaiToolDefinition>();

  return {
    sessions: {
      list: () => sessions.list(),
      findById: (sessionId) => sessions.list().find((s) => s.sessionId === sessionId),
      findByConversationId: (conversationId) =>
        sessions.list().filter((s) => s.conversationId === conversationId),
      save: (s) => sessions.upsert(s, (i) => i.sessionId),
      replaceAll: (items) => sessions.replaceAll(items),
    },
    turns: {
      list: () => turns.list(),
      listBySession: (sessionId) => turns.list().filter((t) => t.sessionId === sessionId),
      save: (t) => turns.upsert(t, (i) => i.turnId),
      replaceAll: (items) => turns.replaceAll(items),
    },
    contexts: {
      list: () => contexts.list(),
      findById: (contextId) => contexts.list().find((c) => c.contextId === contextId),
      save: (c) => contexts.upsert(c, (i) => i.contextId),
      replaceAll: (items) => contexts.replaceAll(items),
    },
    proposals: {
      list: () => proposals.list(),
      findById: (proposalId) => proposals.list().find((p) => p.proposalId === proposalId),
      listBySession: (sessionId) =>
        proposals.list().filter((p) => p.sessionId === sessionId),
      save: (p) => proposals.upsert(p, (i) => i.proposalId),
      replaceAll: (items) => proposals.replaceAll(items),
    },
    interactions: {
      list: () => interactions.list(),
      findById: (interactionId) =>
        interactions.list().find((r) => r.interactionId === interactionId),
      listByConversation: (conversationId) =>
        interactions.list().filter((r) => r.conversationId === conversationId),
      save: (r) => interactions.upsert(r, (i) => i.interactionId),
      replaceAll: (items) => interactions.replaceAll(items),
    },
    tools: {
      list: () => tools.list(),
      findById: (toolId) => tools.list().find((t) => t.toolId === toolId),
      save: (t) => tools.upsert(t, (i) => i.toolId),
      replaceAll: (items) => tools.replaceAll(items),
    },
    llmProvider,
  };
}
