/**
 * Lead Stage / Opportunity Stage journey — presentation & navigation only.
 * No workflow-engine or database changes.
 */

import { ROUTES } from "@/constants/routes";
import type { PipelineStage } from "@/types/catalyst-one";
import { STAGE_LABELS } from "@/constants/loan-stage-master";
import {
  DASHBOARD_ENTRY_PARAM,
  getActiveOpportunityContext,
} from "@/lib/lead-opportunity-journey/active-context";

export type JourneyBusinessStage = "lead" | "opportunity";

export type LeadJourneyModuleId =
  | "credit_bench"
  | "document_center"
  | "credit_workbench"
  | "strategic_workspace"
  | "loan_workspace";

export interface LeadJourneyModule {
  id: LeadJourneyModuleId;
  stage: JourneyBusinessStage;
  label: string;
  href: string;
  /** Module title shown under LEAD STAGE / OPPORTUNITY STAGE eyebrow. */
  title: string;
}

/** Official Lead → Opportunity spine (nav + Save & Continue). */
export const LEAD_OPPORTUNITY_JOURNEY: LeadJourneyModule[] = [
  {
    id: "credit_bench",
    stage: "lead",
    label: "Opportunity Setup",
    href: ROUTES.CREDIT_BENCH,
    title: "Opportunity Setup",
  },
  {
    id: "document_center",
    stage: "lead",
    label: "Document Center",
    href: ROUTES.DOCUMENT_CENTER,
    title: "Document Center",
  },
  {
    id: "credit_workbench",
    stage: "lead",
    label: "Credit Workbench",
    href: ROUTES.CREDIT_WORKBENCH,
    title: "Credit Workbench",
  },
  {
    id: "strategic_workspace",
    stage: "lead",
    label: "Strategic Workspace",
    href: ROUTES.OPPORTUNITY_WORKSPACE,
    title: "Strategic Workspace",
  },
  {
    id: "loan_workspace",
    stage: "opportunity",
    label: "Loan Workspace",
    href: ROUTES.LOAN_FILES,
    title: "Loan Workspace",
  },
];

export function getLeadJourneyModule(id: LeadJourneyModuleId): LeadJourneyModule {
  return LEAD_OPPORTUNITY_JOURNEY.find((m) => m.id === id)!;
}

export function getNextLeadJourneyModule(id: LeadJourneyModuleId): LeadJourneyModule | null {
  const idx = LEAD_OPPORTUNITY_JOURNEY.findIndex((m) => m.id === id);
  if (idx < 0 || idx >= LEAD_OPPORTUNITY_JOURNEY.length - 1) return null;
  return LEAD_OPPORTUNITY_JOURNEY[idx + 1]!;
}

/**
 * Preserve file / opportunity context across in-transaction navigation.
 * Merges explicit context with Active Opportunity Context (SSOT).
 * Never emits `entry=dashboard` — that is only for main-nav dashboard entry.
 */
export function buildJourneyHref(
  baseHref: string,
  context?: { fileId?: string | null; opportunityId?: string | null },
): string {
  const active =
    typeof window !== "undefined" ? getActiveOpportunityContext() : null;
  const fileId = context?.fileId ?? active?.fileId ?? null;
  const opportunityId = context?.opportunityId ?? active?.opportunityId ?? null;

  const url = new URL(baseHref, "https://local.invalid");
  url.searchParams.delete(DASHBOARD_ENTRY_PARAM);
  if (fileId) url.searchParams.set("file", fileId);
  if (opportunityId) url.searchParams.set("opportunityId", opportunityId);
  const q = url.searchParams.toString();
  return q ? `${url.pathname}?${q}` : url.pathname;
}

/**
 * Presentation-only stage label for Lead/Opportunity UI.
 * Engine id `raw_lead` displays as Identified — do not rename engine ids.
 */
export function getJourneyStageDisplayLabel(stage: PipelineStage | string): string {
  if (stage === "raw_lead") return "Identified";
  return STAGE_LABELS[stage as PipelineStage] ?? String(stage).replace(/_/g, " ");
}

export function journeyStageEyebrow(stage: JourneyBusinessStage): string {
  return stage === "lead" ? "LEAD STAGE" : "OPPORTUNITY STAGE";
}
