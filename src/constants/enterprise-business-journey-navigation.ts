/**
 * Certified Enterprise Business Journey Navigation — frozen SSOT.
 * In-transaction Continue / Back never route through dashboards or Kanban.
 */

import { ROUTES } from "@/constants/routes";
import {
  buildJourneyHref,
  type LeadJourneyModuleId,
} from "@/constants/lead-opportunity-journey";
import { buildDealWorkspaceHref } from "@/lib/loan-journey/adr-018-routing";

/** Navigable spine used by workspace Continue / Back CTAs (certification order). */
export type BusinessJourneyNavId =
  | "opportunity_setup"
  | "strategic_workspace"
  | "document_center"
  | "credit_workbench"
  | "loan_workspace"
  | "lender_pipeline";

export interface BusinessJourneyNavStep {
  id: BusinessJourneyNavId;
  label: string;
  /** Base route (transaction params added via buildJourneyHref). */
  href: string;
  /** Optional loan-workspace tab deep link. */
  tab?: string;
  leadModuleId?: LeadJourneyModuleId;
}

/**
 * Certified business progression for primary CTA navigation.
 * Opportunity Workspace stages first (Creation → Docs → Credit → Strategy), then Loan execution.
 * Tasks / Timeline are support modules — not workflow stages.
 */
export const BUSINESS_JOURNEY_NAV_SPINE: BusinessJourneyNavStep[] = [
  {
    id: "opportunity_setup",
    label: "Opportunity Creation",
    href: ROUTES.CREDIT_BENCH,
    leadModuleId: "credit_bench",
  },
  {
    id: "document_center",
    label: "Document Center",
    href: ROUTES.DOCUMENT_CENTER,
    leadModuleId: "document_center",
  },
  {
    id: "credit_workbench",
    label: "Credit Workbench",
    href: ROUTES.CREDIT_WORKBENCH,
    leadModuleId: "credit_workbench",
  },
  {
    id: "strategic_workspace",
    label: "Strategy Workbench",
    href: ROUTES.OPPORTUNITY_WORKSPACE,
    leadModuleId: "strategic_workspace",
  },
  {
    id: "loan_workspace",
    label: "Deal Workspace",
    /** CO-UX-002 — Registry first; workspace via buildBusinessJourneyHref when Deal id known. */
    href: ROUTES.MY_DEALS,
    tab: "overview",
    leadModuleId: "loan_workspace",
  },
  {
    id: "lender_pipeline",
    label: "Lender Pipeline",
    href: ROUTES.MY_DEALS,
    tab: "lenders",
    leadModuleId: "loan_workspace",
  },
];

export function getBusinessJourneyNavStep(
  id: BusinessJourneyNavId,
): BusinessJourneyNavStep {
  return BUSINESS_JOURNEY_NAV_SPINE.find((s) => s.id === id)!;
}

export function getNextBusinessJourneyNavStep(
  id: BusinessJourneyNavId,
): BusinessJourneyNavStep | null {
  const idx = BUSINESS_JOURNEY_NAV_SPINE.findIndex((s) => s.id === id);
  if (idx < 0 || idx >= BUSINESS_JOURNEY_NAV_SPINE.length - 1) return null;
  return BUSINESS_JOURNEY_NAV_SPINE[idx + 1]!;
}

export function getPreviousBusinessJourneyNavStep(
  id: BusinessJourneyNavId,
): BusinessJourneyNavStep | null {
  const idx = BUSINESS_JOURNEY_NAV_SPINE.findIndex((s) => s.id === id);
  if (idx <= 0) return null;
  return BUSINESS_JOURNEY_NAV_SPINE[idx - 1]!;
}

export function leadModuleToBusinessJourneyNavId(
  moduleId: LeadJourneyModuleId,
): BusinessJourneyNavId {
  switch (moduleId) {
    case "credit_bench":
      return "opportunity_setup";
    case "strategic_workspace":
      return "strategic_workspace";
    case "document_center":
      return "document_center";
    case "credit_workbench":
      return "credit_workbench";
    case "loan_workspace":
      return "loan_workspace";
    default:
      return "strategic_workspace";
  }
}

/** Primary CTA copy — always forward arrow progression. */
export function getBusinessContinueLabel(next: BusinessJourneyNavStep): string {
  if (next.id === "lender_pipeline") return "Open Lender Pipeline";
  return `Continue to ${next.label}`;
}

export function getBusinessBackLabel(prev: BusinessJourneyNavStep): string {
  return `Back to ${prev.label}`;
}

export function buildBusinessJourneyHref(
  step: BusinessJourneyNavStep,
  context?: { fileId?: string | null; opportunityId?: string | null },
): string {
  // CO-UX-002 — Deal stages: workspace only when Deal id present; else Deal Registry.
  if (
    step.href === ROUTES.DEALS ||
    step.href === ROUTES.MY_DEALS ||
    step.id === "loan_workspace" ||
    step.id === "lender_pipeline"
  ) {
    return buildDealWorkspaceHref({
      fileId: context?.fileId,
      opportunityId: context?.opportunityId,
      tab: step.tab ?? "lenders",
    });
  }
  return buildJourneyHref(step.href, {
    fileId: context?.fileId,
    opportunityId: context?.opportunityId,
    tab: step.tab,
  });
}

/**
 * Loan Workspace intelligent continue:
 * overview / other → Lender Pipeline
 * lenders → stay on execution path (Lender Pipeline)
 * Tasks / Timeline are support modules — not Continue spine hops.
 */
export function resolveLoanWorkspaceContinue(input: {
  activeTab: string;
  hasActiveLenderCases: boolean;
}): { navId: BusinessJourneyNavId; label: string } {
  if (input.activeTab === "lenders") {
    return {
      navId: "lender_pipeline",
      label: input.hasActiveLenderCases
        ? "Continue Execution"
        : "Open Lender Pipeline",
    };
  }
  return { navId: "lender_pipeline", label: "Open Lender Pipeline" };
}
