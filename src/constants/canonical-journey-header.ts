/**
 * CO-ARCH — Canonical Journey Header (ENTERPRISE FROZEN).
 *
 * Exact stage sequence displayed across all Opportunity and Deal execution workspaces:
 * 1. Lead Creation
 * 2. Documents
 * 3. Credit Bench
 * 4. LIFE (Strategy)
 * 5. Lender Pipeline
 * 6. Disbursed
 * 7. Journey Complete
 *
 * Do not reorder without Product Architecture approval.
 * Context (Opportunity / Deal) must be preserved on every stage hop.
 */

import { ROUTES } from "@/constants/routes";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import { buildDealWorkspaceHref } from "@/lib/loan-journey/adr-018-routing";

export const CANONICAL_JOURNEY_HEADER_NAME = "Business Journey";

export const CANONICAL_JOURNEY_STAGE_IDS = [
  "lead_creation",
  "documents",
  "credit_bench",
  "life",
  "lender_pipeline",
  "disbursed",
  "journey_complete",
] as const;

export type CanonicalJourneyStageId = (typeof CANONICAL_JOURNEY_STAGE_IDS)[number];

export type CanonicalJourneyStageStatus = "completed" | "current" | "upcoming";

export interface CanonicalJourneyStageDef {
  id: CanonicalJourneyStageId;
  label: string;
  shortLabel: string;
  purpose: string;
  href: string;
  tab?: string;
  /** When false, destination marker only (not a workspace hop). */
  navigable: boolean;
  isSuccessDestination?: boolean;
  sortOrder: number;
}

/**
 * Frozen enterprise sequence — Opportunity + Deal execution.
 * Lead Creation = Opportunity Creation landing.
 * Credit Bench = Credit Workbench evaluation.
 * LIFE = Strategy Workbench.
 */
export const CANONICAL_JOURNEY_STAGES: CanonicalJourneyStageDef[] = [
  {
    id: "lead_creation",
    label: "Lead Creation",
    shortLabel: "Lead",
    purpose: "Create and maintain the customer requirement.",
    href: ROUTES.CREDIT_BENCH,
    navigable: true,
    sortOrder: 1,
  },
  {
    id: "documents",
    label: "Documents",
    shortLabel: "Documents",
    purpose: "Collect all customer documents for this Opportunity.",
    href: ROUTES.DOCUMENT_CENTER,
    navigable: true,
    sortOrder: 2,
  },
  {
    id: "credit_bench",
    label: "Credit Bench",
    shortLabel: "Credit",
    purpose: "Evaluate customer eligibility before lender strategy.",
    href: ROUTES.CREDIT_WORKBENCH,
    navigable: true,
    sortOrder: 3,
  },
  {
    id: "life",
    label: "LIFE",
    shortLabel: "LIFE",
    purpose: "Select execution strategy and shortlist lenders.",
    href: ROUTES.OPPORTUNITY_WORKSPACE,
    navigable: true,
    sortOrder: 4,
  },
  {
    id: "lender_pipeline",
    label: "Lender Pipeline",
    shortLabel: "Pipeline",
    purpose: "Execute lender cases for the active Deal.",
    /** CO-UX-002 — Registry first (My Deals); workspace only after Deal selected. */
    href: ROUTES.MY_DEALS,
    tab: "lenders",
    navigable: true,
    sortOrder: 5,
  },
  {
    id: "disbursed",
    label: "Disbursed",
    shortLabel: "Disbursed",
    purpose: "Funds released — commercial outcomes in motion.",
    /** CO-UX-002 — Disbursement Registry = Enterprise Deal Registry (My Deals). */
    href: ROUTES.MY_DEALS,
    tab: "overview",
    navigable: true,
    sortOrder: 6,
  },
  {
    id: "journey_complete",
    label: "Journey Complete",
    shortLabel: "Complete",
    purpose: "Lifecycle finished — including commercial settlement.",
    href: ROUTES.MY_DEALS,
    navigable: false,
    isSuccessDestination: true,
    sortOrder: 7,
  },
];

export function getCanonicalJourneyStage(
  id: CanonicalJourneyStageId,
): CanonicalJourneyStageDef {
  const stage = CANONICAL_JOURNEY_STAGES.find((s) => s.id === id);
  if (!stage) throw new Error(`Unknown canonical journey stage: ${id}`);
  return stage;
}

export function getCanonicalJourneyStageIndex(id: CanonicalJourneyStageId): number {
  return CANONICAL_JOURNEY_STAGES.findIndex((s) => s.id === id);
}

