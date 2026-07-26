/**
 * CO-BIZ-003 Phase 3 — Team performance (compose from Deals + ETE byAssignee).
 */

import { assigneeLabel } from "@/lib/enterprise-task-engine";
import type {
  EbiTeamMemberPerformance,
  EbiTeamPerformance,
} from "@/types/enterprise-business-intelligence";
import { amountOf, type EbiDataContext } from "./snapshot";

export function deriveTeamPerformance(ctx: EbiDataContext): EbiTeamPerformance {
  const byRm = new Map<
    string,
    {
      opportunities: Set<string>;
      closed: number;
      days: number[];
      pending: number;
    }
  >();

  for (const f of ctx.files) {
    const name = f.relationshipManager?.trim() || "Unassigned RM";
    const cur = byRm.get(name) ?? {
      opportunities: new Set<string>(),
      closed: 0,
      days: [],
      pending: 0,
    };
    const opp = f.opportunityNumber || f.id;
    cur.opportunities.add(opp);
    if (f.stage === "won") cur.closed += 1;
    else {
      cur.pending += 1;
      cur.days.push(f.daysInStage || 0);
    }
    byRm.set(name, cur);
    void amountOf(f);
  }

  const eteByName = new Map<string, { open: number; completed: number; overdue: number }>();
  for (const row of ctx.eteReport.byAssignee) {
    const name = assigneeLabel(row.assigneeRef);
    const cur = eteByName.get(name) ?? { open: 0, completed: 0, overdue: 0 };
    cur.open += row.open;
    cur.completed += row.completed;
    cur.overdue += row.overdue;
    eteByName.set(name, cur);
  }

  const names = new Set([...byRm.keys(), ...eteByName.keys()]);
  const members: EbiTeamMemberPerformance[] = [...names].map((name) => {
    const deal = byRm.get(name);
    const ete = eteByName.get(name);
    const pendingWorkload = (deal?.pending ?? 0) + (ete?.open ?? 0);
    const overdueWork = ete?.overdue ?? 0;
    const completed = ete?.completed ?? 0;
    const open = ete?.open ?? 0;
    const completionRatePct =
      completed + open === 0
        ? deal?.closed
          ? 100
          : 0
        : Math.round((completed / (completed + open)) * 1000) / 10;
    const avgTurn =
      deal && deal.days.length > 0
        ? Math.round(deal.days.reduce((a, b) => a + b, 0) / deal.days.length)
        : null;

    return {
      name,
      opportunitiesHandled: deal?.opportunities.size ?? 0,
      dealsClosed: deal?.closed ?? 0,
      averageTurnaroundDays: avgTurn,
      pendingWorkload,
      overdueWork,
      completionRatePct,
    };
  });

  members.sort(
    (a, b) =>
      b.completionRatePct - a.completionRatePct ||
      a.overdueWork - b.overdueWork ||
      b.dealsClosed - a.dealsClosed,
  );

  return {
    asOf: ctx.asOf,
    members,
    sourceModules: ["Deal Registry (Radar DAL)", "Enterprise Task Engine"],
  };
}
