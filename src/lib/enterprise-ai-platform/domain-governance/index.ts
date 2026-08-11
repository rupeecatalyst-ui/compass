/**
 * Domain Boundary & Knowledge Governance — public barrel (CO-AI-104 DIE).
 */

export {
  assertEaiDomainAllowsKnowledge,
  assertEaiDomainAllowsLlm,
  evaluateEaiDomainBoundary,
} from "./domain-boundary";
export { classifyEaiSarathiIntent } from "./intent-classifier";
export { buildEaiSafeRefusal, getEaiOutsideDomainRefusal } from "./safe-refusal";
export {
  assertEaiKnowledgeSourceZoneAllowed,
  ensureEaiKnowledgeSourcesSeeded,
  getEaiKnowledgeSource,
  listEaiKnowledgeSources,
  registerEaiKnowledgeSource,
  resetEaiKnowledgeSources,
} from "./knowledge-governance";
export {
  applyEaiMicroCommunication,
  validateEaiMicroCommunicationCompliance,
} from "./micro-communication";
export {
  getEaiPartnerToneLibraryVersion,
  getEaiToneEntry,
  getEaiToneLibraryVersion,
  listEaiToneEntries,
  resolveEaiToneAudience,
  resolveEaiToneMessage,
  validateEaiToneLibraryIntegrity,
} from "./tone-library";
export { runEaiDomainGovernanceReadiness } from "./readiness";
