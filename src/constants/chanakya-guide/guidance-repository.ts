/**
 * Chanakya Guide Phase 1 — configurable guidance repository.
 * Content changes should land here (or future config SSOT), not in UI components.
 */

import type {
  ChanakyaGuidePageDef,
  ChanakyaTourStep,
} from "@/types/chanakya-guide";

export const CHANAKYA_GUIDE_PAGES: ChanakyaGuidePageDef[] = [
  {
    workspaceId: "strategic_workspace",
    platform: "catalyst_one",
    workspaceLabel: "Strategic Workspace",
    pagePurpose: "Plan the opportunity, shape funding strategy, and qualify the case before loan execution.",
    cards: [
      {
        id: "sw-purpose",
        title: "Why you are here",
        purpose: "Build a clear opportunity plan — customer, requirement, competition, and LIFE — before execution begins.",
        businessValue: "Strong planning reduces lender rejections and avoids rework later in the loan file.",
        recommendedNextStep: "Confirm customer and requirement, then move to LIFE once documents support progression.",
        learnMore:
          "Strategic Workspace is the thinking surface for the case. Capture relationships, competition, and funding strategy here so Loan Workspace can focus on execution.",
        moduleIds: ["overview", "customer", "requirement", "funding_strategy"],
      },
      {
        id: "sw-next",
        title: "What happens next",
        purpose: "After LIFE and document readiness, enter Loan Workspace for lender cases and execution.",
        businessValue: "Context is preserved — you continue the same opportunity without searching again.",
        recommendedNextStep: "Use Action Center for Credit Workbench or Loan Workspace when the plan is ready.",
        learnMore:
          "Action Center keeps routine moves in context. Prefer it over leaving for a dashboard mid-journey.",
      },
    ],
  },
  {
    workspaceId: "loan_workspace",
    platform: "catalyst_one",
    workspaceLabel: "Loan Workspace",
    pagePurpose: "Execute the loan file — lenders, documents, tasks, and timeline — without leaving the transaction.",
    cards: [
      {
        id: "lw-hero",
        title: "Workspace first",
        purpose: "This is your execution surface for the active loan file.",
        businessValue: "Keeping work here preserves context and speeds lender progression.",
        recommendedNextStep: "Open Lender Pipeline to manage each lender case independently.",
        learnMore:
          "A loan file can have multiple lender cases. Lender Pipeline is the source of truth for login, credit, PD, legal, pricing, approval, and disbursement status.",
        moduleIds: ["overview", "lenders", "mission-control"],
      },
      {
        id: "lw-actions",
        title: "Action Center",
        purpose: "Send email, WhatsApp, or upload documents without leaving this screen.",
        businessValue: "Routine actions stay in context and enter the Enterprise Outbox before dispatch.",
        recommendedNextStep: "Open Action Center for communication or document collection.",
        learnMore:
          "Context Workspaces slide over this page and close when done. Prefer them over navigating to separate modules.",
      },
    ],
  },
  {
    workspaceId: "lender_pipeline",
    platform: "catalyst_one",
    workspaceLabel: "Lender Pipeline",
    pagePurpose: "Track each lender case’s independent workflow status for this loan file.",
    cards: [
      {
        id: "lp-ssot",
        title: "One file, many lenders",
        purpose: "Each lender case has its own login, credit, PD, legal, pricing, approval, and disbursement status.",
        businessValue: "Accurate per-lender tracking prevents false “file stage” assumptions.",
        recommendedNextStep: "Update the active lender case statuses and add cases as needed.",
        learnMore:
          "Do not look for a single Current Stage for the whole loan file. The pipeline board is the workflow SSOT.",
        moduleIds: ["lenders"],
      },
    ],
  },
  {
    workspaceId: "credit_workbench",
    platform: "catalyst_one",
    workspaceLabel: "Credit Workbench",
    pagePurpose: "Verify stated information against documents before proposal readiness.",
    cards: [
      {
        id: "cw-verify",
        title: "Verification desk",
        purpose: "Review documents and stated financials for this opportunity.",
        businessValue: "Clean verification improves proposal quality and lender confidence.",
        recommendedNextStep: "Confirm key documents, then continue the journey when readiness looks sound.",
        learnMore:
          "Collection happens in Document Center. Credit Workbench is for verification and readiness — not primary upload.",
      },
    ],
  },
  {
    workspaceId: "document_center",
    platform: "catalyst_one",
    workspaceLabel: "Document Center",
    pagePurpose: "Collect the document checklist for the active opportunity before LIFE and loan execution.",
    cards: [
      {
        id: "dc-collect",
        title: "Collect before you progress",
        purpose: "Upload and track required documents for this transaction.",
        businessValue: "Complete packs reduce follow-ups and unlock LIFE / Loan progression gates.",
        recommendedNextStep: "Mark received items and request anything still missing.",
        learnMore:
          "Document rules come from enterprise configuration. Prefer completing the checklist here rather than scattering uploads across modules.",
      },
    ],
  },
  {
    workspaceId: "opportunity_setup",
    platform: "catalyst_one",
    workspaceLabel: "Opportunity Setup",
    pagePurpose: "Capture and reuse customer, loan, and financial profile for the opportunity.",
    cards: [
      {
        id: "os-profile",
        title: "Start with accurate profile",
        purpose: "Capture complete customer and loan information before moving ahead.",
        businessValue: "Accurate information improves lender matching and reduces unnecessary follow-ups.",
        recommendedNextStep: "Complete customer and loan details, then continue to Document Center.",
        learnMore:
          "Reuse existing business profile where available. Avoid re-typing known facts — consistency across the journey matters.",
      },
    ],
  },
  {
    workspaceId: "dialogue",
    platform: "catalyst_one",
    workspaceLabel: "Dialogue",
    pagePurpose: "Review enterprise dialogue and activity for ongoing conversations.",
    cards: [
      {
        id: "dg-purpose",
        title: "Conversation history",
        purpose: "See dialogue related to business activity in one place.",
        businessValue: "Shared visibility reduces dropped follow-ups between teams.",
        recommendedNextStep: "Open an active transaction when you need to act — Dialogue informs; workspaces execute.",
        learnMore:
          "For transaction-bound communication, prefer Action Center inside the loan or opportunity workspace so context stays attached.",
      },
    ],
  },
  {
    workspaceId: "tasks",
    platform: "catalyst_one",
    workspaceLabel: "Tasks",
    pagePurpose: "Manage follow-ups and operational tasks across the book.",
    cards: [
      {
        id: "tk-purpose",
        title: "Stay on commitments",
        purpose: "Track what needs attention without losing the bigger journey.",
        businessValue: "Timely tasks protect SLAs and customer experience.",
        recommendedNextStep: "Clear overdue items, then return to the related loan or opportunity workspace.",
        learnMore:
          "When a task belongs to a loan file, open that Loan Workspace so Action Center and Lender Pipeline stay available.",
      },
    ],
  },
];

/** First-time guided tour — system introduction only (Phase 1). */
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
