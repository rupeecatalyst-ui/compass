/**
 * Lead Intelligence & Action Proposal constants (CO-AI-109 / Sprint AI-9).
 */

export const EAI_LEAD_INTELLIGENCE_VERSION = "1.0.0-ai9";

export const EAI_LEAD_INTELLIGENCE_DISCLAIMERS = [
  "Lead Intelligence generates recommendations and Action Proposals only.",
  "It never creates leads, opportunities, CRM mutations, or workflow executions.",
  "Human approval is required before any proposed side effect (SB-06).",
  "Readiness scores reflect consultation completeness — not credit approval.",
] as const;

/** Proposal kinds this engine may emit as drafts. */
export const EAI_LEAD_INTELLIGENCE_PROPOSAL_KINDS = [
  "create_lead",
  "create_opportunity",
  "request_documents",
  "assign_wealth_partner",
  "schedule_callback",
  "create_task",
  "create_reminder",
  "generic",
] as const;

export const EAI_LEAD_INTELLIGENCE_FORBIDDEN_CLAIMS = [
  "lead created",
  "opportunity created",
  "crm updated",
  "workflow triggered",
  "workflow executed",
  "record created",
  "opportunity opened",
] as const;

/** Max ranked proposals returned per run. */
export const EAI_LEAD_INTELLIGENCE_MAX_RANKED = 5;
