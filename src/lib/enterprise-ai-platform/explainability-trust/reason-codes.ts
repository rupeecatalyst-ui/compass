/**
 * Reason code resolver (CO-AI-110).
 * Only catalogue codes; rationale must cite observed signals.
 */

import { EAI_TRUST_REASON_CATALOGUE } from "@/constants/enterprise-ai-platform/explainability";
import type {
  EaiTrustReasonCode,
  EaiTrustReasonCodeId,
} from "@/types/enterprise-ai-explainability";
import type { EaiConsultationObject } from "@/types/enterprise-ai-consultation";
import type { EaiLeadIntelligenceResult } from "@/types/enterprise-ai-lead-intelligence";

export function resolveEaiTrustReasonCode(
  code: EaiTrustReasonCodeId,
  rationale: string,
): EaiTrustReasonCode {
  const entry = EAI_TRUST_REASON_CATALOGUE[code];
  return {
    code,
    label: entry.label,
    rationale,
    statementClass: entry.statementClass,
  };
}

/**
 * Derive reason codes strictly from observed Lead Intelligence + Consultation signals.
 * Never invent codes without a grounding signal.
 */
export function deriveEaiTrustReasonCodes(input: {
  blocked?: boolean;
  leadIntelligence?: EaiLeadIntelligenceResult;
  consultation?: EaiConsultationObject;
}): EaiTrustReasonCode[] {
  if (input.blocked) {
    return [
      resolveEaiTrustReasonCode(
        "RC_OUTSIDE_DOMAIN",
        "Domain Boundary blocked the request before recommendation reasoning",
      ),
    ];
  }

  const codes: EaiTrustReasonCode[] = [];
  const li = input.leadIntelligence;
  const c = input.consultation;
  const facts = c?.keyFacts ?? [];
  const objectives = c?.customerObjectives ?? [];
  const missingUnknown = (c?.missingInformation ?? []).filter((m) => !m.alreadyKnown);

  if (objectives.length > 0) {
    codes.push(
      resolveEaiTrustReasonCode(
        "RC_OBJECTIVE_PRESENT",
        `Observed ${objectives.length} customer objective(s)`,
      ),
    );
  } else {
    codes.push(
      resolveEaiTrustReasonCode("RC_OBJECTIVE_MISSING", "No customer objective captured on consultation"),
    );
  }

  const hasProduct = facts.some((f) =>
    /product|home loan|balance|bt|lap|business|personal/i.test(`${f.key} ${f.value}`),
  );
  codes.push(
    hasProduct
      ? resolveEaiTrustReasonCode("RC_PRODUCT_KNOWN", "Product interest present in key facts")
      : resolveEaiTrustReasonCode("RC_PRODUCT_UNKNOWN", "No product interest fact observed"),
  );

  const hasAmount = facts.some((f) => /amount|lakh|crore|₹|rs/i.test(`${f.key} ${f.value}`));
  codes.push(
    hasAmount
      ? resolveEaiTrustReasonCode("RC_AMOUNT_KNOWN", "Required amount present in key facts")
      : resolveEaiTrustReasonCode("RC_AMOUNT_UNKNOWN", "No required amount fact observed"),
  );

  if (facts.some((f) => /employ|salaried|self/i.test(`${f.key} ${f.value}`))) {
    codes.push(
      resolveEaiTrustReasonCode("RC_EMPLOYMENT_KNOWN", "Employment context present in key facts"),
    );
  }

  if (facts.some((f) => /document|kyc/i.test(`${f.key} ${f.value}`) && /ready|complete|uploaded/i.test(f.value))) {
    codes.push(resolveEaiTrustReasonCode("RC_DOCUMENTS_READY", "Document readiness indicated in facts"));
  } else if (missingUnknown.some((m) => m.slotId === "document_readiness") || li?.documentReadiness.band === "not_ready" || li?.documentReadiness.band === "partial") {
    codes.push(
      resolveEaiTrustReasonCode(
        "RC_DOCUMENTS_GAP",
        "Document readiness gap observed in missing information or document readiness band",
      ),
    );
  }

  if (c?.lifecycleState === "completed" || (c?.completionScore.score ?? 0) >= 70) {
    codes.push(
      resolveEaiTrustReasonCode(
        "RC_CONSULTATION_COMPLETE",
        `Consultation completion score ${c?.completionScore.score ?? 0}`,
      ),
    );
  } else if (c) {
    codes.push(
      resolveEaiTrustReasonCode(
        "RC_CONSULTATION_INCOMPLETE",
        `Consultation completion score ${c.completionScore.score}`,
      ),
    );
  }

  if (missingUnknown.length > 0) {
    codes.push(
      resolveEaiTrustReasonCode(
        "RC_INFORMATION_GAPS",
        `${missingUnknown.length} unknown information slot(s) remain`,
      ),
    );
  }

  if (li) {
    if (li.leadReadiness.band === "ready" || li.leadReadiness.band === "strong") {
      codes.push(
        resolveEaiTrustReasonCode(
          "RC_LEAD_READY",
          `Lead readiness ${li.leadReadiness.band} (${li.leadReadiness.score})`,
        ),
      );
    } else {
      codes.push(
        resolveEaiTrustReasonCode(
          "RC_LEAD_NOT_READY",
          `Lead readiness ${li.leadReadiness.band} (${li.leadReadiness.score})`,
        ),
      );
    }

    if (li.opportunityReadiness.band === "ready" || li.opportunityReadiness.band === "strong") {
      codes.push(
        resolveEaiTrustReasonCode(
          "RC_OPPORTUNITY_READY",
          `Opportunity readiness ${li.opportunityReadiness.band} (${li.opportunityReadiness.score})`,
        ),
      );
    } else {
      codes.push(
        resolveEaiTrustReasonCode(
          "RC_OPPORTUNITY_NOT_READY",
          `Opportunity readiness ${li.opportunityReadiness.band} (${li.opportunityReadiness.score})`,
        ),
      );
    }

    if (li.customerReadiness.band === "ready" || li.customerReadiness.band === "strong") {
      codes.push(
        resolveEaiTrustReasonCode(
          "RC_CUSTOMER_READY",
          `Customer readiness ${li.customerReadiness.band} (${li.customerReadiness.score})`,
        ),
      );
    }

    if (li.partnerRecommendation?.proposalKind === "assign_wealth_partner") {
      codes.push(
        resolveEaiTrustReasonCode(
          "RC_PARTNER_SIGNAL",
          "Partner recommendation present — treated as assumption pending confirmation",
        ),
      );
    }

    if (li.confidence.band === "high") {
      codes.push(
        resolveEaiTrustReasonCode(
          "RC_HIGH_EVIDENCE",
          `Lead Intelligence confidence ${li.confidence.band} (${li.confidence.scoreHint})`,
        ),
      );
    } else if (li.confidence.band === "moderate") {
      codes.push(
        resolveEaiTrustReasonCode(
          "RC_MODERATE_EVIDENCE",
          `Lead Intelligence confidence ${li.confidence.band} (${li.confidence.scoreHint})`,
        ),
      );
    } else {
      codes.push(
        resolveEaiTrustReasonCode(
          "RC_LOW_EVIDENCE",
          `Lead Intelligence confidence ${li.confidence.band} (${li.confidence.scoreHint})`,
        ),
      );
    }

    if (li.rankedProposals.length > 0 || li.actionProposalIds.length > 0) {
      codes.push(
        resolveEaiTrustReasonCode(
          "RC_PROPOSAL_DRAFT_ONLY",
          "Ranked Action Proposals are draft recommendations requiring human approval",
        ),
      );
      codes.push(
        resolveEaiTrustReasonCode(
          "RC_HUMAN_APPROVAL_REQUIRED",
          "SB-06: side effects require Action Proposal approval",
        ),
      );
    }
  }

  codes.push(
    resolveEaiTrustReasonCode(
      "RC_ENGINE_DECISION_REQUIRED",
      "Eligibility, FOIR, DBR, pricing remain with enterprise engines — not decided here",
    ),
  );

  // Deduplicate by code
  const seen = new Set<string>();
  return codes.filter((c) => {
    if (seen.has(c.code)) return false;
    seen.add(c.code);
    return true;
  });
}