export function resolveCanonicalJourneyStageStatus(
  stageId: CanonicalJourneyStageId,
  currentId: CanonicalJourneyStageId,
): CanonicalJourneyStageStatus {
  const stageIndex = getCanonicalJourneyStageIndex(stageId);
  const currentIndex = getCanonicalJourneyStageIndex(currentId);
  if (stageIndex < currentIndex) return "completed";
  if (stageIndex === currentIndex) return "current";
  return "upcoming";
}

export function getNextCanonicalJourneyStage(
  currentId: CanonicalJourneyStageId,
): CanonicalJourneyStageDef | null {
  const idx = getCanonicalJourneyStageIndex(currentId);
  for (let i = idx + 1; i < CANONICAL_JOURNEY_STAGES.length; i += 1) {
    const stage = CANONICAL_JOURNEY_STAGES[i]!;
    if (stage.navigable) return stage;
  }
  return null;
}

export function getPreviousCanonicalJourneyStage(
  currentId: CanonicalJourneyStageId,
): CanonicalJourneyStageDef | null {
  const idx = getCanonicalJourneyStageIndex(currentId);
  for (let i = idx - 1; i >= 0; i -= 1) {
    const stage = CANONICAL_JOURNEY_STAGES[i]!;
    if (stage.navigable) return stage;
  }
  return null;
}

/** Build stage URL — registry/list first; workspace only when Deal id is known. */
export function buildCanonicalJourneyStageHref(
  stageId: CanonicalJourneyStageId,
  context?: {
    fileId?: string | null;
    opportunityId?: string | null;
    dealId?: string | null;
  },
): string {
  const stage = getCanonicalJourneyStage(stageId);
  const dealId = (context?.dealId || "").trim() || null;
  const fileId = (context?.fileId || "").trim() || null;
  const opportunityId = context?.opportunityId ?? null;

  // CO-UX-002 — Deal / Disbursement / Pipeline never open bare `/deals` (404).
  if (
    stageId === "lender_pipeline" ||
    stageId === "disbursed" ||
    stageId === "journey_complete"
  ) {
    if (dealId || fileId) {
      return buildDealWorkspaceHref({
        dealId,
        fileId,
        opportunityId,
        tab: stage.tab ?? (stageId === "lender_pipeline" ? "lenders" : "overview"),
      });
    }
    // Registry-first: Enterprise Deal Registry (My Deals).
    if (stageId === "disbursed") {
      return `${ROUTES.MY_DEALS}?filter=disbursed`;
    }
    return opportunityId
      ? `${ROUTES.MY_DEALS}?opportunityId=${encodeURIComponent(opportunityId)}`
      : ROUTES.MY_DEALS;
  }

  return buildJourneyHref(stage.href, {
    fileId,
    opportunityId,
    tab: stage.tab ?? null,
  });
}

/** Map Lead Journey / Opportunity Workspace module ids → canonical stage. */
export function moduleIdToCanonicalJourneyStage(
  moduleId: string,
): CanonicalJourneyStageId | null {
  switch (moduleId) {
    case "credit_bench":
      return "lead_creation";
    case "document_center":
      return "documents";
    case "credit_workbench":
      return "credit_bench";
    case "strategic_workspace":
      return "life";
    case "loan_workspace":
      return "lender_pipeline";
    default:
      return null;
  }
}

/**
 * @deprecated Prefer CanonicalJourneyStageId — kept for Opportunity Workspace stage prop aliases.
 */
export type OpportunityWorkspaceStageId =
  | "opportunity_creation"
  | "document_center"
  | "credit_workbench"
  | "strategy_workbench";

export function opportunityWorkspaceStageToCanonical(
  id: OpportunityWorkspaceStageId,
): CanonicalJourneyStageId {
  switch (id) {
    case "opportunity_creation":
      return "lead_creation";
    case "document_center":
      return "documents";
    case "credit_workbench":
      return "credit_bench";
    case "strategy_workbench":
      return "life";
    default:
      return "lead_creation";
  }
}

export function canonicalToOpportunityWorkspaceStage(
  id: CanonicalJourneyStageId,
): OpportunityWorkspaceStageId | null {
  switch (id) {
    case "lead_creation":
      return "opportunity_creation";
    case "documents":
      return "document_center";
    case "credit_bench":
      return "credit_workbench";
    case "life":
      return "strategy_workbench";
    default:
      return null;
  }
}
