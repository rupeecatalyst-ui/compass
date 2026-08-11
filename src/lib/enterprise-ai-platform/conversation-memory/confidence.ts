/**
 * Memory confidence scoring (CO-AI-115).
 * Completeness / freshness signal — never FOIR / eligibility math.
 */

import type {
  EaiEnterpriseConversationMemory,
  EaiMemoryConfidence,
} from "@/types/enterprise-ai-conversation-memory";

export function computeEaiMemoryConfidence(
  memory: Pick<
    EaiEnterpriseConversationMemory,
    | "knownFacts"
    | "outstandingQuestions"
    | "previousRecommendations"
    | "previousActionProposals"
    | "customerPreferences"
    | "consultationHistory"
    | "expiresAt"
  >,
  nowMs: number = Date.now(),
): EaiMemoryConfidence {
  const reasons: string[] = [];
  let expiredEntryCount = 0;

  const activeFacts = memory.knownFacts.filter((f) => {
    if (f.expiresAt && Date.parse(f.expiresAt) <= nowMs) {
      expiredEntryCount += 1;
      return false;
    }
    return true;
  });
  const openQs = memory.outstandingQuestions.filter((q) => {
    if (q.expiresAt && Date.parse(q.expiresAt) <= nowMs) {
      expiredEntryCount += 1;
      return q.status === "open";
    }
    return q.status === "open";
  });

  if (memory.expiresAt && Date.parse(memory.expiresAt) <= nowMs) {
    reasons.push("Memory envelope expired");
  }

  let score = 20;
  score += Math.min(40, activeFacts.length * 8);
  score += Math.min(15, memory.customerPreferences.length * 5);
  score += Math.min(10, memory.consultationHistory.length * 5);
  score += Math.min(10, memory.previousRecommendations.length * 3);
  score += Math.min(5, memory.previousActionProposals.length * 2);
  score -= Math.min(20, openQs.length * 4);
  score -= Math.min(15, expiredEntryCount * 3);
  score = Math.max(0, Math.min(100, score));

  if (activeFacts.length === 0) reasons.push("No active known facts");
  else reasons.push(`${activeFacts.length} active known fact(s)`);
  if (openQs.length > 0) reasons.push(`${openQs.length} outstanding question(s)`);
  if (memory.previousRecommendations.length > 0) {
    reasons.push("Prior recommendations retained");
  }
  if (expiredEntryCount > 0) reasons.push(`${expiredEntryCount} expired entr(y/ies)`);

  const band: EaiMemoryConfidence["band"] =
    score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  return {
    band,
    scoreHint: score,
    reasons,
    factCount: activeFacts.length,
    openQuestionCount: openQs.length,
    expiredEntryCount,
  };
}
