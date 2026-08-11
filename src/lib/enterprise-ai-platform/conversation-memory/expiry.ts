/**
 * Memory expiry (CO-AI-115).
 */

import { EAI_MEMORY_DEFAULT_TTL_MS } from "@/constants/enterprise-ai-platform/conversation-memory";
import type { EaiEnterpriseConversationMemory } from "@/types/enterprise-ai-conversation-memory";
import { computeEaiMemoryConfidence } from "./confidence";
import { appendEaiMemoryAudit, createEaiMemoryAuditEntry } from "./learning-audit";
import { projectEaiEnterpriseMemoryToCompact } from "./project";
import { saveEaiEnterpriseConversationMemory } from "./store";

export function defaultEaiMemoryExpiryIso(fromMs: number = Date.now()): string {
  return new Date(fromMs + EAI_MEMORY_DEFAULT_TTL_MS).toISOString();
}

export function isEaiMemoryEntryExpired(
  expiresAt: string | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!expiresAt) return false;
  return Date.parse(expiresAt) <= nowMs;
}

/**
 * Mark expired open questions; recompute confidence; audit.
 * Does not invent new facts or modify enterprise rules.
 */
export function expireEaiEnterpriseConversationMemory(
  memory: EaiEnterpriseConversationMemory,
  nowMs: number = Date.now(),
): EaiEnterpriseConversationMemory {
  let changed = 0;
  const outstandingQuestions = memory.outstandingQuestions.map((q) => {
    if (q.status === "open" && isEaiMemoryEntryExpired(q.expiresAt, nowMs)) {
      changed += 1;
      return { ...q, status: "expired" as const };
    }
    return q;
  });

  const envelopeExpired = isEaiMemoryEntryExpired(memory.expiresAt, nowMs);
  const next: EaiEnterpriseConversationMemory = {
    ...memory,
    outstandingQuestions,
    updatedAt: new Date(nowMs).toISOString(),
    confidence: computeEaiMemoryConfidence(
      { ...memory, outstandingQuestions },
      nowMs,
    ),
    auditTrail: appendEaiMemoryAudit(
      memory.auditTrail,
      createEaiMemoryAuditEntry({
        action: "expire_entries",
        note: envelopeExpired
          ? `Envelope expired; marked ${changed} question(s)`
          : `Marked ${changed} expired open question(s)`,
      }),
    ),
  };
  next.compactProjection = projectEaiEnterpriseMemoryToCompact(next, nowMs);
  return saveEaiEnterpriseConversationMemory(next);
}
