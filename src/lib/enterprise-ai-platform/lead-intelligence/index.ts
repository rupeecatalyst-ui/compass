/**
 * Lead Intelligence & Action Proposal Engine — public barrel (CO-AI-109).
 */

export { runEaiLeadIntelligence } from "./orchestrator";
export { assessEaiLeadReadiness } from "./lead-readiness";
export { assessEaiOpportunityReadiness } from "./opportunity-readiness";
export { assessEaiDocumentReadiness } from "./document-readiness";
export { assessEaiCustomerReadiness } from "./customer-readiness";
export { recommendEaiPartner } from "./partner-recommendation";
export { deriveEaiLeadIntelligenceNba } from "./next-best-action";
export { rankEaiActionProposals, attachEaiProposalIds } from "./proposal-ranking";
export { emitEaiLeadIntelligenceProposals } from "./proposal-emitter";
export { scoreEaiLeadIntelligencePriority } from "./priority-scoring";
export { assessEaiLeadIntelligenceConfidence } from "./confidence";
export { validateEaiLeadIntelligenceResult } from "./validation";
export { runEaiLeadIntelligenceReadiness } from "./readiness";
