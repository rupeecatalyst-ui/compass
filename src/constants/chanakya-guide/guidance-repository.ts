/**
 * Enterprise Guide Repository — Chanakya Guide knowledge SSOT (Phase 1).
 *
 * Evolve guidance here. UI components only render resolved entries.
 * Do not embed mentor copy in workspace components.
 *
 * Schema foundation for Enterprise Success Coach (Phase 2).
 */

import type {
  ChanakyaGuideEntry,
  ChanakyaGuideWorkspaceMeta,
  ChanakyaTourStep,
} from "@/types/chanakya-guide";

/** Workspace-level labels / purpose (not per-card copy). */
export const CHANAKYA_GUIDE_WORKSPACE_META: ChanakyaGuideWorkspaceMeta[] = [
  {
    platform: "catalyst_one",
    workspaceId: "strategic_workspace",
    workspaceLabel: "Strategic Workspace",
    pagePurpose:
      "Plan the opportunity, shape funding strategy, and qualify the case before loan execution.",
  },
  {
    platform: "catalyst_one",
    workspaceId: "loan_workspace",
    workspaceLabel: "Loan Workspace",
    pagePurpose:
      "Execute the loan file — lenders, documents, tasks, and timeline — without leaving the transaction.",
  },
  {
    platform: "catalyst_one",
    workspaceId: "lender_pipeline",
    workspaceLabel: "Lender Pipeline",
    pagePurpose:
      "Track each lender case’s independent workflow status for this loan file.",
  },
  {
    platform: "catalyst_one",
    workspaceId: "credit_workbench",
    workspaceLabel: "Credit Workbench",
    pagePurpose: "Verify stated information against documents before proposal readiness.",
  },
  {
    platform: "catalyst_one",
    workspaceId: "document_center",
    workspaceLabel: "Document Center",
    pagePurpose:
      "Collect the document checklist for the active opportunity before LIFE and loan execution.",
  },
  {
    platform: "catalyst_one",
    workspaceId: "opportunity_setup",
    workspaceLabel: "Opportunity Setup",
    pagePurpose: "Capture and reuse customer, loan, and financial profile for the opportunity.",
  },
  {
    platform: "catalyst_one",
    workspaceId: "dialogue",
    workspaceLabel: "Dialogue",
    pagePurpose: "Review enterprise dialogue and activity for ongoing conversations.",
  },
  {
    platform: "catalyst_one",
    workspaceId: "tasks",
    workspaceLabel: "Tasks",
    pagePurpose: "Manage follow-ups and operational tasks across the book.",
  },
];

/**
 * Flat Guide Repository — each row is one mentor guidance unit.
 * Filter by platform + workspace + section at resolve time.
 */
