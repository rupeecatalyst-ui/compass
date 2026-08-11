/**
 * Recommendation Sequencing (CO-AI-107).
 * Orders recommendations without ranking products or inventing scores.
 */

import { EAI_PLANNER_MAX_ACTIONS } from "@/constants/enterprise-ai-platform/planner";
import type { EaiPlannerNextBestAction } from "@/types/enterprise-ai-planner";

const KIND_WEIGHT: Record<EaiPlannerNextBestAction["kind"], number> = {
  outside_refused: 0,
  ask_question: 10,
  defer_to_engine: 20,
  propose_document_request: 30,
  propose_callback: 40,
  propose_reminder: 50,
  propose_task: 55,
  continue_advisory: 60,
};

export function sequenceEaiPlannerRecommendations(
  actions: EaiPlannerNextBestAction[],
): { sequenced: EaiPlannerNextBestAction[]; lines: string[] } {
  const sequenced = [...actions]
    .sort((a, b) => {
      const wa = KIND_WEIGHT[a.kind] ?? 99;
      const wb = KIND_WEIGHT[b.kind] ?? 99;
      if (wa !== wb) return wa - wb;
      return a.sequence - b.sequence;
    })
    .slice(0, EAI_PLANNER_MAX_ACTIONS)
    .map((a, i) => ({ ...a, sequence: i + 1 }));

  const lines = sequenced.map((a) => `${a.sequence}. ${a.title}: ${a.summary}`);
  return { sequenced, lines };
}
