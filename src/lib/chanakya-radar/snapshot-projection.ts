/**

 * CO-ARCH-007 — Map certified Radar deal rows → Kanban cards (no live LoanFile derive).

 */



import { ROUTES } from "@/constants/routes";

import type { ChanakyaRadarScopeId } from "@/constants/chanakya-radar";

import type { ChanakyaRadarDealRow } from "@/lib/chanakya-radar/derive-dashboard";

import type { ChanakyaRadarCard } from "@/lib/chanakya-radar/derive-radar";



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



export function filterRadarRowsByScope(

  rows: ChanakyaRadarDealRow[],

  scope: ChanakyaRadarScopeId,

  actorRm: string,

): ChanakyaRadarDealRow[] {

  if (scope === "entire_organization") return rows;

  if (scope === "my_portfolio") {

    return rows.filter((r) => (r.assignedRm || "").trim() === actorRm);

  }

  const rms = new Set(rows.map((r) => (r.assignedRm || "").trim()).filter(Boolean));

  if (!rms.has(actorRm)) {

    return rows.filter((r) => (r.assignedRm || "").trim() === actorRm);

  }

  return rows.filter((r) => rms.has((r.assignedRm || "").trim()));

}


