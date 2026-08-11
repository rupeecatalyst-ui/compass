/**
 * Create / resolve enterprise conversation memory (CO-AI-115).
 */

import type { EaiLanguageCode } from "@/types/enterprise-ai-multilingual";
import type { EaiPersonaPackId } from "@/types/enterprise-ai-platform";
import type { EaiEnterpriseConversationMemory } from "@/types/enterprise-ai-conversation-memory";
import { computeEaiMemoryConfidence } from "./confidence";
import { defaultEaiMemoryExpiryIso } from "./expiry";
import { appendEaiMemoryAudit, createEaiMemoryAuditEntry } from "./learning-audit";
import { projectEaiEnterpriseMemoryToCompact } from "./project";
import {
  findEaiEnterpriseConversationMemoryByContinuity,
  getEaiEnterpriseConversationMemory,
  saveEaiEnterpriseConversationMemory,
} from "./store";

function nowIso(): string {
  return new Date().toISOString();
}

export function createEaiEnterpriseConversationMemory(input: {
  continuityKey: string;
  conversationId: string;
  sessionId?: string;
  personaPackId: EaiPersonaPackId;
  preferredLanguage?: EaiLanguageCode;
}): EaiEnterpriseConversationMemory {
  const createdAt = nowIso();
  const seed: EaiEnterpriseConversationMemory = {
    memoryId: `eai_mem_${crypto.randomUUID()}`,
    continuityKey: input.continuityKey,
    conversationId: input.conversationId,
    sessionId: input.sessionId,
    personaPackId: input.personaPackId,
    preferredLanguage: input.preferredLanguage,
    learningMode: "controlled_explicit",
    consultationHistory: [],
    customerPreferences: [],
    knownFacts: [],
    outstandingQuestions: [],
    previousRecommendations: [],
    previousActionProposals: [],
    confidence: {
      band: "low",
      scoreHint: 20,
      reasons: ["New memory envelope"],
      factCount: 0,
      openQuestionCount: 0,
      expiredEntryCount: 0,
    },
    expiresAt: defaultEaiMemoryExpiryIso(),
    createdAt,
    updatedAt: createdAt,
    auditTrail: [],
    compactProjection: {
      knownFacts: [],
      openQuestions: [],
      previousRecommendations: [],
      outstandingActions: [],
    },
  };

  seed.auditTrail = appendEaiMemoryAudit(
    [],
    createEaiMemoryAuditEntry({
      action: "create_memory",
      note: "Created enterprise conversation memory (controlled learning)",
    }),
  );
  seed.confidence = computeEaiMemoryConfidence(seed);
  seed.compactProjection = projectEaiEnterpriseMemoryToCompact(seed);
  return saveEaiEnterpriseConversationMemory(seed);
}

export function resolveEaiEnterpriseConversationMemory(input: {
  memoryId?: string;
  continuityKey: string;
  conversationId: string;
  sessionId?: string;
  personaPackId: EaiPersonaPackId;
  preferredLanguage?: EaiLanguageCode;
}): EaiEnterpriseConversationMemory {
  if (input.memoryId) {
    const existing = getEaiEnterpriseConversationMemory(input.memoryId);
    if (existing) return existing;
  }
  const byKey = findEaiEnterpriseConversationMemoryByContinuity(input.continuityKey);
  if (byKey) return byKey;
  return createEaiEnterpriseConversationMemory(input);
}
