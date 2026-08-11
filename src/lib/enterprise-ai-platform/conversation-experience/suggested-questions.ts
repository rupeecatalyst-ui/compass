/**
 * Suggested questions (CO-SARATHI-VISION-001 WAVE-1).
 * Questionnaire chips retired for customer consultation.
 * Returns [] — conversation is free-form text only.
 */

import type { EaiConsultationObject } from "@/types/enterprise-ai-consultation";
import type { EaiPlannerPlan } from "@/types/enterprise-ai-planner";
import type { EaiPersonaPackId } from "@/types/enterprise-ai-platform";

/**
 * @deprecated Chips retired — always empty for natural consultation.
 * Kept for API compatibility with readiness / partner callers.
 */
export function resolveEaiSarathiSuggestedQuestions(input: {
  plannerPlan?: EaiPlannerPlan;
  consultation?: EaiConsultationObject;
  blocked?: boolean;
  personaPackId?: EaiPersonaPackId;
  utterance?: string;
  welcomeOnly?: boolean;
}): string[] {
  void input;
  return [];
}
