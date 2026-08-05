/**
 * CO-BIZ-003 / CO-CHANAKYA-007 — Shared read snapshot for BI compose.
 * Deal Registry via Radar DAL + live-active filter. Never resurrects deleted/demo.
 */

import { buildChanakyaRadarDashboard } from "@/lib/chanakya-radar/derive-dashboard";
import { loadRadarDealFilesSync } from "@/lib/chanakya-radar/radar-deal-source";
import { resolveLiveDealPortfolio } from "@/lib/chanakya-live-intelligence/live-ssot";
import { buildEteOperationalReport } from "@/lib/enterprise-task-engine";
import { listEteTasks } from "@/lib/enterprise-task-engine/task-registry";
import { columnForTask, resolveTaskStatus } from "@/lib/enterprise-task-engine/task-workspace";
import type { LoanFile } from "@/types/catalyst-one";

export type EbiDataContext = {
  asOf: string;
  files: LoanFile[];
  radar: ReturnType<typeof buildChanakyaRadarDashboard>;
  eteReport: ReturnType<typeof buildEteOperationalReport>;
  tasks: ReturnType<typeof listEteTasks>;
  /** CO-CHANAKYA-007 — false when Deal Registry operational but not yet hydrated. */
  isLiveTrusted: boolean;
};

export function loadEbiDataContext(): EbiDataContext {
  const portfolio = resolveLiveDealPortfolio(loadRadarDealFilesSync());
  const active = portfolio.isLiveTrusted ? portfolio.files.filter((f) => !f.archived) : [];
  return {
    asOf: new Date().toISOString(),
    files: active,
    radar: buildChanakyaRadarDashboard(active),
    eteReport: buildEteOperationalReport(),
    tasks: listEteTasks(),
    isLiveTrusted: portfolio.isLiveTrusted,
  };
}

export function amountOf(file: LoanFile): number {
  return file.requiredAmount || file.loanAmount || 0;
}

export function isOpenTask(task: ReturnType<typeof listEteTasks>[number]): boolean {
  return resolveTaskStatus(task) === "open" && task.enabled !== false;
}

export function taskColumn(task: ReturnType<typeof listEteTasks>[number]) {
  return columnForTask(task);
}
