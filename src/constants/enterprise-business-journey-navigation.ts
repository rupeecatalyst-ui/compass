/**
 * Certified Enterprise Business Journey Navigation — frozen SSOT.
 * In-transaction Continue / Back never route through dashboards or Kanban.
 */

import { ROUTES } from "@/constants/routes";
import {
  buildJourneyHref,
  type LeadJourneyModuleId,
} from "@/constants/lead-opportunity-journey";

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
 * Tasks / Timeline are support modules — not workflow stages.
 */
export const BUSINESS_JOURNEY_NAV_SPINE: BusinessJourneyNavStep[] = [
  {
    id: "opportunity_setup",
    label: "Opportunity Workspace",
    href: ROUTES.CREDIT_BENCH,
    leadModuleId: "credit_bench",
  },
  {
    id: "strategic_workspace",
    label: "Strategic Workspace",
    href: ROUTES.OPPORTUNITY_WORKSPACE,
    leadModuleId: "strategic_workspace",
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
    id: "loan_workspace",
    label: "Loan Workspace",
    href: ROUTES.LOAN_FILES,
    tab: "overview",
    leadModuleId: "loan_workspace",
  },
  {
    id: "lender_pipeline",
    label: "Lender Pipeline",
    href: ROUTES.LOAN_FILES,
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
