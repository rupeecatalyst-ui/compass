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
      arrivalTimeLabel: arrivalTimeLabel(opp.createdAt || ""),
      attention,
      isNewIndicator,
      workspaceHref: buildOpportunityWorkspaceEntryHref({ id: opp.id }),
    };
  });

  // Feed order: oldest → newest so newest enters at bottom of the ticker
  rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

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
