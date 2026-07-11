/**
 * EOLE foundation validation — smoke checks for Sprint 13 deliverable verification.
 */

import {
  EOLE_BUSINESS_MODELS,
  EOLE_EXECUTOR_ROLES,
  EOLE_LENDER_PIPELINE_OUTCOME,
  EOLE_OPPORTUNITY_LIFECYCLE_STATUS,
  EOLE_OWNER_TYPES,
} from "@/constants/enterprise-opportunity-lifecycle-engine";
import { getEolePorts, resetEoleComposition } from "./composition";
import { computeEoleOpportunityAging } from "./aging-registry";
import { assignEoleExecutor, unassignEoleExecutor } from "./executor-registry";
import {
  changeEoleOpportunityStage,
  closeEoleOpportunity,
  placeEoleOpportunityOnHold,
  resumeEoleOpportunityFromHold,
  syncEoleOpportunityDisbursement,
  transitionEoleOpportunityLifecycle,
} from "./lifecycle-registry";
import {
  createEoleOpportunityFromLead,
  registerEoleCustomerReference,
  registerEoleFinancialRequirement,
  registerEoleOpportunity,
  registerEoleOpportunityProfile,
  registerEoleOpportunityStrategy,
  registerEolePartnerReference,
  registerEoleProductReference,
} from "./opportunity-registry";
import { assignEoleSourceOwner, registerEoleOpportunityAssignment } from "./ownership-registry";
import {
  captureEolePipelineSnapshot,
  initializeEoleAgingPolicies,
  initializeEoleStages,
  initializeEoleSubStages,
  registerEoleLenderReference,
  registerEolePipeline,
  updateEoleLenderPipelineOutcome,
} from "./pipeline-registry";
import { getEoleRegistrySnapshot } from "./registry-snapshot";
import { listEoleTimeline } from "./timeline-registry";
import {
  validateEoleAssignment,
  validateEoleExecutor,
  validateEoleHold,
  validateEoleLifecycleTransition,
  validateEoleOpportunity,
  validateEoleOwner,
  validateEolePipelineAging,
  validateEoleStage,
} from "./validation-engine";

