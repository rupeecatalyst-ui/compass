/**
 * EAC foundation validation — SPR-006D.
 */

import {
  EAC_FRAMEWORK_VERSION,
  getEacAdministratorArchitecture,
} from "@/constants/enterprise-advisory-console";
import { evaluateEdeDecision } from "@/lib/enterprise-decision-engine/decision-registry";
import { resetEdeComposition } from "@/lib/enterprise-decision-engine/composition";
import { resetEdeOrchestrationConfig } from "@/lib/enterprise-decision-engine/config";
import { collectEdeDecisionContext } from "@/lib/enterprise-decision-engine/context-collector";
import { initializeDkfFrameworkScaffold } from "@/lib/enterprise-decision-engine/knowledge-registry";
import {
  acceptEacAdvisory,
  completeEacAdvisory,
  deferEacAdvisory,
  filterEacAdvisories,
  listEacLifecycleEvents,
  listEacOverrides,
  overrideEacAdvisory,
  viewEacAdvisory,
} from "./advisory-registry";
import { resetEacComposition } from "./composition";
import { resetEacOrchestrationConfig } from "./config";
import { getEacFrameworkVersion, getEacRegistrySnapshot } from "./registry-snapshot";

export function runEacFoundationValidation(): {
  passed: boolean;
  details: Record<string, unknown>;
} {
  resetEdeComposition();
  resetEdeOrchestrationConfig();
  resetEacComposition();
  resetEacOrchestrationConfig();
  initializeDkfFrameworkScaffold("validation");

  const context = collectEdeDecisionContext({
    opportunityId: "opp-eac-validation",
    opportunityCode: "OPP-EAC-001",
    customerName: "Advisory Validation Customer",
    productRef: "product:home-loan",
    stageCode: "processing",
    documentRequiredCount: 4,
    documentUploadedCount: 3,
    documentVerifiedCount: 2,
    openTaskCount: 1,
    overdueTaskCount: 1,
    healthScore: 65,
    healthBand: "needs_attention",
    pulseLabel: "moderate",
    workflowProgressRatio: 0.4,
    workflowStatus: "active",
    daysSinceLastActivity: 2,
    lifeLenderName: "HDFC Bank",
    lifeRecommended: true,
    assignedRmLabel: "RM-EAC",
  });

  const { response } = evaluateEdeDecision({
    decisionCategory: "opportunity_assessment",
    opportunityId: "opp-eac-validation",
    contextInput: context,
    triggerSource: "system",
    requestedBy: "validation",
    reason: "EAC foundation validation",
  });

  const snapshotAfterIngest = getEacRegistrySnapshot();
  const advisory = snapshotAfterIngest.advisories[0];

  if (!advisory) {
    return { passed: false, details: { error: "No advisory ingested from EDE" } };
  }

  const viewed = viewEacAdvisory(advisory.advisoryId, "validation");
  const deferred = deferEacAdvisory(advisory.advisoryId, "validation", "Need more docs");
  const accepted = acceptEacAdvisory(advisory.advisoryId, "validation", "Proceed carefully");

  // Fresh advisory for override path
  const { response: response2 } = evaluateEdeDecision({
    decisionCategory: "document_readiness",
    opportunityId: "opp-eac-validation",
    contextInput: context,
    triggerSource: "system",
    requestedBy: "validation",
    reason: "EAC override path",
  });
  void response2;
  const overrideTarget = getEacRegistrySnapshot().advisories.find(
    (a) => a.decisionId === response2.decisionId,
  );
  if (!overrideTarget) {
    return { passed: false, details: { error: "Override target missing" } };
  }
  viewEacAdvisory(overrideTarget.advisoryId, "validation");
  const overridden = overrideEacAdvisory({
    advisoryId: overrideTarget.advisoryId,
    actorId: "validation",
    reason: "Local exception",
    businessJustification: "Customer already provided equivalent documents offline",
    finalOutcome: "manual_exception",
  });
  const completed = completeEacAdvisory(overrideTarget.advisoryId, "validation");

  const filtered = filterEacAdvisories({
    status: "accepted",
    customerQuery: "Advisory",
    confidenceMin: 10,
  });
  const events = listEacLifecycleEvents();
  const overrides = listEacOverrides();
  const ax = getEacAdministratorArchitecture();
  const snapshot = getEacRegistrySnapshot();

  const passed =
    getEacFrameworkVersion() === EAC_FRAMEWORK_VERSION &&
    advisory.executable === false &&
    viewed.status === "viewed" &&
    deferred.status === "deferred" &&
    accepted.status === "accepted" &&
    overridden.status === "overridden" &&
    !!overridden.override?.businessJustification &&
    completed.status === "completed" &&
    filtered.length >= 1 &&
    events.length >= 5 &&
    overrides.length >= 1 &&
    ax.supportsVersioning &&
    ax.supportsRollback &&
    ax.supportsImpactAnalysis &&
    snapshot.advisories.length >= 2 &&
    !!response.decisionId;

  return {
    passed,
    details: {
      version: getEacFrameworkVersion(),
      advisoryCount: snapshot.advisories.length,
      lifecycleEvents: events.length,
      overrides: overrides.length,
      acceptedId: accepted.advisoryId,
      overrideId: overridden.override?.overrideId,
      axKeys: ax.ecgAdapterKeys,
      empowermentPreserved: advisory.executable === false,
    },
  };
}
