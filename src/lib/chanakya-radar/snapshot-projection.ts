/**
 * CO-ARCH-007 / CO-ORG-VISIBILITY-002 — Map certified Radar deal rows → Kanban cards.
 */

import { ROUTES } from "@/constants/routes";
import type { ChanakyaRadarScopeId } from "@/constants/chanakya-radar";
import type { Role } from "@/constants/roles";
import type { ChanakyaRadarDealRow } from "@/lib/chanakya-radar/derive-dashboard";
import type { ChanakyaRadarCard } from "@/lib/chanakya-radar/derive-radar";
import {
  actorCanSeeCase,
  hasOrgWideCaseVisibility,
} from "@/lib/enterprise-case-visibility";

export function mapRadarDealRowToKanbanCard(row: ChanakyaRadarDealRow): ChanakyaRadarCard {
  return {
    id: row.id,
    health: row.quadrant,
    borrower: row.borrower,
    opportunityNumber: row.opportunityNumber || row.dealId,
    enterpriseDealId: row.enterpriseDealId,
    customerId: row.customerId,
    dealNumber: row.dealId,
    product: row.product,
    loanAmountLabel: row.loanAmountLabel,
    relationshipManager: row.assignedRm,
    source: "snapshot",
    activeLenders: row.lender
      ? [{ lender: row.lender, stageLabel: row.stageLabel }]
      : [],
    extraActiveLenders: 0,
    lendersInsight: row.lender || "No active lender on snapshot",
    chanakyaSays: row.quadrantLabel,
    executiveInsight: `${row.quadrantLabel} · ${row.stageLabel}`,
    why: [`Idle ${row.idleDays}d`, `Stage ${row.daysInStage}d`],
    recommends: [],
    expectedOutcome: "Continue operational execution",
    nextWorkspace: {
      id: "strategic_bench",
      label: "Opportunity Workspace",
      emoji: "◎",
      href: ROUTES.OPPORTUNITY_WORKSPACE,
    },
    waitingOn: {
      preamble: "Waiting For",
      party: "Team",
      pendingItem: "Operational follow-up",
      emoji: "⏳",
      label: "Team",
    },
    lastActivityLabel: row.lastActivityLabel,
    daysSinceActivity: row.idleDays,
    daysSinceActivityLabel: row.lastActivityLabel,
    momentum: row.workedToday ? "improving" : "stable",
    momentumLabel: row.workedToday ? "Worked today" : "Steady",
    aiPriority: row.quadrant === "at_risk" ? "high" : "medium",
    ageingDays: row.daysInStage,
    ageingLabel: `${row.daysInStage}d in stage`,
    confidence: 70,
    fileId: row.fileId,
  };
}

export type RadarRowScopeOptions = {
  actorRm: string;
  actorUserId?: string | null;
  role?: Role | string | null;
  downlineUserIds?: string[] | null;
};

export function filterRadarRowsByScope(
  rows: ChanakyaRadarDealRow[],
  scope: ChanakyaRadarScopeId,
  optionsOrActorRm: RadarRowScopeOptions | string,
): ChanakyaRadarDealRow[] {
  const options: RadarRowScopeOptions =
    typeof optionsOrActorRm === "string"
      ? { actorRm: optionsOrActorRm }
      : optionsOrActorRm;

  if (scope === "entire_organization") {
    // Org-wide roles see the full certified book. Others fall through to team rules.
    if (hasOrgWideCaseVisibility(options.role)) return rows;
  }

  const effectiveScope: ChanakyaRadarScopeId =
    scope === "entire_organization" ? "my_team" : scope;

  return rows.filter((row) =>
    actorCanSeeCase(
      {
        userId: options.actorUserId,
        role: options.role,
        displayName: options.actorRm,
      },
      {
        primaryOwnerUserId: row.primaryOwnerUserId,
        relationshipManagerUserId: row.relationshipManagerUserId,
        relationshipManagerName: row.assignedRm,
        assignedUserIds: row.assignedUserIds,
        assignedUserNames: row.assignedUserNames,
        hierarchyVisibilityUserIds: row.hierarchyVisibilityUserIds,
      },
      {
        scope: effectiveScope,
        downlineUserIds:
          options.downlineUserIds ??
          (options.actorUserId ? [options.actorUserId] : []),
      },
    ),
  );
}