export const CHANAKYA_GUIDE_REPOSITORY: ChanakyaGuideEntry[] = [
  {
    id: "c1-sw-default-plan",
    platform: "catalyst_one",
    workspaceId: "strategic_workspace",
    section: "default",
    guidanceTitle: "Why you are here",
    mentorMessage:
      "Build a clear opportunity plan — customer, requirement, competition, and LIFE — before execution begins.",
    detailedGuidance:
      "Strategic Workspace is the thinking surface for the case. Capture relationships, competition, and funding strategy here so Loan Workspace can focus on execution.",
    bestPractice:
      "Confirm customer identity and requirement early. Do not jump to Loan Workspace until LIFE and document readiness support progression.",
    recommendedNextStep:
      "Confirm customer and requirement, then move to LIFE once documents support progression.",
    relatedWorkflow: "Lead → Opportunity journey",
    relatedRegistry: "Enterprise Contact Master · Opportunity context",
    relatedEnterpriseEngine: "LIFE (Lender Intelligence)",
    sortOrder: 10,
  },
  {
    id: "c1-sw-overview",
    platform: "catalyst_one",
    workspaceId: "strategic_workspace",
    section: "overview",
    guidanceTitle: "Overview as command centre",
    mentorMessage:
      "Use Overview to see readiness across planning tabs before diving into detail.",
    detailedGuidance:
      "Overview summarises what still needs structure. Prefer completing weak areas via the strategic nav rather than treating Overview as a data-entry form.",
    bestPractice: "Resolve red or amber planning gaps before advancing the journey.",
    recommendedNextStep: "Open the highest-priority planning tab flagged in Overview.",
    relatedWorkflow: "Strategic planning",
    relatedRegistry: "Opportunity Workspace tabs",
    relatedEnterpriseEngine: "Opportunity Intelligence (presentation)",
    sortOrder: 20,
  },
  {
    id: "c1-sw-funding",
    platform: "catalyst_one",
    workspaceId: "strategic_workspace",
    section: "funding_strategy",
    guidanceTitle: "LIFE selection",
    mentorMessage:
      "Assign a funding strategy deliberately — LIFE selection anchors later lender execution.",
    detailedGuidance:
      "LIFE finalisation marks the shift from lead framing toward opportunity execution. Document gates may still apply before Loan Workspace.",
    bestPractice: "Do not finalise LIFE without a credible document pack trajectory.",
    recommendedNextStep: "Review LIFE options and assign when the case is document-ready.",
    relatedWorkflow: "LIFE assignment → Loan Workspace",
    relatedRegistry: "Enterprise Lender Workspace / LIFE catalog",
    relatedEnterpriseEngine: "LIFE",
    sortOrder: 30,
  },
  {
    id: "c1-sw-next",
    platform: "catalyst_one",
    workspaceId: "strategic_workspace",
    section: "default",
    guidanceTitle: "What happens next",
    mentorMessage:
      "After LIFE and document readiness, enter Loan Workspace for lender cases and execution.",
    detailedGuidance:
      "Context is preserved across related workspaces. Prefer Action Center for Credit Workbench or Loan Workspace instead of returning to dashboards mid-journey.",
    bestPractice:
      "Stay inside the active transaction until you intentionally open a module from main navigation.",
    recommendedNextStep:
      "Use Action Center for Credit Workbench or Loan Workspace when the plan is ready.",
    relatedWorkflow: "Strategic Workspace → Loan Workspace",
    relatedRegistry: "Active Opportunity Context",
    relatedEnterpriseEngine: "Action Center · Context Workspaces",
    sortOrder: 40,
  },
  {
    id: "c1-lw-hero",
    platform: "catalyst_one",
    workspaceId: "loan_workspace",
    section: "default",
    guidanceTitle: "Workspace first",
    mentorMessage: "This is your execution surface for the active loan file.",
    detailedGuidance:
      "A loan file can have multiple lender cases. Lender Pipeline is the source of truth for login, credit, PD, legal, pricing, approval, and disbursement status — not a single file-level stage.",
    bestPractice: "Keep routine actions in Action Center so you never leave this transaction.",
    recommendedNextStep: "Open Lender Pipeline to manage each lender case independently.",
    relatedWorkflow: "Loan execution",
    relatedRegistry: "Loan File · Lender Case",
    relatedEnterpriseEngine: "Lender Pipeline",
    sortOrder: 10,
  },
  {
    id: "c1-lw-overview",
    platform: "catalyst_one",
    workspaceId: "loan_workspace",
    section: "overview",
    guidanceTitle: "Loan file facts",
    mentorMessage:
      "Confirm product, amount, participants, and property facts that lenders will rely on.",
    detailedGuidance:
      "Overview holds shared loan identity. Per-lender workflow status lives on the Lender Pipeline tab.",
    bestPractice: "Correct identity and amount errors here before escalating lender cases.",
    recommendedNextStep: "Review participants and required amount, then open Lender Pipeline.",
    relatedWorkflow: "Loan origination / execution",
    relatedRegistry: "Loan participants · Product library",
    relatedEnterpriseEngine: "Loan Workspace",
    sortOrder: 20,
  },
  {
    id: "c1-lw-actions",
    platform: "catalyst_one",
    workspaceId: "loan_workspace",
    section: "default",
    guidanceTitle: "Action Center",
    mentorMessage: "Send email, WhatsApp, or upload documents without leaving this screen.",
    detailedGuidance:
      "Context Workspaces slide over this page and close when done. Messages enter the Enterprise Outbox before dispatch.",
    bestPractice:
      "Prefer Action Center over navigating to separate communication modules mid-case.",
    recommendedNextStep: "Open Action Center for communication or document collection.",
    relatedWorkflow: "Enterprise Outbox communication",
    relatedRegistry: "Communication Template Registry · Relationship participants",
    relatedEnterpriseEngine: "Action Center · ENCE (simulation)",
    sortOrder: 30,
  },
  {
    id: "c1-lp-ssot",
    platform: "catalyst_one",
    workspaceId: "lender_pipeline",
    section: "default",
    guidanceTitle: "One file, many lenders",
    mentorMessage:
      "Each lender case has its own login, credit, PD, legal, pricing, approval, and disbursement status.",
    detailedGuidance:
      "Do not look for a single Current Stage for the whole loan file. The pipeline board is the workflow SSOT.",
    bestPractice:
      "Update statuses on the active lender case; add cases when exploring parallel lenders.",
    recommendedNextStep: "Update the active lender case statuses and add cases as needed.",
    relatedWorkflow: "Multi-lender race / pipeline",
    relatedRegistry: "Lender Case registry",
    relatedEnterpriseEngine: "Lender Pipeline",
    sortOrder: 10,
  },
  {
    id: "c1-lp-lenders-tab",
    platform: "catalyst_one",
    workspaceId: "lender_pipeline",
    section: "lenders",
    guidanceTitle: "Pipeline board",
    mentorMessage: "Treat each card as an independent lender journey on this loan file.",
    detailedGuidance:
      "Parallel lenders are normal. Progress one case without inventing a fake roll-up stage for the file.",
    bestPractice: "Keep notes and status changes on the correct lender case.",
    recommendedNextStep: "Select a lender case and advance the next real status.",
    relatedWorkflow: "Lender case progression",
    relatedRegistry: "Lender Case",
    relatedEnterpriseEngine: "Lender Pipeline",
    sortOrder: 20,
  },
  {
    id: "c1-cw-verify",
    platform: "catalyst_one",
    workspaceId: "credit_workbench",
    section: "default",
    guidanceTitle: "Verification desk",
    mentorMessage: "Review documents and stated financials for this opportunity.",
    detailedGuidance:
      "Collection happens in Document Center. Credit Workbench is for verification and readiness — not primary upload.",
    bestPractice: "Flag mismatches between stated information and documents before proposal.",
    recommendedNextStep:
      "Confirm key documents, then continue the journey when readiness looks sound.",
    relatedWorkflow: "Document verify → Strategic / Loan",
    relatedRegistry: "Enterprise Document Intelligence (EDIE)",
    relatedEnterpriseEngine: "Credit Workbench · Chanakya readiness (presentation)",
    sortOrder: 10,
  },
  {
    id: "c1-dc-collect",
    platform: "catalyst_one",
    workspaceId: "document_center",
    section: "default",
    guidanceTitle: "Collect before you progress",
    mentorMessage: "Upload and track required documents for this transaction.",
    detailedGuidance:
      "Document rules come from enterprise configuration. Prefer completing the checklist here rather than scattering uploads across modules.",
    bestPractice: "Clear critical missing items before LIFE finalisation or Loan Workspace entry.",
    recommendedNextStep: "Mark received items and request anything still missing.",
    relatedWorkflow: "Document completion gates",
    relatedRegistry: "EDIE document rules · Document checklist",
    relatedEnterpriseEngine: "Document Center · EDIE",
    sortOrder: 10,
  },
  {
    id: "c1-os-profile",
    platform: "catalyst_one",
    workspaceId: "opportunity_setup",
    section: "default",
    guidanceTitle: "Start with accurate profile",
    mentorMessage: "Capture complete customer and loan information before moving ahead.",
    detailedGuidance:
      "Reuse existing business profile where available. Avoid re-typing known facts — consistency across the journey matters.",
    bestPractice:
      "Accurate information improves lender matching and reduces unnecessary follow-ups.",
    recommendedNextStep: "Complete customer and loan details, then continue to Document Center.",
    relatedWorkflow: "Opportunity Setup → Document Center",
    relatedRegistry: "Enterprise Contact Master · Stated draft",
    relatedEnterpriseEngine: "Opportunity Setup (Credit Bench)",
    sortOrder: 10,
  },
  {
    id: "c1-dg-purpose",
    platform: "catalyst_one",
    workspaceId: "dialogue",
    section: "default",
    guidanceTitle: "Conversation history",
    mentorMessage: "See dialogue related to business activity in one place.",
    detailedGuidance:
      "For transaction-bound communication, prefer Action Center inside the loan or opportunity workspace so context stays attached.",
    bestPractice: "Use Dialogue to inform; execute in the related transaction workspace.",
    recommendedNextStep:
      "Open an active transaction when you need to act — Dialogue informs; workspaces execute.",
    relatedWorkflow: "Enterprise dialogue timeline",
    relatedRegistry: "Enterprise Dialogue Center (EDC)",
    relatedEnterpriseEngine: "EDC",
    sortOrder: 10,
  },
  {
    id: "c1-tk-purpose",
    platform: "catalyst_one",
    workspaceId: "tasks",
    section: "default",
    guidanceTitle: "Stay on commitments",
    mentorMessage: "Track what needs attention without losing the bigger journey.",
    detailedGuidance:
      "When a task belongs to a loan file, open that Loan Workspace so Action Center and Lender Pipeline stay available.",
    bestPractice: "Clear overdue items first; then return to the related transaction.",
    recommendedNextStep:
      "Clear overdue items, then return to the related loan or opportunity workspace.",
    relatedWorkflow: "Task follow-up",
    relatedRegistry: "Enterprise Task Engine (ETE)",
    relatedEnterpriseEngine: "ETE",
    sortOrder: 10,
  },
];

