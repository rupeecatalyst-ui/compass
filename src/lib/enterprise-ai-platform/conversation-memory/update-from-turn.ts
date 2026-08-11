/**
 * Controlled memory refresh from a conversation turn (CO-AI-115).
 * Explicit, auditable upsert — never automatic online learning.
 */

import {
  EAI_MEMORY_MAX_CONSULTATIONS,
  EAI_MEMORY_MAX_FACTS,
  EAI_MEMORY_MAX_PREFERENCES,
  EAI_MEMORY_MAX_PROPOSALS,
  EAI_MEMORY_MAX_QUESTIONS,
  EAI_MEMORY_MAX_RECOMMENDATIONS,
} from "@/constants/enterprise-ai-platform/conversation-memory";
import type { EaiConsultationObject } from "@/types/enterprise-ai-consultation";
import type { EaiLanguageCode } from "@/types/enterprise-ai-multilingual";
import type { EaiActionProposal, EaiConfidenceBand } from "@/types/enterprise-ai-platform";
import type {
  EaiEnterpriseConversationMemory,
  EaiMemoryCustomerPreferenceEntry,
  EaiMemoryRecommendationEntry,
} from "@/types/enterprise-ai-conversation-memory";
import { computeEaiMemoryConfidence } from "./confidence";
import { defaultEaiMemoryExpiryIso, expireEaiEnterpriseConversationMemory } from "./expiry";
import { appendEaiMemoryAudit, createEaiMemoryAuditEntry } from "./learning-audit";
import { projectEaiEnterpriseMemoryToCompact } from "./project";
import { saveEaiEnterpriseConversationMemory } from "./store";
import { validateEaiEnterpriseConversationMemory } from "./validation";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 10)}`;
}

export function updateEaiEnterpriseMemoryFromTurn(input: {
  memory: EaiEnterpriseConversationMemory;
  consultation?: EaiConsultationObject;
  actionProposals?: EaiActionProposal[];
  suggestedQuestions?: string[];
  facingText?: string;
  preferredLanguage?: EaiLanguageCode;
  recommendationLines?: string[];
}): {
  memory: EaiEnterpriseConversationMemory;
  validation: ReturnType<typeof validateEaiEnterpriseConversationMemory>;
} {
  let memory = expireEaiEnterpriseConversationMemory(input.memory);
  const at = nowIso();
  const expiresAt = defaultEaiMemoryExpiryIso();

  // Customer preferences (language)
  if (input.preferredLanguage) {
    const existing = memory.customerPreferences.filter((p) => p.key !== "preferred_language");
    memory = {
      ...memory,
      preferredLanguage: input.preferredLanguage,
      customerPreferences: [
        {
          preferenceId: newId("eai_mp"),
          key: "preferred_language",
          value: input.preferredLanguage,
          category: "language",
          capturedAt: at,
          expiresAt,
          confidence: "high" as EaiConfidenceBand,
        } satisfies EaiMemoryCustomerPreferenceEntry,
        ...existing,
      ].slice(0, EAI_MEMORY_MAX_PREFERENCES),
      auditTrail: appendEaiMemoryAudit(
        memory.auditTrail,
        createEaiMemoryAuditEntry({
          action: "set_preference",
          note: `preferred_language=${input.preferredLanguage}`,
        }),
      ),
    };
  }

  // Known facts from consultation
  if (input.consultation?.keyFacts?.length) {
    const mapped = input.consultation.keyFacts.map((f) => ({
      factId: f.factId || newId("eai_mf"),
      key: f.key,
      value: f.value,
      provenance: f.provenance,
      confidence: input.consultation!.confidence.band,
      capturedAt: at,
      expiresAt,
    }));
    const seen = new Set(mapped.map((f) => `${f.key}:${f.value.toLowerCase()}`));
    const retained = memory.knownFacts.filter(
      (f) => !seen.has(`${f.key}:${f.value.toLowerCase()}`),
    );
    memory = {
      ...memory,
      knownFacts: [...mapped, ...retained].slice(0, EAI_MEMORY_MAX_FACTS),
      auditTrail: appendEaiMemoryAudit(
        memory.auditTrail,
        createEaiMemoryAuditEntry({
          action: "upsert_fact",
          note: `Upserted ${mapped.length} consultation fact(s)`,
        }),
      ),
    };

    // Product preference from facts
    const product = mapped.find((f) => f.key === "product_interest");
    if (product) {
      const prefs = memory.customerPreferences.filter((p) => p.key !== "product_interest");
      memory = {
        ...memory,
        customerPreferences: [
          {
            preferenceId: newId("eai_mp"),
            key: "product_interest",
            value: product.value,
            category: "product",
            capturedAt: at,
            expiresAt,
            confidence: product.confidence,
          } satisfies EaiMemoryCustomerPreferenceEntry,
          ...prefs,
        ].slice(0, EAI_MEMORY_MAX_PREFERENCES),
      };
    }
  }

  // Consultation history
  if (input.consultation) {
    const entry = {
      consultationId: input.consultation.consultationId,
      lifecycleState: input.consultation.lifecycleState,
      summaryFacing: input.consultation.summary.facingText.slice(0, 240),
      keyFactCount: input.consultation.keyFacts.length,
      capturedAt: at,
      expiresAt,
    };
    const rest = memory.consultationHistory.filter(
      (c) => c.consultationId !== entry.consultationId,
    );
    memory = {
      ...memory,
      consultationHistory: [entry, ...rest].slice(0, EAI_MEMORY_MAX_CONSULTATIONS),
      auditTrail: appendEaiMemoryAudit(
        memory.auditTrail,
        createEaiMemoryAuditEntry({
          action: "record_consultation",
          note: `Consultation ${entry.consultationId} @ ${entry.lifecycleState}`,
        }),
      ),
    };
  }

  // Outstanding questions
  const questions = [
    ...(input.suggestedQuestions ?? []),
    ...(input.consultation?.missingInformation ?? [])
      .filter((m) => !m.alreadyKnown)
      .map((m) => m.label),
  ];
  if (questions.length) {
    const mapped = questions.map((text) => ({
      questionId: newId("eai_mq"),
      text: text.slice(0, 240),
      status: "open" as const,
      capturedAt: at,
      expiresAt,
      source: "suggested" as const,
    }));
    const existingTexts = new Set(mapped.map((q) => q.text.toLowerCase()));
    const retained = memory.outstandingQuestions.filter(
      (q) => q.status === "open" && !existingTexts.has(q.text.toLowerCase()),
    );
    memory = {
      ...memory,
      outstandingQuestions: [...mapped, ...retained].slice(0, EAI_MEMORY_MAX_QUESTIONS),
      auditTrail: appendEaiMemoryAudit(
        memory.auditTrail,
        createEaiMemoryAuditEntry({
          action: "record_outstanding_question",
          note: `Recorded ${mapped.length} outstanding question(s)`,
        }),
      ),
    };
  }

  // Previous recommendations
  const recLines = [
    ...(input.recommendationLines ?? []),
    ...(input.facingText ? [input.facingText.split("\n")[0]!.slice(0, 240)] : []),
  ].filter(Boolean);
  if (recLines.length) {
    const mapped: EaiMemoryRecommendationEntry[] = recLines.map((text) => ({
      recommendationId: newId("eai_mr"),
      text: text.slice(0, 240),
      capturedAt: at,
      expiresAt,
      consultationId: input.consultation?.consultationId,
      confidence: (input.consultation?.confidence.band ?? "moderate") as EaiConfidenceBand,
    }));
    memory = {
      ...memory,
      previousRecommendations: [...mapped, ...memory.previousRecommendations].slice(
        0,
        EAI_MEMORY_MAX_RECOMMENDATIONS,
      ),
      auditTrail: appendEaiMemoryAudit(
        memory.auditTrail,
        createEaiMemoryAuditEntry({
          action: "record_recommendation",
          note: `Recorded ${mapped.length} recommendation line(s)`,
        }),
      ),
    };
  }

  // Previous action proposals (draft/pending only)
  const proposals = (input.actionProposals ?? []).filter(
    (p) => p.status === "draft" || p.status === "pending_review",
  );
  if (proposals.length) {
    const mapped = proposals.map((p) => ({
      proposalId: p.proposalId,
      kind: p.kind,
      status: p.status,
      title: p.title.slice(0, 160),
      summary: p.summary.slice(0, 240),
      capturedAt: at,
      expiresAt,
      executionForbidden: true as const,
    }));
    const ids = new Set(mapped.map((p) => p.proposalId));
    const retained = memory.previousActionProposals.filter((p) => !ids.has(p.proposalId));
    memory = {
      ...memory,
      previousActionProposals: [...mapped, ...retained].slice(0, EAI_MEMORY_MAX_PROPOSALS),
      auditTrail: appendEaiMemoryAudit(
        memory.auditTrail,
        createEaiMemoryAuditEntry({
          action: "record_action_proposal",
          note: `Recorded ${mapped.length} draft/pending proposal(s) — execution forbidden`,
        }),
      ),
    };
  }

  memory = {
    ...memory,
    sessionId: input.memory.sessionId,
    updatedAt: at,
    confidence: computeEaiMemoryConfidence(memory),
    auditTrail: appendEaiMemoryAudit(
      memory.auditTrail,
      createEaiMemoryAuditEntry({
        action: "refresh_from_turn",
        note: "Controlled explicit refresh from conversation turn",
      }),
    ),
  };
  memory.compactProjection = projectEaiEnterpriseMemoryToCompact(memory);

  const validation = validateEaiEnterpriseConversationMemory(memory);
  memory = {
    ...memory,
    auditTrail: appendEaiMemoryAudit(
      memory.auditTrail,
      createEaiMemoryAuditEntry({
        action: "validate_memory",
        note: validation.valid
          ? "Memory validation passed"
          : `Memory validation issues: ${validation.issues.map((i) => i.code).join(",")}`,
      }),
    ),
  };

  return {
    memory: saveEaiEnterpriseConversationMemory(memory),
    validation,
  };
}
