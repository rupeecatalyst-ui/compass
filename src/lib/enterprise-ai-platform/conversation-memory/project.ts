/**
 * Project enterprise memory → compact Context Intelligence memory (CO-AI-115).
 */

import type { EaiConversationMemory } from "@/types/enterprise-ai-context-intelligence";
import type { EaiEnterpriseConversationMemory } from "@/types/enterprise-ai-conversation-memory";
import { normaliseEaiConversationMemory } from "../context-intelligence/conversation-memory";

export function projectEaiEnterpriseMemoryToCompact(
  memory: EaiEnterpriseConversationMemory,
  nowMs: number = Date.now(),
): EaiConversationMemory {
  const activeFacts = memory.knownFacts.filter(
    (f) => !f.expiresAt || Date.parse(f.expiresAt) > nowMs,
  );
  const openQuestions = memory.outstandingQuestions
    .filter((q) => q.status === "open" && (!q.expiresAt || Date.parse(q.expiresAt) > nowMs))
    .map((q) => q.text);
  const previousRecommendations = memory.previousRecommendations
    .filter((r) => !r.expiresAt || Date.parse(r.expiresAt) > nowMs)
    .map((r) => r.text);
  const outstandingActions = memory.previousActionProposals
    .filter(
      (p) =>
        (p.status === "draft" || p.status === "pending_review") &&
        (!p.expiresAt || Date.parse(p.expiresAt) > nowMs),
    )
    .map((p) => `${p.kind}: ${p.title}`);

  const intent =
    memory.customerPreferences.find((p) => p.key === "product_interest")?.value ??
    activeFacts.find((f) => f.key === "product_interest")?.value ??
    memory.compactProjection?.intent;

  const summaryParts = [
    intent ? `Intent: ${intent}` : undefined,
    activeFacts.length ? `Facts: ${activeFacts.length}` : undefined,
    openQuestions.length ? `Open Q: ${openQuestions.length}` : undefined,
    memory.consultationHistory[0]?.summaryFacing?.slice(0, 120),
  ].filter(Boolean);

  return (
    normaliseEaiConversationMemory({
      intent: intent ? String(intent).slice(0, 240) : undefined,
      knownFacts: activeFacts.map((f) => ({
        key: f.key,
        value: f.value,
        provenance: f.provenance,
      })),
      openQuestions,
      previousRecommendations,
      outstandingActions,
      summary: summaryParts.join(" · ").slice(0, 1200),
    }) ?? {
      knownFacts: [],
      openQuestions: [],
      previousRecommendations: [],
      outstandingActions: [],
    }
  );
}
