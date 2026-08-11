/**
 * Action Proposal emitter for Lead Intelligence (CO-AI-109).
 * Draft proposals only — never executes CRM/workflow.
 */

import { EAI_LEAD_INTELLIGENCE_PROPOSAL_KINDS } from "@/constants/enterprise-ai-platform/lead-intelligence";
import type { EaiActionProposalKind } from "@/types/enterprise-ai-platform";
import type { EaiRankedActionProposal } from "@/types/enterprise-ai-lead-intelligence";
import { createEaiActionProposal } from "../action-proposals";

const ALLOWED = new Set<string>(EAI_LEAD_INTELLIGENCE_PROPOSAL_KINDS);

export function emitEaiLeadIntelligenceProposals(input: {
  sessionId: string;
  conversationId: string;
  ranked: EaiRankedActionProposal[];
  emit: boolean;
  consultationId?: string;
}): string[] {
  if (!input.emit) return [];

  const ids: string[] = [];
  for (const row of input.ranked) {
    if (!ALLOWED.has(row.kind)) continue;

    const proposal = createEaiActionProposal({
      sessionId: input.sessionId,
      conversationId: input.conversationId,
      kind: row.kind as EaiActionProposalKind,
      title: row.title,
      summary: row.summary,
      confidence: row.confidence,
      requiresHumanApproval: true,
      payload: {
        source: "lead_intelligence",
        consultationId: input.consultationId,
        rank: row.rank,
        priorityScore: row.priorityScore,
        execution: "forbidden",
        recommendationOnly: true,
      },
    });
    ids.push(proposal.proposalId);
  }
  return ids;
}
