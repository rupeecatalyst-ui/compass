/**
 * Next Best Action for Lead Intelligence (CO-AI-109).
 * Proposal-oriented NBA — never executes.
 */

import type {
  EaiLeadIntelligenceNba,
  EaiPartnerRecommendation,
  EaiReadinessAssessment,
} from "@/types/enterprise-ai-lead-intelligence";

function newId(): string {
  return `eai_li_nba_${crypto.randomUUID().slice(0, 8)}`;
}

export function deriveEaiLeadIntelligenceNba(input: {
  blocked?: boolean;
  lead: EaiReadinessAssessment;
  opportunity: EaiReadinessAssessment;
  document: EaiReadinessAssessment;
  customer: EaiReadinessAssessment;
  partner?: EaiPartnerRecommendation;
  priorityScore: number;
}): EaiLeadIntelligenceNba[] {
  if (input.blocked) {
    return [
      {
        actionId: newId(),
        kind: "outside_refused",
        title: "Outside domain",
        summary: "I'm not trained for this subject.",
        priorityScore: 0,
        confidence: "high",
        rank: 1,
      },
    ];
  }

  const actions: EaiLeadIntelligenceNba[] = [];

  if (input.document.band === "not_ready" || input.document.band === "partial") {
    actions.push({
      actionId: newId(),
      kind: "propose_request_documents",
      title: "Propose document request",
      summary: "Recommend requesting remaining documents (approval required).",
      proposalKind: "request_documents",
      priorityScore: Math.max(40, 100 - input.document.score),
      confidence: "moderate",
      rank: 0,
    });
  }

  if (input.lead.band === "ready" || input.lead.band === "strong") {
    actions.push({
      actionId: newId(),
      kind: "propose_create_lead",
      title: "Propose create lead",
      summary: "Recommend creating a lead for human review — not auto-created.",
      proposalKind: "create_lead",
      priorityScore: input.lead.score,
      confidence: input.lead.band === "strong" ? "high" : "moderate",
      rank: 0,
    });
  }

  if (input.opportunity.band === "ready" || input.opportunity.band === "strong") {
    actions.push({
      actionId: newId(),
      kind: "propose_create_opportunity",
      title: "Propose create opportunity",
      summary: "Recommend creating an opportunity for human review — not auto-created.",
      proposalKind: "create_opportunity",
      priorityScore: input.opportunity.score,
      confidence: input.opportunity.band === "strong" ? "high" : "moderate",
      rank: 0,
    });
  }

  if (input.partner?.proposalKind === "assign_wealth_partner") {
    actions.push({
      actionId: newId(),
      kind: "propose_assign_partner",
      title: "Propose partner assignment",
      summary: input.partner.suggestion,
      proposalKind: "assign_wealth_partner",
      priorityScore: Math.round(input.priorityScore * 0.7),
      confidence: input.partner.confidence,
      rank: 0,
    });
  }

  if (
    input.customer.band === "partial" ||
    input.customer.band === "not_ready" ||
    actions.length === 0
  ) {
    actions.push({
      actionId: newId(),
      kind: "continue_consultation",
      title: "Continue consultation",
      summary: "Gather remaining facts before stronger CRM proposals.",
      proposalKind: "create_task",
      priorityScore: 35,
      confidence: "moderate",
      rank: 0,
    });
  }

  // Sort by priority desc and assign ranks
  actions.sort((a, b) => b.priorityScore - a.priorityScore);
  return actions.map((a, i) => ({ ...a, rank: i + 1 }));
}
