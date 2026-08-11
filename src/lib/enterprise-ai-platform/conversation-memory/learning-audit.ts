/**
 * Memory learning audit helpers (CO-AI-115).
 * Controlled + auditable only — never automatic online learning.
 */

import { EAI_MEMORY_MAX_AUDIT } from "@/constants/enterprise-ai-platform/conversation-memory";
import type {
  EaiMemoryLearningAction,
  EaiMemoryLearningAuditEntry,
} from "@/types/enterprise-ai-conversation-memory";

function nowIso(): string {
  return new Date().toISOString();
}

export function createEaiMemoryAuditEntry(input: {
  action: EaiMemoryLearningAction;
  note: string;
  actor?: "system_controlled" | "human_review";
}): EaiMemoryLearningAuditEntry {
  return {
    entryId: `eai_mla_${crypto.randomUUID()}`,
    at: nowIso(),
    actor: input.actor ?? "system_controlled",
    action: input.action,
    note: input.note.slice(0, 400),
    enterpriseRulesUnchanged: true,
    automaticOnlineLearning: false,
  };
}

export function appendEaiMemoryAudit(
  trail: EaiMemoryLearningAuditEntry[],
  entry: EaiMemoryLearningAuditEntry,
): EaiMemoryLearningAuditEntry[] {
  return [...trail, entry].slice(-EAI_MEMORY_MAX_AUDIT);
}
