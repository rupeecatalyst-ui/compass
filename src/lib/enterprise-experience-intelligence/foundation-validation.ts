/**
 * EEI foundation validation — SPR-006E.
 */

import {
  EEI_FRAMEWORK_VERSION,
  getEeiAdministratorArchitecture,
} from "@/constants/enterprise-experience-intelligence";
import { acceptEacAdvisory } from "@/lib/enterprise-advisory-console/advisory-registry";
import { resetEacComposition } from "@/lib/enterprise-advisory-console/composition";
import { resetEacOrchestrationConfig } from "@/lib/enterprise-advisory-console/config";
import { getEacRegistrySnapshot } from "@/lib/enterprise-advisory-console/registry-snapshot";
import { resetEdeComposition } from "@/lib/enterprise-decision-engine/composition";
import { resetEdeOrchestrationConfig } from "@/lib/enterprise-decision-engine/config";
import { collectEdeDecisionContext } from "@/lib/enterprise-decision-engine/context-collector";
import { evaluateEdeDecision } from "@/lib/enterprise-decision-engine/decision-registry";
import { initializeDkfFrameworkScaffold } from "@/lib/enterprise-decision-engine/knowledge-registry";
import { resetEeiComposition } from "./composition";
import { resetEeiOrchestrationConfig } from "./config";
import {
  closeEeiExperience,
  getEeiExperienceByAdvisory,
  listEeiExperiences,
  recordEeiBusinessOutcome,
  recordEeiBusinessValue,
} from "./experience-registry";
import { listEeiKnowledgeFeedback } from "./knowledge-feedback";
import { getEeiFrameworkVersion, getEeiRegistrySnapshot } from "./registry-snapshot";

export function runEeiFoundationValidation(): {
  passed: boolean;
  details: Record<string, unknown>;
} {
  resetEdeComposition();
  resetEdeOrchestrationConfig();
  resetEacComposition();
  resetEacOrchestrationConfig();
  resetEeiComposition();
  resetEeiOrchestrationConfig();
  initializeDkfFrameworkScaffold("validation");

  const context = collectEdeDecisionContext({
    opportunityId: "opp-eei-validation",
    opportunityCode: "OPP-EEI-001",
    customerName: "Experience Validation Customer",
    productRef: "product:home-loan",
    stageCode: "processing",
    documentRequiredCount: 3,
    documentUploadedCount: 3,
    documentVerifiedCount: 2,
    openTaskCount: 1,
    overdueTaskCount: 0,
    healthScore: 70,
    healthBand: "good",
    pulseLabel: "moderate",
    workflowProgressRatio: 0.5,
    workflowStatus: "active",
    daysSinceLastActivity: 1,
    lifeLenderName: "HDFC Bank",
    lifeRecommended: true,
  });

  const { response } = evaluateEdeDecision({
    decisionCategory: "opportunity_assessment",
    opportunityId: "opp-eei-validation",
    contextInput: context,
    triggerSource: "system",
    requestedBy: "validation",
    reason: "EEI foundation validation",
  });

  const advisory = getEacRegistrySnapshot().advisories.find(
    (a) => a.decisionId === response.decisionId,
  );
  if (!advisory) {
    return { passed: false, details: { error: "Advisory not ingested from EDE" } };
  }

  let experience = getEeiExperienceByAdvisory(advisory.advisoryId);
  if (!experience) {
    return { passed: false, details: { error: "Experience not created from advisory" } };
  }

  acceptEacAdvisory(advisory.advisoryId, "validation", "Accept for EEI test");
  experience = getEeiExperienceByAdvisory(advisory.advisoryId)!;

  const withBusiness = recordEeiBusinessOutcome({
    experienceId: experience.experienceId,
    outcome: "documents_completed",
    actorId: "validation",
    remarks: "Docs completed after advisory",
  });

  const withValue = recordEeiBusinessValue({
    experienceId: withBusiness.experienceId,
    values: ["better_document_quality", "lower_rework", "improved_rm_productivity"],
    actorId: "validation",
    remarks: "Descriptive value only — no score",
  });

  const closed = closeEeiExperience({
    experienceId: withValue.experienceId,
    actorId: "validation",
    remarks: "Validation complete",
  });

  const timelineTypes = closed.timeline.map((t) => t.eventType);
  const feedback = listEeiKnowledgeFeedback();
  const ax = getEeiAdministratorArchitecture();
  const snapshot = getEeiRegistrySnapshot();
  const trace = closed.valueTraceability;

  const passed =
    getEeiFrameworkVersion() === EEI_FRAMEWORK_VERSION &&
    closed.executable === false &&
    closed.autoBehaviourChange === false &&
    closed.neverAutoModifiesEnterpriseConfig === true &&
    closed.recommendationOutcome === "accepted" &&
    closed.businessOutcome === "documents_completed" &&
    closed.businessValues.includes("better_document_quality") &&
    closed.finalStatus === "closed" &&
    !!trace.recommendationIssued &&
    trace.actionTaken === "accepted" &&
    trace.businessOutcomeOccurred === "documents_completed" &&
    trace.businessValueCreated.includes("better_document_quality") &&
    Array.isArray(trace.knowledgePackagesContributed) &&
    timelineTypes.includes("recommendation_issued") &&
    timelineTypes.includes("user_action") &&
    timelineTypes.includes("business_outcome") &&
    timelineTypes.includes("business_value") &&
    timelineTypes.includes("final_status") &&
    timelineTypes.includes("experience_recorded") &&
    feedback.length >= 1 &&
    feedback[0].businessValues.includes("better_document_quality") &&
    ax.autoPublishing === false &&
    ax.supportsHighBusinessValueReview &&
    ax.supportsWeakKnowledgePackageReview &&
    ax.supportsReasoningProfileRefinementReview &&
    ax.neverAutoModifiesKnowledgePackages &&
    ax.neverAutoModifiesDecisionPolicies &&
    snapshot.experiences.length >= 1 &&
    listEeiExperiences("opp-eei-validation").length >= 1;

  return {
    passed,
    details: {
      version: getEeiFrameworkVersion(),
      experienceId: closed.experienceId,
      recommendationOutcome: closed.recommendationOutcome,
      businessOutcome: closed.businessOutcome,
      businessValues: closed.businessValues,
      valueTraceability: {
        actionTaken: trace.actionTaken,
        businessValueCreated: trace.businessValueCreated,
        reasoningProfileId: trace.reasoningProfileId,
        decisionTraceId: trace.decisionTraceId,
        knowledgeCount: trace.knowledgePackagesContributed.length,
      },
      finalStatus: closed.finalStatus,
      timelineLength: closed.timeline.length,
      feedbackCount: feedback.length,
      axKeys: ax.ecgAdapterKeys,
      empowermentPreserved:
        closed.executable === false &&
        closed.autoBehaviourChange === false &&
        closed.neverAutoModifiesEnterpriseConfig === true,
    },
  };
}
