/**
 * ADR-018 Wave 3 — Customer journey routing (orchestration only).
 *
 * Draft → Lead Information → Requirement Captured → Opportunity Workspace
 * → Documents → Credit Bench → LIFE → Move to Deal → Deal Workspace (/deals/:dealId)
 */

import {
  OPPORTUNITY_LIFECYCLE,
  isDraftLifecycle,
} from "@/constants/opportunity-lifecycle";
import { buildOpportunityWorkspaceStageHref } from "@/constants/opportunity-workspace-stages";
import { ROUTES } from "@/constants/routes";

export type JourneyOpportunityLike = {
  id: string;
  opportunityNumber?: string | null;
  lifecycleStatus?: string | null;
  requirementCaptured?: boolean | null;
  legacyLoanFileId?: string | null;
  primaryContactName?: string | null;
  productLabel?: string | null;
};

/** Product + amount captured (or later lifecycle). OW may open only then. */
export function isOpportunityRequirementCaptured(
  opp: Pick<JourneyOpportunityLike, "requirementCaptured" | "lifecycleStatus">,
): boolean {
  if (opp.requirementCaptured) return true;
  const s = (opp.lifecycleStatus || "").toLowerCase();
  return (
    s === OPPORTUNITY_LIFECYCLE.REQUIREMENT_CAPTURED ||
    s === OPPORTUNITY_LIFECYCLE.ACTIVE ||
    s === OPPORTUNITY_LIFECYCLE.ON_HOLD ||
    s === OPPORTUNITY_LIFECYCLE.WON
  );
}

export function buildLoanJourneyHref(opportunityId: string): string {
  const id = opportunityId.trim();
  return `${ROUTES.LOAN_JOURNEY}?opportunityId=${encodeURIComponent(id)}`;
}

export function buildLeadInformationHref(opportunityId: string): string {
  const id = opportunityId.trim();
  return `${ROUTES.LEAD_INFORMATION}?opportunityId=${encodeURIComponent(id)}`;
}

/**
 * Opportunity Workspace entry after Requirement Captured.
 * Maps Continu Journey “Opportunity Workspace” → existing OW stage 1 (opportunity_creation).
 * Does not open Lead Information (capture) or Deal Workspace.
 */
export function buildOpportunityWorkspaceEntryHref(
  opp: Pick<JourneyOpportunityLike, "id" | "legacyLoanFileId">,
): string {
  return buildOpportunityWorkspaceStageHref("opportunity_creation", {
    fileId: opp.legacyLoanFileId ?? null,
    opportunityId: opp.id,
  });
}

/**
 * Hub Continue / Resume — next orchestration hop from Opportunity lifecycle.
 * Never creates LoanFile or Deal.
 */
export function resolveContinueJourneyHref(opp: JourneyOpportunityLike): string {
  if (!isOpportunityRequirementCaptured(opp)) {
    return buildLeadInformationHref(opp.id);
  }
  return buildOpportunityWorkspaceEntryHref(opp);
}

/** Alias — Wave 3 Resume uses the same lifecycle resolver. */
export function resolveResumeJourneyHref(opp: JourneyOpportunityLike): string {
  return resolveContinueJourneyHref(opp);
}

/**
 * Gate: OW / Documents / Credit / LIFE require Requirement Captured.
 * Returns Lead Information href when blocked; null when allowed.
 */
export function opportunityWorkspaceGateRedirect(
  opp: JourneyOpportunityLike | null | undefined,
): string | null {
  if (!opp?.id) return null;
  if (isOpportunityRequirementCaptured(opp)) return null;
  return buildLeadInformationHref(opp.id);
}

export function describeCurrentJourneyStage(
  opp: JourneyOpportunityLike,
): { id: string; label: string } {
  if (!isOpportunityRequirementCaptured(opp) || isDraftLifecycle(opp.lifecycleStatus)) {
    return { id: "lead_information", label: "Lead Information" };
  }
  return { id: "opportunity_workspace", label: "Opportunity Workspace" };
}

/**
 * ADR-019 — Canonical Deal Workspace URL.
 * Prefer Enterprise Deal id; fall back to legacy file id as path segment.
 */
export function buildDealWorkspaceHref(opts: {
  dealId?: string | null;
  fileId?: string | null;
  opportunityId?: string | null;
  tab?: string | null;
  lenderId?: string | null;
}): string {
  const dealId = (opts.dealId || "").trim() || null;
  const fileId = (opts.fileId || "").trim() || null;
  // CO-ARCH-005 — path is Enterprise Deal id only (legacy fileId accepted as path fallback).
  const pathId = dealId || fileId || "";
  if (!pathId) return ROUTES.MY_DEALS;

  const params = new URLSearchParams();
  if (opts.opportunityId) params.set("opportunityId", opts.opportunityId);
  if (opts.tab) params.set("tab", opts.tab);
  if (opts.lenderId) params.set("lenderId", opts.lenderId);
  const q = params.toString();
  return q
    ? `${ROUTES.DEALS}/${encodeURIComponent(pathId)}?${q}`
    : `${ROUTES.DEALS}/${encodeURIComponent(pathId)}`;
}

/** Pipeline stage helper — uses Deal Workspace (not Loan Files). */
export function buildLenderPipelineHref(opts: {
  fileId?: string | null;
  dealId?: string | null;
  opportunityId?: string | null;
}): string {
  return buildDealWorkspaceHref({
    ...opts,
    tab: "lenders",
  });
}