/** First-time guided tour — system introduction (Phase 1). */
export const CHANAKYA_GUIDE_TOUR_STEPS: ChanakyaTourStep[] = [
  {
    id: "tour-nav",
    title: "Navigation",
    body: "Left navigation opens module dashboards. Inside a transaction, related workspaces keep the same Opportunity or Loan File.",
  },
  {
    id: "tour-workspace",
    title: "Workspace philosophy",
    body: "The workspace is the hero. Headers stay light; Action Center and Context Workspaces handle routine actions without leaving the page.",
    relatedWorkspaceId: "loan_workspace",
  },
  {
    id: "tour-journey",
    title: "Loan Journey",
    body: "Opportunity Setup → Documents → Credit Workbench → Strategic Workspace → Loan Workspace. Context travels with you.",
  },
  {
    id: "tour-action-center",
    title: "Action Center",
    body: "One header button for email, WhatsApp, documents, and navigation. Actions open temporary slide-over workspaces.",
    relatedWorkspaceId: "loan_workspace",
  },
  {
    id: "tour-documents",
    title: "Documents",
    body: "Collect the checklist in Document Center. Verify in Credit Workbench. Upload in context from Action Center when you are on a loan.",
    relatedWorkspaceId: "document_center",
  },
  {
    id: "tour-communication",
    title: "Communication",
    body: "Recipients and templates are context-aware. Messages enter the Enterprise Outbox before send — review, then dispatch.",
  },
  {
    id: "tour-pipeline",
    title: "Lender Pipeline",
    body: "Each lender case has its own status path. The pipeline board is the workflow source of truth — not a single file stage.",
    relatedWorkspaceId: "lender_pipeline",
  },
  {
    id: "tour-credit",
    title: "Credit Workbench",
    body: "Verify stated facts against documents here. When readiness looks solid, continue the guided journey.",
    relatedWorkspaceId: "credit_workbench",
  },
];

/** @deprecated Prefer CHANAKYA_GUIDE_REPOSITORY + CHANAKYA_GUIDE_WORKSPACE_META. */
export const CHANAKYA_GUIDE_PAGES = CHANAKYA_GUIDE_WORKSPACE_META.map((meta) => ({
  ...meta,
  cards: CHANAKYA_GUIDE_REPOSITORY.filter(
    (e) => e.workspaceId === meta.workspaceId && e.platform === meta.platform,
  ),
}));
