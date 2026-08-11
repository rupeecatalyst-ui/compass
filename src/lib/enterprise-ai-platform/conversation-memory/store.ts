/**
 * In-memory Conversation Memory store (CO-AI-115).
 */

import type { EaiEnterpriseConversationMemory } from "@/types/enterprise-ai-conversation-memory";

const memories = new Map<string, EaiEnterpriseConversationMemory>();

export function resetEaiConversationMemoryStore(): void {
  memories.clear();
}

export function getEaiEnterpriseConversationMemory(
  memoryId: string,
): EaiEnterpriseConversationMemory | undefined {
  return memories.get(memoryId);
}

export function listEaiEnterpriseConversationMemories(): EaiEnterpriseConversationMemory[] {
  return [...memories.values()];
}

export function saveEaiEnterpriseConversationMemory(
  memory: EaiEnterpriseConversationMemory,
): EaiEnterpriseConversationMemory {
  memories.set(memory.memoryId, memory);
  return memory;
}

export function findEaiEnterpriseConversationMemoryByContinuity(
  continuityKey: string,
): EaiEnterpriseConversationMemory | undefined {
  return [...memories.values()].find((m) => m.continuityKey === continuityKey);
}
