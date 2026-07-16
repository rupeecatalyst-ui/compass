/**
 * Certified Enterprise Loan Journey — Chanakya Guide.
 * Order and phases are frozen for Enterprise Certification.
 * Do not reorder stages without explicit certification approval.
 */

import type {
  ChanakyaLoanJourneyPhaseDef,
  ChanakyaLoanJourneyStageDef,
} from "@/types/chanakya-guide";

export const CHANAKYA_LOAN_JOURNEY_PHASES: ChanakyaLoanJourneyPhaseDef[] = [
  {
    id: "lead_qualification",
    label: "Lead Qualification",
    description: "Identify the customer and plan the opportunity before documentation.",
    tone: "blue",
  },
  {
    id: "credit_readiness",
    label: "Credit Readiness",
    description: "Collect documents and verify stated information before execution.",
    tone: "purple",
  },
  {
    id: "loan_execution",
    label: "Loan Execution",
    description: "Run the loan file across lenders, tasks, timeline, and approval.",
    tone: "green",
  },
  {
    id: "post_disbursement",
    label: "Post Disbursement",
    description: "Complete disbursement, accounting, and orderly closure.",
    tone: "orange",
  },
];

/** Certified left → right Loan Journey (order frozen). */
export const CHANAKYA_LOAN_JOURNEY_STAGES: ChanakyaLoanJourneyStageDef[] = [
  {
    id: "contact",
    order: 1,
    phaseId: "lead_qualification",
    name: "Contact",
    objective: "Capture the customer identity that anchors every later workspace.",
    chanakyaMessage:
      "You are at the start of Lead Qualification. Establish a clean Contact record before creating the opportunity.",
    matchWorkspaceIds: [],
    matchSections: ["contact", "directory"],
  },
  {
    id: "opportunity_workspace",
    order: 2,
    phaseId: "lead_qualification",
    name: "Opportunity Workspace",
    objective: "Frame the commercial need and open the guided opportunity path.",
    chanakyaMessage:
      "You are in Lead Qualification. Shape the opportunity clearly so planning and documentation stay aligned.",
    matchWorkspaceIds: ["opportunity_setup"],
  },
  {
    id: "strategic_workspace",
    order: 3,
    phaseId: "lead_qualification",
    name: "Strategic Workspace",
    objective: "Prepare the opportunity before document collection.",
    chanakyaMessage:
      "You are currently in the Lead Qualification phase. Complete planning before collecting customer documents. Once documentation is ready, continue to Credit Workbench for verification.",
    matchWorkspaceIds: ["strategic_workspace"],
  },
  {
    id: "document_center",
    order: 4,
    phaseId: "credit_readiness",
    name: "Document Center",
    objective: "Upload, collect and manage customer documents before verification.",
    chanakyaMessage:
      "You are in Credit Readiness. Collect a complete document pack here before verification begins.",
    matchWorkspaceIds: ["document_center"],
  },
  {
    id: "credit_workbench",
    order: 5,
    phaseId: "credit_readiness",
    name: "Credit Workbench",
    objective: "Verify stated facts against documents before loan execution.",
    chanakyaMessage:
      "You are in Credit Readiness. Verify documents carefully — clean verification protects lender confidence.",
    matchWorkspaceIds: ["credit_workbench"],
  },
  {
    id: "loan_workspace",
    order: 6,
    phaseId: "loan_execution",
    name: "Loan Workspace",
    objective: "Execute the active loan file without leaving the transaction.",
    chanakyaMessage:
      "You are in Loan Execution. Keep work inside this loan file — Action Center handles routine moves in context.",
    matchWorkspaceIds: ["loan_workspace"],
    matchSections: ["overview", "default", "documents", "mission-control"],
  },
  {
    id: "lender_pipeline",
    order: 7,
    phaseId: "loan_execution",
    name: "Lender Pipeline",
    objective: "Track each lender case independently across the loan file.",
    chanakyaMessage:
      "You are on Lender Pipeline. Each lender has its own status path — this board is the workflow source of truth.",
    matchWorkspaceIds: ["lender_pipeline", "loan_workspace"],
    matchSections: ["lenders"],
  },
  {
    id: "tasks",
    order: 8,
    phaseId: "loan_execution",
    name: "Tasks",
    objective: "Clear follow-ups that protect SLAs and customer experience.",
    chanakyaMessage:
      "You are in Loan Execution Tasks. Clear overdue commitments, then return to the loan file to continue.",
    matchWorkspaceIds: ["tasks"],
    matchSections: ["tasks"],
  },
  {
    id: "timeline",
    order: 9,
    phaseId: "loan_execution",
    name: "Timeline",
    objective: "Review chronological activity across the loan journey.",
    chanakyaMessage:
      "You are viewing Timeline. Use it to confirm what already happened before the next lender or approval step.",
    matchWorkspaceIds: ["loan_workspace", "dialogue"],
    matchSections: ["timeline"],
  },
  {
    id: "approval",
    order: 10,
    phaseId: "loan_execution",
    name: "Approval",
    objective: "Secure lender approval before disbursement begins.",
    chanakyaMessage:
      "You are approaching Approval. Confirm lender conditions are met before moving to disbursement.",
    matchSections: ["approval"],
  },
  {
    id: "disbursement",
    order: 11,
    phaseId: "post_disbursement",
    name: "Disbursement",
    objective: "Complete fund release carefully and record outcomes.",
    chanakyaMessage:
      "You are in Post Disbursement. Complete disbursement accurately — accounting follows clean release.",
    matchSections: ["disbursement"],
  },
  {
    id: "accounting",
    order: 12,
    phaseId: "post_disbursement",
    name: "Accounting",
    objective: "Record commercial and financial outcomes of the loan.",
    chanakyaMessage:
      "You are in Accounting. Close the commercial loop so reporting and revenue stay trustworthy.",
    matchSections: ["accounting"],
  },
  {
    id: "closure",
    order: 13,
    phaseId: "post_disbursement",
    name: "Closure",
    objective: "Close the transaction orderly after obligations are complete.",
    chanakyaMessage:
      "You are at Closure. Confirm all obligations are complete before marking the journey finished.",
    matchSections: ["closure"],
  },
];