export function runEoleFoundationValidation(): { passed: boolean; details: Record<string, unknown> } {
  resetEoleComposition();
  initializeEoleStages();
  initializeEoleSubStages();
  initializeEoleAgingPolicies();

  const customerRef = "ec360:customer:cust-001";
  const productRef = "product:home-loan";

  const financialReq = registerEoleFinancialRequirement({
    opportunityId: "pending",
    requirementCode: "FR-001",
    amount: 5000000,
    currencyCode: "INR",
    purpose: "Home purchase",
    fulfillmentModel: EOLE_BUSINESS_MODELS.SECURED_LENDING,
    createdBy: "system",
  });

  const opportunity = createEoleOpportunityFromLead({
    opportunityCode: "OPP-001",
    customerRef,
    productRef,
    financialRequirementId: financialReq.id,
    strategy: EOLE_BUSINESS_MODELS.SECURED_LENDING,
    partnerRef: "epne:partner:wp-001",
    minimumDocumentsSubmitted: true,
    createdBy: "system",
  });

  getEolePorts().financialRequirements.save({
    ...financialReq,
    opportunityId: opportunity.id,
  });

  registerEoleCustomerReference({
    opportunityId: opportunity.id,
    customerRef,
    identityRef: "iaae:identity:ravi",
    createdBy: "system",
  });

  registerEoleProductReference({
    opportunityId: opportunity.id,
    productRef,
    productLibraryRef: "epl:product:home-loan",
    createdBy: "system",
  });

  registerEolePartnerReference({
    opportunityId: opportunity.id,
    partnerRef: "epne:partner:wp-001",
    createdBy: "system",
  });

  registerEoleOpportunityProfile({
    opportunityId: opportunity.id,
    profileCode: "PROF-001",
    summary: "Home loan for primary residence",
    policyRef: "epde:policy:home-loan",
    createdBy: "system",
  });

  registerEoleOpportunityStrategy({
    opportunityId: opportunity.id,
    strategyCode: "STRAT-001",
    businessModel: EOLE_BUSINESS_MODELS.SECURED_LENDING,
    maxSuccessfulDisbursements: 1,
    allowMultipleLenderPipelines: true,
    createdBy: "system",
  });

  const sourceOwner = assignEoleSourceOwner({
    opportunityId: opportunity.id,
    ownerRef: "epne:partner:wp-001",
    assignedBy: "system",
  });

  const executor = assignEoleExecutor({
    opportunityId: opportunity.id,
    executorRef: "internal:rm-001",
    executorRole: EOLE_EXECUTOR_ROLES.PRIMARY_EXECUTOR,
    assignedBy: "system",
  });

  registerEoleOpportunityAssignment({
    opportunityId: opportunity.id,
    assigneeRef: executor.executorRef,
    assigneeType: "executor",
    assignmentCode: "ASGN-001",
    assignedBy: "system",
  });

  transitionEoleOpportunityLifecycle({
    opportunityId: opportunity.id,
    action: "submit_documents",
    actorId: "system",
    stageCode: "document_collection",
    subStageCode: "kyc_pending",
  });

  const hold = placeEoleOpportunityOnHold({
    opportunityId: opportunity.id,
    holdCode: "HOLD-001",
    holdReason: "Awaiting customer confirmation",
    holdDurationDays: 5,
    createdBy: "system",
  });

  resumeEoleOpportunityFromHold({
    holdId: hold.id,
    resumedBy: "system",
    resumeAction: "begin_processing",
  });

  transitionEoleOpportunityLifecycle({
    opportunityId: opportunity.id,
    action: "submit_to_lender",
    actorId: "system",
    stageCode: "lender_review",
    subStageCode: "credit_check",
  });

  const pipeline = registerEolePipeline({
    opportunityId: opportunity.id,
    pipelineCode: "PIPE-001",
    currentStageCode: "lender_review",
    currentSubStageCode: "credit_check",
    createdBy: "system",
  });

  const lenderRef = registerEoleLenderReference({
    opportunityId: opportunity.id,
    pipelineId: pipeline.id,
    lenderRef: "lender:hdfc",
    workflowRef: "ewe:workflow:home-loan",
    documentRefs: ["edie:document:kyc-001", "edie:document:income-001"],
    createdBy: "system",
  });

  captureEolePipelineSnapshot({
    pipelineId: pipeline.id,
    opportunityId: opportunity.id,
    stageCode: "lender_review",
    subStageCode: "credit_check",
    lifecycleStatus: EOLE_OPPORTUNITY_LIFECYCLE_STATUS.LENDER_REVIEW,
    capturedBy: "system",
  });

  transitionEoleOpportunityLifecycle({
    opportunityId: opportunity.id,
    action: "approve",
    actorId: "system",
    stageCode: "approved",
  });

  updateEoleLenderPipelineOutcome({
    lenderReferenceId: lenderRef.id,
    outcome: EOLE_LENDER_PIPELINE_OUTCOME.APPROVED,
    modifiedBy: "system",
  });

  syncEoleOpportunityDisbursement({
    opportunityId: opportunity.id,
    transactionRef: "TXN-001",
    disbursementStatus: "partially_disbursed",
    actorId: "system",
  });

  const aging = computeEoleOpportunityAging({
    opportunityId: opportunity.id,
    stageCode: "lender_review",
    daysInStage: 25,
  });

  const timeline = listEoleTimeline(opportunity.id);

  let rejectionChecks = 0;

  try {
    registerEoleOpportunity({
      opportunityCode: "OPP-001-DUP",
      customerRef,
      productRef,
      financialRequirementId: financialReq.id,
      strategy: EOLE_BUSINESS_MODELS.SECURED_LENDING,
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  const dupCheck = validateEoleOpportunity(
    {
      ...opportunity,
      id: crypto.randomUUID(),
      opportunityCode: "OPP-DUP-TEST",
      enterpriseOpportunityId: "eole:opportunity:dup",
    },
    getEolePorts().opportunities.list(),
  );
  if (dupCheck.issues.some((i) => i.code === "EOLE_DUPLICATE_OPPORTUNITY")) rejectionChecks += 1;

  const missingCustomer = validateEoleOpportunity(
    {
      ...opportunity,
      id: crypto.randomUUID(),
      customerRef: "",
      opportunityCode: "OPP-NO-CUST",
      enterpriseOpportunityId: "eole:opportunity:no-cust",
    },
    [],
  );
  if (missingCustomer.issues.some((i) => i.code === "EOLE_MISSING_CUSTOMER")) rejectionChecks += 1;

  const missingProduct = validateEoleOpportunity(
    {
      ...opportunity,
      id: crypto.randomUUID(),
      productRef: "",
      opportunityCode: "OPP-NO-PROD",
      enterpriseOpportunityId: "eole:opportunity:no-prod",
    },
    [],
  );
  if (missingProduct.issues.some((i) => i.code === "EOLE_MISSING_PRODUCT")) rejectionChecks += 1;

  const invalidOwner = validateEoleOwner(
    {
      id: crypto.randomUUID(),
      opportunityId: opportunity.id,
      ownerRef: "",
      ownerType: EOLE_OWNER_TYPES.SOURCE_OWNER,
      isSourceOwner: true,
      immutable: true,
      enabled: true,
      assignedBy: "system",
      assignedOn: new Date().toISOString(),
    },
    getEolePorts().owners.list(),
  );
  if (invalidOwner.issues.some((i) => i.code === "EOLE_INVALID_OWNER")) rejectionChecks += 1;

  try {
    assignEoleSourceOwner({
      opportunityId: opportunity.id,
      ownerRef: "epne:partner:other",
      assignedBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  const circularAssignment = validateEoleAssignment(
    {
      id: "a3",
      opportunityId: opportunity.id,
      assigneeRef: "ref-3",
      assigneeType: "executor",
      assignmentCode: "ASGN-CIRC",
      parentAssignmentId: "a1",
      enabled: true,
      assignedBy: "system",
      assignedOn: new Date().toISOString(),
    },
    [
      {
        id: "a1",
        opportunityId: opportunity.id,
        assigneeRef: "ref-1",
        assigneeType: "owner",
        assignmentCode: "ASGN-1",
        parentAssignmentId: "a2",
        enabled: true,
        assignedBy: "system",
        assignedOn: new Date().toISOString(),
      },
      {
        id: "a2",
        opportunityId: opportunity.id,
        assigneeRef: "ref-2",
        assigneeType: "executor",
        assignmentCode: "ASGN-2",
        parentAssignmentId: "a3",
        enabled: true,
        assignedBy: "system",
        assignedOn: new Date().toISOString(),
      },
    ],
  );
  if (circularAssignment.issues.some((i) => i.code === "EOLE_CIRCULAR_ASSIGNMENT")) rejectionChecks += 1;

  const dupExecutor = validateEoleExecutor(
    {
      id: crypto.randomUUID(),
      opportunityId: opportunity.id,
      executorRef: executor.executorRef,
      executorRole: EOLE_EXECUTOR_ROLES.SECONDARY_EXECUTOR,
      active: true,
      assignedBy: "system",
      assignedOn: new Date().toISOString(),
    },
    getEolePorts().executors.list(),
  );
  if (dupExecutor.issues.some((i) => i.code === "EOLE_DUPLICATE_EXECUTOR")) rejectionChecks += 1;

  const invalidLifecycle = validateEoleLifecycleTransition("fully_disbursed", "processing");
  if (invalidLifecycle.issues.some((i) => i.code === "EOLE_INVALID_LIFECYCLE")) rejectionChecks += 1;

  const invalidStage = validateEoleStage("nonexistent_stage", getEolePorts().stages.list());
  if (invalidStage.issues.some((i) => i.code === "EOLE_INVALID_STAGE")) rejectionChecks += 1;

  const invalidHold = validateEoleHold({
    id: crypto.randomUUID(),
    opportunityId: opportunity.id,
    holdCode: "HOLD-BAD",
    holdReason: "",
    holdDate: new Date().toISOString(),
    holdDurationDays: 35,
    maxHoldPeriodDays: 30,
    status: "active",
    recommendClosure: true,
    createdBy: "system",
    createdOn: new Date().toISOString(),
  });
  if (invalidHold.issues.some((i) => i.code === "EOLE_INVALID_HOLD")) rejectionChecks += 1;

  const policy = getEolePorts().agingPolicies.findByStage("lender_review")!;
  const agingValidation = validateEolePipelineAging(
    {
      id: crypto.randomUUID(),
      opportunityId: opportunity.id,
      stageCode: "lender_review",
      daysInStage: 25,
      severity: "mission_control",
      policyCode: policy.policyCode,
      computedOn: new Date().toISOString(),
    },
    policy,
  );
  if (agingValidation.issues.some((i) => i.code === "EOLE_AGING_EXCEEDED")) rejectionChecks += 1;

  const closedOpp = closeEoleOpportunity({
    opportunityId: opportunity.id,
    action: "full_disburse",
    actorId: "system",
  });

  try {
    transitionEoleOpportunityLifecycle({
      opportunityId: opportunity.id,
      action: "begin_processing",
      actorId: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  unassignEoleExecutor({ executorId: executor.id, unassignedBy: "system" });
  changeEoleOpportunityStage({
    opportunityId: opportunity.id,
    stageCode: "closed",
    actorId: "system",
  });

  const snap = getEoleRegistrySnapshot();

  const passed =
    closedOpp.lifecycleStatus === EOLE_OPPORTUNITY_LIFECYCLE_STATUS.FULLY_DISBURSED &&
    sourceOwner.immutable === true &&
    snap.opportunities.length >= 1 &&
    snap.lenderReferences.length >= 1 &&
    snap.pipelineSnapshots.length >= 1 &&
    snap.auditReferences.length >= 5 &&
    snap.stages.length >= 7 &&
    snap.agingPolicies.length >= 3 &&
    timeline.length >= 5 &&
    rejectionChecks >= 9;

  return {
    passed,
    details: {
      enterpriseOpportunityId: opportunity.enterpriseOpportunityId,
      lifecycleStatus: closedOpp.lifecycleStatus,
      sourceOwner: sourceOwner.ownerRef,
      executorHistory: snap.executors.length,
      lenderPipelines: snap.lenderReferences.length,
      pipelineSnapshots: snap.pipelineSnapshots.length,
      agingSeverity: aging.severity,
      timelineEntries: timeline.length,
      rejectionChecks,
      auditReferences: snap.auditReferences.length,
      stages: snap.stages.length,
      agingPolicies: snap.agingPolicies.length,
    },
  };
}
