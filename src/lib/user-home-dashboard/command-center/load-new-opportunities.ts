/**
 * CO-C1-DASH-001 — Load New Opportunities feed (createdAt range only).
 */

import {
  opportunityBusinessSourceLabel,
  opportunityBusinessSourceSummaryLabel,
} from "@/constants/opportunity-business-source";
import { formatINR } from "@/lib/format-currency";
import { coalesceAssignedUsers, formatAssignedUsersLabel } from "@/lib/assigned-users";
import { borrowerDisplayNameOrDash } from "@/lib/enterprise-borrower-identity";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { displayOpportunityRequirementStageLabel } from "@/lib/lead-opportunity-journey/opportunity-field-display";
import { buildOpportunityWorkspaceEntryHref } from "@/lib/loan-journey/adr-018-routing";
import { newArrivalsRangeToDateBounds } from "@/lib/user-home-dashboard/new-arrivals/date-range";
import {
  deriveNewOpportunityAttention,
  summarizeAttention,
} from "@/lib/user-home-dashboard/command-center/new-opportunity-attention";
import type {
  NewOpportunityFeedRow,
  NewOpportunitySectionSummary,
} from "@/types/dashboard-command-center";
import type { NewArrivalsDateRange } from "@/types/user-home-new-arrivals";

function arrivalTimeLabel(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

/** Created date only — e.g. 12 Aug 2026 */
function createdDateLabel(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/** Last Updated date + time — e.g. 12 Aug 2026, 10:16 PM */
function lastUpdatedLabel(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const datePart = d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timePart = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
  } catch {
    return "—";
  }
}

function sourceNameFromRecord(opp: {
  sourceCode?: string | null;
  sourceContactName?: string | null;
}): string {
  const code = (opp.sourceCode || "").trim();
  if (!code) return "Not Specified";
  if (code === "direct") return "COMPASS / Direct Customer";
  if (code === "marketing") return "Marketing Campaign";
  const name = opp.sourceContactName?.trim();
  return name || "Not Specified";
}

export async function loadNewOpportunitiesFeed(
  range: Pick<NewArrivalsDateRange, "from" | "to">,
): Promise<{
  rows: NewOpportunityFeedRow[];
  summary: NewOpportunitySectionSummary;
  total: number;
}> {
  const bounds = newArrivalsRangeToDateBounds(range);
  const page = await enterpriseOpportunityApiClient.searchOpportunities({
    createdFrom: bounds.gte.toISOString(),
    createdTo: bounds.lte.toISOString(),
    orderBy: "createdAt",
    limit: 100,
    offset: 0,
  });

  const now = Date.now();
  const rows: NewOpportunityFeedRow[] = page.items.map((opp) => {
    const assignedUsers = coalesceAssignedUsers({
      lendingExtension: opp.lendingExtension,
      primaryOwnerUserId: opp.primaryOwnerUserId,
      relationshipManagerUserId: opp.relationshipManagerUserId,
      relationshipManagerName: opp.relationshipManagerName,
    });
    const attention = deriveNewOpportunityAttention({
      lifecycleStatus: opp.lifecycleStatus,
      requirementStage: opp.requirementStage,
    });
    const createdMs = opp.createdAt ? new Date(opp.createdAt).getTime() : 0;
    const isNewIndicator =
      Number.isFinite(createdMs) && now - createdMs <= 24 * 60 * 60 * 1000;

    return {
      id: opp.id,
      opportunityNumber: opp.opportunityNumber,
      customerName: borrowerDisplayNameOrDash(opp),
      product: opp.productLabel?.trim() || "Not Specified",
      requestedAmount: opp.requestedAmount ?? null,
      sourceLabel: opportunityBusinessSourceSummaryLabel(opp.sourceCode) ||
        opportunityBusinessSourceLabel(opp.sourceCode),
      sourceName: sourceNameFromRecord(opp),
      stageLabel: displayOpportunityRequirementStageLabel(opp.requirementStage || ""),
      assignedLabel: formatAssignedUsersLabel(assignedUsers) || "Unassigned",
      createdAt: opp.createdAt || "",
      updatedAt: opp.updatedAt || "",
      createdDateLabel: createdDateLabel(opp.createdAt || ""),
      lastUpdatedLabel: lastUpdatedLabel(opp.updatedAt || ""),
      arrivalTimeLabel: arrivalTimeLabel(opp.createdAt || ""),
      attention,
      isNewIndicator,
      workspaceHref: buildOpportunityWorkspaceEntryHref({ id: opp.id }),
    };
  });

  // CO-C1-REFINEMENTS-20260812 — newest-created first (createdAt, not updatedAt)
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    rows,
    summary: summarizeAttention(rows),
    total: page.total,
  };
}

export function formatNewOpportunityAmount(amount: number | null): string {
  if (amount == null || amount <= 0) return "Not Specified";
  return formatINR(amount);
}
