/**
 * Memory validation (CO-AI-115).
 */

import type {
  EaiEnterpriseConversationMemory,
  EaiMemoryValidationIssue,
  EaiMemoryValidationResult,
} from "@/types/enterprise-ai-conversation-memory";
import { EAI_MEMORY_FORBIDDEN_LEARNING_MODES } from "@/constants/enterprise-ai-platform/conversation-memory";
import { isEaiMemoryEntryExpired } from "./expiry";

export function validateEaiEnterpriseConversationMemory(
  memory: EaiEnterpriseConversationMemory,
  nowMs: number = Date.now(),
): EaiMemoryValidationResult {
  const issues: EaiMemoryValidationIssue[] = [];

  if (!memory.memoryId || !memory.continuityKey || !memory.conversationId) {
    issues.push({
      code: "invalid_structure",
      message: "memoryId, continuityKey, and conversationId are required",
      severity: "error",
    });
  }

  if (memory.learningMode !== "controlled_explicit" && memory.learningMode !== "disabled") {
    issues.push({
      code: "forbidden_learning_mode",
      message: `Forbidden learning mode: ${String(memory.learningMode)}`,
      severity: "error",
    });
  }

  for (const mode of EAI_MEMORY_FORBIDDEN_LEARNING_MODES) {
    if (String(memory.learningMode) === mode) {
      issues.push({
        code: "automatic_online_learning_attempt",
        message: `Learning mode "${mode}" is forbidden`,
        severity: "error",
      });
    }
  }

  for (const entry of memory.auditTrail) {
    if (entry.automaticOnlineLearning !== false) {
      issues.push({
        code: "automatic_online_learning_attempt",
        message: `Audit ${entry.entryId} claims automatic online learning`,
        severity: "error",
        entryId: entry.entryId,
      });
    }
    if (entry.enterpriseRulesUnchanged !== true) {
      issues.push({
        code: "enterprise_rule_mutation_attempt",
        message: `Audit ${entry.entryId} does not affirm enterprise rules unchanged`,
        severity: "error",
        entryId: entry.entryId,
      });
    }
  }

  for (const p of memory.previousActionProposals) {
    if (!p.executionForbidden) {
      issues.push({
        code: "proposal_execution_attempt",
        message: `Proposal ${p.proposalId} must remain execution-forbidden in memory`,
        severity: "error",
        entryId: p.proposalId,
      });
    }
    if (p.status === "executed_reserved") {
      issues.push({
        code: "proposal_execution_attempt",
        message: `Memory must never retain executed proposals as learning outcomes`,
        severity: "error",
        entryId: p.proposalId,
      });
    }
  }

  const seen = new Set<string>();
  for (const f of memory.knownFacts) {
    const k = `${f.key}:${f.value.toLowerCase()}`;
    if (seen.has(k)) {
      issues.push({
        code: "duplicate_fact",
        message: `Duplicate known fact ${f.key}`,
        severity: "warning",
        entryId: f.factId,
      });
    }
    seen.add(k);
    if (isEaiMemoryEntryExpired(f.expiresAt, nowMs)) {
      issues.push({
        code: "expired",
        message: `Known fact expired: ${f.key}`,
        severity: "warning",
        entryId: f.factId,
      });
    }
  }

  if (isEaiMemoryEntryExpired(memory.expiresAt, nowMs)) {
    issues.push({
      code: "expired",
      message: "Memory envelope expired",
      severity: "warning",
    });
  }

  if (memory.confidence.scoreHint < 0 || memory.confidence.scoreHint > 100) {
    issues.push({
      code: "stale_confidence",
      message: "Memory confidence scoreHint out of range",
      severity: "error",
    });
  }

  const valid = !issues.some((i) => i.severity === "error");
  return { valid, issues, memoryId: memory.memoryId };
}
