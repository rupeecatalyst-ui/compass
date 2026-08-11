/**
 * Consultation Completion Score (CO-AI-108).
 */

import { EAI_CONSULTATION_COMPLETION_WEIGHTS } from "@/constants/enterprise-ai-platform/consultation-intelligence";
import type {
  EaiConsultationCompletionScore,
  EaiConsultationConcern,
  EaiConsultationKeyFact,
  EaiConsultationLifecycleState,
  EaiConsultationObjective,
  EaiConsultationSummary,
} from "@/types/enterprise-ai-consultation";
import type { EaiPlannerMissingInfo } from "@/types/enterprise-ai-planner";

export function scoreEaiConsultationCompletion(input: {
  objectives: EaiConsultationObjective[];
  keyFacts: EaiConsultationKeyFact[];
  concerns: EaiConsultationConcern[];
  missing: EaiPlannerMissingInfo[];
  summary?: EaiConsultationSummary;
  lifecycleState: EaiConsultationLifecycleState;
}): EaiConsultationCompletionScore {
  const w = EAI_CONSULTATION_COMPLETION_WEIGHTS;
  const checklist: EaiConsultationCompletionScore["checklist"] = [
    {
      item: "Customer objective captured",
      met: input.objectives.length > 0,
      weight: w.hasObjective,
    },
    {
      item: "At least two key facts",
      met: input.keyFacts.length >= 2,
      weight: w.hasKeyFacts,
    },
    {
      item: "Concerns reviewed (or none expressed)",
      met: true, // always assessed — presence optional
      weight: w.concernsCapturedOrNoneNeeded,
    },
    {
      item: "Missing information assessed",
      met: input.missing.length > 0 || input.keyFacts.length >= 2,
      weight: w.missingInfoAssessed,
    },
    {
      item: "Summary present",
      met: !!input.summary?.facingText?.trim(),
      weight: w.summaryPresent,
    },
    {
      item: "Lifecycle advanced beyond initiated",
      met:
        input.lifecycleState !== "initiated" &&
        input.lifecycleState !== "outside_refused",
      weight: w.lifecycleAdvanced,
    },
  ];

  // Soft bonus: concerns explicitly captured
  if (input.concerns.length > 0) {
    checklist.push({
      item: "Financial concerns captured",
      met: true,
      weight: 0,
    });
  }

  const score = checklist.reduce((sum, c) => sum + (c.met ? c.weight : 0), 0);
  let band: EaiConsultationCompletionScore["band"] = "low";
  if (score >= 95) band = "complete";
  else if (score >= 75) band = "high";
  else if (score >= 45) band = "moderate";

  return { score, band, checklist };
}
