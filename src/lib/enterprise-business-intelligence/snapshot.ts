/**
 * CO-BIZ-003 — Shared read snapshot for BI compose (Deal Registry via Radar DAL).
 */

import { buildChanakyaRadarDashboard } from "@/lib/chanakya-radar/derive-dashboard";
import { loadRadarDealFilesSync } from "@/lib/chanakya-radar/radar-deal-source";
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
};

export function loadEbiDataContext(): EbiDataContext {
  const { files } = loadRadarDealFilesSync();
  const active = files.filter((f) => !f.archived);
  return {
    asOf: new Date().toISOString(),
    files: active,
    radar: buildChanakyaRadarDashboard(active),
    eteReport: buildEteOperationalReport(),
    tasks: listEteTasks(),
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
