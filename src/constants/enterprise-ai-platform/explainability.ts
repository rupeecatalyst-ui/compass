/**
 * Explainability & Trust Engine constants (CO-AI-110 / Sprint AI-10).
 */

import type { EaiTrustReasonCodeId } from "@/types/enterprise-ai-explainability";

export const EAI_EXPLAINABILITY_VERSION = "1.0.0-ai10";

export const EAI_EXPLAINABILITY_DISCLAIMERS = [
  "Explainability cites only observed signals — it never fabricates reasons.",
  "Uncertainty is always surfaced; confidence is not certainty.",
  "Facts, assumptions, and recommendations are labelled separately.",
  "Eligibility, FOIR, DBR, pricing, and approvals remain enterprise engines.",
] as const;

/** Curated reason-code catalogue — only these codes may appear in explanations. */
export const EAI_TRUST_REASON_CATALOGUE: Record<
  EaiTrustReasonCodeId,
  { label: string; statementClass: "fact" | "assumption" | "recommendation" }
> = {
  RC_OUTSIDE_DOMAIN: { label: "Outside approved financial domain", statementClass: "fact" },
  RC_OBJECTIVE_PRESENT: { label: "Customer objective present", statementClass: "fact" },
  RC_OBJECTIVE_MISSING: { label: "Customer objective missing", statementClass: "fact" },
  RC_PRODUCT_KNOWN: { label: "Product interest known", statementClass: "fact" },
  RC_PRODUCT_UNKNOWN: { label: "Product interest unknown", statementClass: "fact" },
  RC_AMOUNT_KNOWN: { label: "Required amount known", statementClass: "fact" },
  RC_AMOUNT_UNKNOWN: { label: "Required amount unknown", statementClass: "fact" },
  RC_EMPLOYMENT_KNOWN: { label: "Employment context known", statementClass: "fact" },
  RC_DOCUMENTS_READY: { label: "Documents indicated ready", statementClass: "fact" },
  RC_DOCUMENTS_GAP: { label: "Document readiness gap", statementClass: "fact" },
  RC_CONSULTATION_COMPLETE: { label: "Consultation sufficiently complete", statementClass: "fact" },
  RC_CONSULTATION_INCOMPLETE: { label: "Consultation incomplete", statementClass: "fact" },
  RC_LEAD_READY: { label: "Lead readiness meets proposal threshold", statementClass: "recommendation" },
  RC_LEAD_NOT_READY: { label: "Lead readiness below proposal threshold", statementClass: "fact" },
  RC_OPPORTUNITY_READY: {
    label: "Opportunity readiness meets proposal threshold",
    statementClass: "recommendation",
  },
  RC_OPPORTUNITY_NOT_READY: {
    label: "Opportunity readiness below proposal threshold",
    statementClass: "fact",
  },
  RC_CUSTOMER_READY: { label: "Customer readiness supportive", statementClass: "recommendation" },
  RC_INFORMATION_GAPS: { label: "Information gaps remain", statementClass: "fact" },
  RC_PARTNER_SIGNAL: { label: "Partner-assist signal observed", statementClass: "assumption" },
  RC_ENGINE_DECISION_REQUIRED: {
    label: "Enterprise engine decision still required",
    statementClass: "assumption",
  },
  RC_HUMAN_APPROVAL_REQUIRED: {
    label: "Human approval required before side effects",
    statementClass: "recommendation",
  },
  RC_LOW_EVIDENCE: { label: "Low evidence completeness", statementClass: "fact" },
  RC_MODERATE_EVIDENCE: { label: "Moderate evidence completeness", statementClass: "fact" },
  RC_HIGH_EVIDENCE: { label: "High evidence completeness", statementClass: "fact" },
  RC_ALTERNATIVE_CONTINUE_CONSULTATION: {
    label: "Alternative: continue consultation",
    statementClass: "recommendation",
  },
  RC_ALTERNATIVE_REQUEST_DOCUMENTS: {
    label: "Alternative: request documents",
    statementClass: "recommendation",
  },
  RC_PROPOSAL_DRAFT_ONLY: {
    label: "Action Proposal is draft-only / not executed",
    statementClass: "recommendation",
  },
};

export const EAI_EXPLAINABILITY_FORBIDDEN_CLAIMS = [
  "guaranteed approval",
  "definitely qualifies",
  "we calculated foir",
  "loan sanctioned",
  "crm updated",
  "lead created",
  "opportunity created",
] as const;
