/**
 * Global CHANAKYA Assistant — resolve page context automatically.
 * Users never pick the advisor role; pathname + active opportunity drive it.
 */

import type { ChanakyaGuideContext, ChanakyaGuideWorkspaceId } from "@/types/chanakya-guide";
import { getActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";

export interface ChanakyaAssistantResolved {
  /** User-facing advisor name for the drawer header. */
  advisorTitle: string;
  guideContext: ChanakyaGuideContext;
}

const ADVISOR_BY_WORKSPACE: Partial<Record<ChanakyaGuideWorkspaceId, string>> = {
  strategic_workspace: "Strategic Advisor",
  opportunity_setup: "Credit Advisor",
  credit_workbench: "Credit Advisor",
  loan_workspace: "Loan Advisor",
  lender_pipeline: "Loan Advisor",
  document_center: "Document Advisor",
  dialogue: "Dialogue Advisor",
  tasks: "Task Advisor",
};

function workspaceFromPath(pathname: string): {
  workspaceId: ChanakyaGuideWorkspaceId;
  advisorTitle: string;
  section?: string;
} {
  const path = pathname.split("?")[0] ?? pathname;

  if (path.startsWith("/opportunities") || path.startsWith("/opportunity-compass")) {
    return { workspaceId: "strategic_workspace", advisorTitle: "Strategic Advisor" };
  }
  if (path.startsWith("/credit-bench")) {
    return { workspaceId: "opportunity_setup", advisorTitle: "Credit Advisor" };
  }
  if (path.startsWith("/credit-workbench")) {
    return { workspaceId: "credit_workbench", advisorTitle: "Credit Advisor" };
  }
  if (path.startsWith("/loan-files")) {
    return { workspaceId: "loan_workspace", advisorTitle: "Loan Advisor" };
  }
  if (path.startsWith("/document-center") || path.startsWith("/documents")) {
    return { workspaceId: "document_center", advisorTitle: "Document Advisor" };
  }
  if (path.startsWith("/mission-control")) {
    return { workspaceId: "strategic_workspace", advisorTitle: "Executive Advisor", section: "mission_control" };
  }
  if (path.startsWith("/dialogue")) {
    return { workspaceId: "dialogue", advisorTitle: "Dialogue Advisor" };
  }
  if (path.startsWith("/tasks")) {
    return { workspaceId: "tasks", advisorTitle: "Task Advisor" };
  }
  if (path.startsWith("/chanakya-radar") || path.startsWith("/my-deals") || path === "/dashboard") {
    return { workspaceId: "strategic_workspace", advisorTitle: "Executive Advisor", section: "radar" };
  }

  return { workspaceId: "strategic_workspace", advisorTitle: "CHANAKYA Advisor" };
}

/** Resolve CHANAKYA drawer context from current route + active opportunity. */
export function resolveGlobalChanakyaAssistant(pathname: string): ChanakyaAssistantResolved {
  const mapped = workspaceFromPath(pathname);
  const active = typeof window !== "undefined" ? getActiveOpportunityContext() : null;

  const transactionLabel = active
    ? [active.customerName, active.label || active.opportunityId, active.product]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  const advisorTitle =
    ADVISOR_BY_WORKSPACE[mapped.workspaceId] && mapped.advisorTitle
      ? mapped.advisorTitle
      : mapped.advisorTitle;

  return {
    advisorTitle,
    guideContext: {
      platform: "catalyst_one",
      workspaceId: mapped.workspaceId,
      section: mapped.section ?? "default",
      moduleId: mapped.section ?? "default",
      transactionLabel,
    },
  };
}
