/**
 * Action Proposal Generator (CO-AI-107).
 * Creates draft Action Proposals only — never executes CRM/workflow.
 */

import {
  EAI_PLANNER_ALLOWED_PROPOSAL_KINDS,
} from "@/constants/enterprise-ai-platform/planner";
import type { EaiActionProposalKind } from "@/types/enterprise-ai-platform";
import type { EaiPlannerNextBestAction } from "@/types/enterprise-ai-planner";
import { createEaiActionProposal } from "../action-proposals";

const ALLOWED = new Set<string>(EAI_PLANNER_ALLOWED_PROPOSAL_KINDS);

export function generateEaiPlannerActionProposals(input: {
  sessionId: string;
  conversationId: string;
  actions: EaiPlannerNextBestAction[];
  emit: boolean;
}): string[] {
  if (!input.emit) return [];

  const ids: string[] = [];
  for (const action of input.actions) {
    const kind = action.proposalKind;
    if (!kind) continue;
    if (!ALLOWED.has(kind)) {
      // Never mint lead/opportunity/workflow CRM mutations from Planner auto-path
      continue;
    }

    const proposal = createEaiActionProposal({
      sessionId: input.sessionId,
      conversationId: input.conversationId,
      kind: kind as EaiActionProposalKind,
      title: action.title,
      summary: `${action.summary} [Planner draft — not executed]`,
      confidence: action.confidence,
      requiresHumanApproval: true,
      payload: {
        plannerActionId: action.actionId,
        plannerActionKind: action.kind,
        execution: "forbidden",
      },
    });
    ids.push(proposal.proposalId);
  }
  return ids;
}
