/**
 * Loan Workspace — operational hub navigator (Architecture Freeze).
 * Landing selects a bench; it is not an analytics dashboard.
 */

import { ROUTES } from "@/constants/routes";
import { buildDashboardHref } from "@/lib/lead-opportunity-journey/active-context";

export const LOAN_WORKSPACE_HUB_OFFICIAL_NAME = "Loan Workspace";

export const LOAN_WORKSPACE_HUB_STATUS_LINE =
  "Select the operational workspace for this opportunity. Complete work, then Save & Return to My Deals.";

/** Query flag: show execution book (Kanban / List / Timeline / Tasks). */
export const LOAN_WORKSPACE_BROWSE_PARAM = "browse";

/** Query flag: keep opportunity context but show hub (do not auto-open execution modal). */
export const LOAN_WORKSPACE_SURFACE_PARAM = "surface";
export const LOAN_WORKSPACE_SURFACE_HUB = "hub";

export type LoanWorkspaceHubCardId =
  | "strategic_bench"
  | "credit_bench"
  | "loan_workspace"
  | "documents";

export interface LoanWorkspaceHubCard {
  id: LoanWorkspaceHubCardId;
  label: string;
  description: string;
  href: string;
  accentClass: string;
  iconTone: string;
}

export const LOAN_WORKSPACE_HUB_CARDS: LoanWorkspaceHubCard[] = [
  {
    id: "strategic_bench",
    label: "Strategic Bench",
    description: "Strategy, competition, and funding plan for the opportunity.",
    href: buildDashboardHref(ROUTES.OPPORTUNITY_WORKSPACE),
    accentClass: "border-violet-500/35 hover:border-violet-500/55 hover:bg-violet-500/[0.06]",
    iconTone: "bg-violet-500/15 text-violet-800 dark:text-violet-200",
  },
  {
    id: "credit_bench",
    label: "Credit Bench",
    description: "Opportunity setup, credit framing, and case progression.",
    href: buildDashboardHref(ROUTES.CREDIT_BENCH),
    accentClass: "border-sky-500/35 hover:border-sky-500/55 hover:bg-sky-500/[0.06]",
    iconTone: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
  },
  {
    id: "loan_workspace",
    label: "Loan Workspace",
    description: "Execute the loan file — lenders, pipeline, and case work.",
    href: `${ROUTES.LOAN_FILES}?${LOAN_WORKSPACE_BROWSE_PARAM}=1`,
    accentClass: "border-emerald-500/35 hover:border-emerald-500/55 hover:bg-emerald-500/[0.06]",
    iconTone: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  },
  {
    id: "documents",
    label: "Documents",
    description: "Document Center for collection, gaps, and readiness gates.",
    href: buildDashboardHref(ROUTES.DOCUMENT_CENTER),
    accentClass: "border-amber-500/35 hover:border-amber-500/55 hover:bg-amber-500/[0.06]",
    iconTone: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
  },
];
