/**
 * Action Proposal Ranking (CO-AI-109).
 * Ranks draft-worthy proposals — never executes them.
 */

import { EAI_LEAD_INTELLIGENCE_MAX_RANKED } from "@/constants/enterprise-ai-platform/lead-intelligence";
import type {
  EaiLeadIntelligenceNba,
  EaiRankedActionProposal,
} from "@/types/enterprise-ai-lead-intelligence";

export function rankEaiActionProposals(
  actions: EaiLeadIntelligenceNba[],
): EaiRankedActionProposal[] {
  return actions
    .filter((a) => !!a.proposalKind && a.kind !== "outside_refused" && a.kind !== "continue_consultation")
    .slice(0, EAI_LEAD_INTELLIGENCE_MAX_RANKED)
    .map((a, i) => ({
      rank: i + 1,
      priorityScore: a.priorityScore,
      confidence: a.confidence,
      kind: a.proposalKind!,
      title: a.title,
      summary: `${a.summary} [Lead Intelligence recommendation — not executed]`,
      requiresHumanApproval: true as const,
      executionForbidden: true as const,
    }));
}

/** Attach minted draft proposal ids onto ranked rows (order-preserving). */
export function attachEaiProposalIds(
  ranked: EaiRankedActionProposal[],
  proposalIds: string[],
): EaiRankedActionProposal[] {
  return ranked.map((r, i) => ({
    ...r,
    proposalId: proposalIds[i],
  }));
}
