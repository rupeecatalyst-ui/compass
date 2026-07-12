/**
 * EDE + DKF + ERE foundation validation — SPR-006C.
 */

import { EDE_FRAMEWORK_VERSION } from "@/constants/enterprise-decision-engine";
import { resetEdeComposition } from "./composition";
import { resetEdeOrchestrationConfig } from "./config";
import { collectEdeDecisionContext } from "./context-collector";
import {
  evaluateEdeDecision,
  listEdeDecisionHistory,
  recordEdeUserDecisionAction,
} from "./decision-registry";
import { initializeDkfFrameworkScaffold, listDkfKnowledgePackages } from "./knowledge-registry";
import { getEreReasoningTrace, listEreReasoningTraces } from "./reasoning-engine";
import { getEdeFrameworkVersion, getEdeRegistrySnapshot } from "./registry-snapshot";
import { getEreAdministratorArchitecture } from "@/constants/enterprise-decision-engine";

export function runEdeFoundationValidation(): {
  passed: boolean;
  details: Record<string, unknown>;
} {
  resetEdeComposition();
  resetEdeOrchestrationConfig();
  initializeDkfFrameworkScaffold("validation");

  const context = collectEdeDecisionContext({
    opportunityId: "opp-ede-validation",
    opportunityCode: "OPP-EDE-001",
    customerName: "Validation Customer",
    productRef: "product:home-loan",
    stageCode: "processing",
    documentRequiredCount: 5,
    documentUploadedCount: 4,
    documentVerifiedCount: 3,
    openTaskCount: 2,
    overdueTaskCount: 1,
    healthScore: 68,
    healthBand: "needs_attention",
    pulseLabel: "moderate",
    workflowProgressRatio: 0.45,
    workflowStatus: "active",
    workflowDefinitionCode: "EWOE-HL-SAL-001",
    dialogueSummary: "Customer prefers evening outreach.",
    communicationEventCount: 2,
    daysSinceLastActivity: 2,
    lifeLenderName: "HDFC Bank",
    lifeRecommended: true,
  });

  const result = evaluateEdeDecision({
    decisionCategory: "opportunity_assessment",
    opportunityId: "opp-ede-validation",
    contextInput: context,
    triggerSource: "system",
    requestedBy: "validation",
    reason: "ERE foundation validation",
  });

  const acted = recordEdeUserDecisionAction({
    decisionId: result.response.decisionId,
    userAction: "acknowledged",
    actorId: "validation",
  });

  const history = listEdeDecisionHistory("opp-ede-validation");
  const packages = listDkfKnowledgePackages();
  const snapshot = getEdeRegistrySnapshot();
  const traceId = result.response.reasoningTraceId;
  const storedTrace = traceId ? getEreReasoningTrace(traceId) : undefined;
  const traces = listEreReasoningTraces(result.response.decisionId);

  const chainIds = result.response.reasoningChain?.map((s) => s.stageId) ?? [];
  const requiredStages = [
    "decision_request",
    "context_collection",
    "knowledge_matching",
    "evidence_collection",
    "evidence_weighting",
    "conflict_resolution",
    "reasoning",
    "recommendation",
    "explanation",
    "dialogue_history",
  ];

  const ax = getEreAdministratorArchitecture();

  const passed =
    getEdeFrameworkVersion() === EDE_FRAMEWORK_VERSION &&
    packages.length >= 5 &&
    result.response.knowledgeUsed.length >= 1 &&
    result.response.evidence.evidenceUsed.length >= 1 &&
    !!result.response.reasoningTraceId &&
    !!result.response.reasoningTrace &&
    result.response.reasoningTrace.generatedBy === "Enterprise Reasoning Engine" &&
    requiredStages.every((s) => chainIds.includes(s as (typeof chainIds)[number])) &&
    !!result.response.explainability?.whatRecommended &&
    !!result.response.explainability?.why &&
    !!result.response.explainability?.suggestedNextStep &&
    Array.isArray(result.response.explainability?.highestImpactEvidence) &&
    Array.isArray(result.response.explainability?.assumptions) &&
    Array.isArray(result.response.reasoningTrace.missingEvidence) &&
    !!result.response.reasoningTrace.finalRecommendation &&
    result.response.reasoningTrace.knowledgePackagesEvaluated.length >= 1 &&
    (result.response.reasoningTrace.evidenceUsed.length >= 1 ||
      result.response.reasoningTrace.evidenceIgnored.length >= 1) &&
    ax.supportsSimulation &&
    ax.supportsVersioning &&
    ax.supportsRollback &&
    ax.supportsImpactAnalysis &&
    !!storedTrace &&
    traces.length >= 1 &&
    snapshot.reasoningTraces.length >= 1 &&
    result.response.executable === false &&
    result.response.mayBlockProgression === false &&
    !!result.response.explanation &&
    history.length >= 1 &&
    acted.userAction === "acknowledged" &&
    snapshot.knowledgePackages.length >= 5;

  return {
    passed,
    details: {
      version: getEdeFrameworkVersion(),
      decisionId: result.response.decisionId,
      reasoningTraceId: result.response.reasoningTraceId,
      chainStages: chainIds,
      conflicts: result.response.reasoningTrace?.conflicts.length ?? 0,
      winningKnowledge:
        result.response.reasoningTrace?.conflicts[0]?.winningKnowledge?.map((k) => k.name) ?? [],
      evidenceUsed: result.response.reasoningTrace?.evidenceUsed.length ?? 0,
      evidenceIgnored: result.response.reasoningTrace?.evidenceIgnored.length ?? 0,
      missingEvidence: result.response.reasoningTrace?.missingEvidence ?? [],
      knowledgeUsed: result.response.knowledgeUsed.map((k) => k.name),
      highestImpact: result.response.explainability?.highestImpactEvidence.slice(0, 2),
      suggestedNextStep: result.response.explainability?.suggestedNextStep,
      axCapabilities: ax.ecgAdapterKeys,
      reasoningProfileSource: result.response.reasoningTrace?.reasoningProfileSource,
      confidence: result.response.confidence,
      empowermentPreserved: result.response.executable === false,
    },
  };
}
