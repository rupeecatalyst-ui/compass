/**
 * EOLE default pipeline stages and aging policies.
 */

import { EOLE_OPPORTUNITY_LIFECYCLE_STATUS } from "./lifecycle";

export const EOLE_DEFAULT_STAGES = [
  {
    stageCode: "intake",
    stageName: "Intake",
    lifecycleStatus: EOLE_OPPORTUNITY_LIFECYCLE_STATUS.NEW,
    sortOrder: 1,
    terminal: false,
  },
  {
    stageCode: "document_collection",
    stageName: "Document Collection",
    lifecycleStatus: EOLE_OPPORTUNITY_LIFECYCLE_STATUS.DOCUMENTS_PENDING,
    sortOrder: 2,
    terminal: false,
  },
  {
    stageCode: "processing",
    stageName: "Processing",
    lifecycleStatus: EOLE_OPPORTUNITY_LIFECYCLE_STATUS.PROCESSING,
    sortOrder: 3,
    terminal: false,
  },
  {
    stageCode: "lender_review",
    stageName: "Lender Review",
    lifecycleStatus: EOLE_OPPORTUNITY_LIFECYCLE_STATUS.LENDER_REVIEW,
    sortOrder: 4,
    terminal: false,
  },
  {
    stageCode: "approved",
    stageName: "Approved",
    lifecycleStatus: EOLE_OPPORTUNITY_LIFECYCLE_STATUS.APPROVED,
    sortOrder: 5,
    terminal: false,
  },
  {
    stageCode: "disbursement",
    stageName: "Disbursement",
    lifecycleStatus: EOLE_OPPORTUNITY_LIFECYCLE_STATUS.PARTIALLY_DISBURSED,
    sortOrder: 6,
    terminal: false,
  },
  {
    stageCode: "closed",
    stageName: "Closed",
    lifecycleStatus: EOLE_OPPORTUNITY_LIFECYCLE_STATUS.FULLY_DISBURSED,
    sortOrder: 7,
    terminal: true,
  },
] as const;

export const EOLE_DEFAULT_SUB_STAGES = [
  { stageCode: "document_collection", subStageCode: "kyc_pending", subStageName: "KYC Pending", sortOrder: 1 },
  { stageCode: "document_collection", subStageCode: "income_docs", subStageName: "Income Documents", sortOrder: 2 },
  { stageCode: "lender_review", subStageCode: "credit_check", subStageName: "Credit Check", sortOrder: 1 },
  { stageCode: "lender_review", subStageCode: "sanction", subStageName: "Sanction", sortOrder: 2 },
  { stageCode: "disbursement", subStageCode: "first_tranche", subStageName: "First Tranche", sortOrder: 1 },
  { stageCode: "disbursement", subStageCode: "final_tranche", subStageName: "Final Tranche", sortOrder: 2 },
] as const;

export const EOLE_DEFAULT_AGING_POLICIES = [
  {
    policyCode: "AGING-DOC-COLLECTION",
    stageCode: "document_collection",
    maxDays: 14,
    reminderDays: 7,
    escalationDays: 10,
    managerNotificationDays: 12,
    missionControlNotificationDays: 14,
  },
  {
    policyCode: "AGING-LENDER-REVIEW",
    stageCode: "lender_review",
    maxDays: 21,
    reminderDays: 10,
    escalationDays: 15,
    managerNotificationDays: 18,
    missionControlNotificationDays: 21,
  },
  {
    policyCode: "AGING-PROCESSING",
    stageCode: "processing",
    maxDays: 10,
    reminderDays: 5,
    escalationDays: 7,
    managerNotificationDays: 9,
    missionControlNotificationDays: 10,
  },
] as const;
