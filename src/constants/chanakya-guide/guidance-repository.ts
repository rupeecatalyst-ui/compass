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
      "Execute the Loan Workspace — lenders, documents, tasks, and timeline — without leaving the transaction.",
  },
  {
    platform: "catalyst_one",
    workspaceId: "lender_pipeline",
    workspaceLabel: "Lender Pipeline",
    pagePurpose:
      "Track each lender case’s independent workflow status for this Deal.",
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
  {
    platform: "catalyst_one",
    workspaceId: "enterprise_decision_ledger",
    workspaceLabel: "Enterprise Decision Ledger",
    pagePurpose:
      "Browse permanent enterprise decisions — configuration and commercial history that must never be rewritten.",
  },
  {
    platform: "catalyst_one",
    workspaceId: "execution_hub",
    workspaceLabel: "Execution Hub",
    pagePurpose:
      "Enter the continuous loan journey — one transaction, sequenced workspaces, Chanakya as your executive guide.",
  },
];

/**
 * Flat Guide Repository — each row is one mentor guidance unit.
 * Filter by platform + workspace + section at resolve time.
 */
export const CHANAKYA_GUIDE_REPOSITORY: ChanakyaGuideEntry[] = [
  {
    id: "c1-eh-welcome",
    platform: "catalyst_one",
    workspaceId: "execution_hub",
    section: "default",
    guidanceTitle: "Welcome to the Loan Journey",
    mentorMessage:
      "You are at the Execution Hub — the doorway to one continuous loan journey, not a menu of unrelated modules.",
    detailedGuidance:
      "Progress left to right: Lead Creation → Documents → Credit Bench → LIFE → Lender Pipeline → Disbursed → Journey Complete. See the full roadmap at a glance — no scrolling required.",
    bestPractice:
      "Stay on the journey path. Prefer Continue into the next workspace over returning to dashboards mid-case.",
    recommendedNextStep:
      "Open Lead Creation to capture the Opportunity from a Contact or Company, then advance when ready.",
    relatedWorkflow: "Lead Creation → Documents",
    relatedEnterpriseEngine: "Chanakya Guide",
    sortOrder: 10,
  },
  {
    id: "c1-eh-next-action",
    platform: "catalyst_one",
    workspaceId: "execution_hub",
    section: "default",
    guidanceTitle: "Next recommended action",
    mentorMessage:
      "Begin with Lead Creation so product, amount, and customer framing stay consistent across every later desk.",
    detailedGuidance:
      "Documents and Credit Bench become productive only after the loan story is clear. LIFE and Lender Pipeline then execute against that story — until Disbursed and Journey Complete.",
    bestPractice: "Complete framing before collecting documents whenever practical.",
    recommendedNextStep: "Select Lead Creation on the roadmap, or use Continue Journey.",
    relatedWorkflow: "Lead Creation → Documents",
    sortOrder: 20,
  },
  {
    id: "c1-eh-progress",
    platform: "catalyst_one",
    workspaceId: "execution_hub",
    section: "default",
    guidanceTitle: "Journey progress",
    mentorMessage:
      "The rail shows where you are, what is ahead, and which workspace to open next — one loan, one path.",
    detailedGuidance:
      "Current steps glow. Pending steps wait quietly. Completed and locked states are ready for future readiness wiring without changing this hub’s navigation.",
    bestPractice: "Use the rail as your compass; use Chanakya for why and what next.",
    recommendedNextStep: "Follow the highlighted step, then return here whenever you need orientation.",
    relatedWorkflow: "Execution Hub navigation",
    sortOrder: 30,
  },
  {
    id: "c1-eh-best-practice",
    platform: "catalyst_one",
    workspaceId: "execution_hub",
    section: "default",
    guidanceTitle: "Best practice",
    mentorMessage:
      "Treat every hop as the same transaction. Context should travel with you — never restart from a blank dashboard when Continue is available.",
    detailedGuidance:
      "Document gaps and credit verification inform readiness; they guide — they do not replace your judgment on when to advance.",
    bestPractice:
      "When unsure, open Chanakya’s recommended next step rather than skipping ahead to Lender Pipeline.",
    recommendedNextStep: "Advance one stage at a time unless the case is already mid-execution.",
    relatedWorkflow: "Guided loan progression",
    sortOrder: 40,
  },
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
    mentorMessage: "This is your execution surface for the active Deal.",
    detailedGuidance:
      "A Deal can have multiple lender cases. Lender Pipeline is the source of truth for login, credit, PD, legal, pricing, approval, and disbursement status — not a single transaction-level stage.",
    bestPractice: "Keep routine actions in Action Center so you never leave this transaction.",
    recommendedNextStep: "Open Lender Pipeline to manage each lender case independently.",
    relatedWorkflow: "Loan execution",
    relatedRegistry: "Deal · Lender Case",
    relatedEnterpriseEngine: "Lender Pipeline",
    sortOrder: 10,
  },
  {
    id: "c1-lw-overview",
    platform: "catalyst_one",
    workspaceId: "loan_workspace",
    section: "overview",
    guidanceTitle: "Deal facts",
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
    id: "c1-lw-invoice-party",
    platform: "catalyst_one",
    workspaceId: "loan_workspace",
    section: "overview",
    guidanceTitle: "Invoice Party",
    mentorMessage:
      "This Deal does not have an Invoice Party assigned. Please select an Invoice Party from the Accounting Master before proceeding.",
    detailedGuidance:
      "Invoice Party identifies the organization against whom Rupee Catalyst raises its commission invoice for this Deal — often a lender, DSA, or channel partner. It is not the loan disbursement beneficiary. Choose only from Accounting → Invoice Party Master; Contact Registry is not used for this Deal field.",
    bestPractice:
      "Ask Accounting to add missing Invoice Parties to the Master before Login progression.",
    recommendedNextStep:
      "Select an Accounting Invoice Party Master record on the Deal before moving past the configured stage.",
    relatedWorkflow: "Logged In → Soft Approval",
    relatedRegistry: "Accounting Invoice Party Master · Enterprise Contact Registry (link only)",
    relatedEnterpriseEngine: "Deal Registry · Accounting",
    sortOrder: 25,
  },
  {
    id: "c1-lw-edit-deal",
    platform: "catalyst_one",
    workspaceId: "loan_workspace",
    section: "default",
    guidanceTitle: "Edit Deal",
    mentorMessage:
      "Use Edit Deal to change Lender, Lender Program, amount, ROI, tenure, Invoice Party, or internal remarks — changes are auditable.",
    detailedGuidance:
      "Lender search is filtered by the Deal product from the Product Library. After selecting a Lender, only programs belonging to that Lender appear. Changing Lender clears an invalid Program so combinations stay valid. Invoice Party remains Master-only from Accounting.",
    bestPractice:
      "Record an optional reason when changing Lender or Program so Deal history explains commercial context.",
    recommendedNextStep:
      "Open Edit Deal from the workspace header, confirm Lender + Program + Invoice Party, then save.",
    relatedWorkflow: "Deal Workspace · Lender Pipeline",
    relatedRegistry: "Enterprise Lender Registry · Lender Programs · Product Library · Invoice Party Master",
    relatedEnterpriseEngine: "Deal Registry",
    sortOrder: 26,
  },
  {
    id: "c1-lw-lender-program",
    platform: "catalyst_one",
    workspaceId: "loan_workspace",
    section: "lenders",
    guidanceTitle: "Lender and Program selection",
    mentorMessage:
      "Identify Additional Lender is a registry lookup — pick any active lender not already on this Opportunity, then choose a Program.",
    detailedGuidance:
      "Identify Lender browses the Enterprise Lender Registry (search by name/code). Product eligibility, recommendation, and policy engines do not filter this list. Only lenders already attached to the Opportunity are excluded. After selecting a lender, choose one of that lender’s programs, then save.",
    bestPractice:
      "Search by lender name (e.g. Bank of Baroda). Confirm Program after switching Lender. Do not expect product-based filtering on this dialog.",
    recommendedNextStep:
      "Identify Lender → select Program → assign Invoice Party → continue pipeline stages.",
    relatedWorkflow: "Identify Lender → Logged In",
    relatedRegistry: "Enterprise Lender Registry",
    relatedEnterpriseEngine: "Lender Pipeline · Deal Registry",
    sortOrder: 27,
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
    guidanceTitle: "One Deal, many lenders",
    mentorMessage:
      "Each lender case has its own login, credit, PD, legal, pricing, approval, and disbursement status.",
    detailedGuidance:
      "Do not look for a single Current Stage for the whole Deal. The pipeline board is the workflow SSOT.",
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
    mentorMessage: "Treat each card as an independent lender journey on this Deal.",
    detailedGuidance:
      "Parallel lenders are normal. Progress one case without inventing a fake roll-up stage for the Deal.",
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
      "When a task belongs to a Deal, open that Loan Workspace so Action Center and Lender Pipeline stay available.",
    bestPractice: "Clear overdue items first; then return to the related transaction.",
    recommendedNextStep:
      "Clear overdue items, then return to the related loan or opportunity workspace.",
    relatedWorkflow: "Task follow-up",
    relatedRegistry: "Enterprise Task Engine (ETE)",
    relatedEnterpriseEngine: "ETE",
    sortOrder: 10,
  },
  {
    id: "c1-edl-purpose",
    platform: "catalyst_one",
    workspaceId: "enterprise_decision_ledger",
    section: "default",
    guidanceTitle: "Constitutional memory",
    mentorMessage:
      "Every important enterprise decision leaves a permanent, time-stamped record here. Chanakya explains this history — Chanakya never invents it.",
    detailedGuidance:
      "Use the Enterprise Decision Ledger to answer what changed, who requested and approved it, why it changed, when it became effective, and which transactions stay on prior versions. Commercial agreements are versioned; historical calculations remain historically correct.",
    bestPractice:
      "When explaining commission or policy on a transaction, cite the EDL version effective on the transaction creation date.",
    recommendedNextStep:
      "Open a ledger entry and confirm Requested By, Approved By, Justification, and Effective From before advising stakeholders.",
    relatedWorkflow: "Enterprise governance",
    relatedRegistry: "Enterprise Decision Ledger (EDL)",
    relatedEnterpriseEngine: "EDL · Enterprise Decision Ledger",
    sortOrder: 10,
  },
  {
    id: "c1-lw-progressive-contact",
    platform: "catalyst_one",
    workspaceId: "loan_workspace",
    section: "participants",
    guidanceTitle: "Progressive Contact Creation",
    mentorMessage:
      "Never leave the Loan Journey to create a missing Contact. Search first — if none match, create a Provisional Contact inline and continue.",
    detailedGuidance:
      "Primary Applicant needs Full Name and Mobile. Co-applicants, guarantors, and other participants need Full Name only. Provisional Contacts remain fully usable. Chanakya will remind you about Mobile, PAN, Email, Address, and KYC — without blocking navigation.",
    bestPractice:
      "Create minimum viable Contacts, keep moving, and complete supporting fields before lender-critical stages.",
    recommendedNextStep:
      "If search finds no match, choose Create New Contact under the search field and Save & Continue to auto-link.",
    relatedWorkflow: "Loan Journey · Participants",
    relatedRegistry: "Enterprise Contact Master (ECM)",
    relatedEnterpriseEngine: "ECM · Progressive Contact Creation",
    sortOrder: 25,
  },
];

/** First-time guided tour — system introduction (Phase 1). */
export const CHANAKYA_GUIDE_TOUR_STEPS: ChanakyaTourStep[] = [
  {
    id: "tour-nav",
    title: "Navigation",
    body: "Left navigation opens module dashboards. Inside a transaction, related workspaces keep the same Opportunity or Deal.",
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
