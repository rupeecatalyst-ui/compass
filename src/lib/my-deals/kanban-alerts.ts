/**
 * Highest-priority Deal alert for My Deals Kanban cards.
 * Derived from existing Deal Registry signals — no parallel alert engine.
 */

import type { DealRegistryRow } from "@/types/deal-registry";
import { POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES } from "@/constants/post-disbursement-confirmation";

export type MyDealsKanbanAlertSeverity = "critical" | "action" | "info";

export type MyDealsKanbanAlert = {
  id: string;
  label: string;
  severity: MyDealsKanbanAlertSeverity;
};

const SEVERITY_RANK: Record<MyDealsKanbanAlertSeverity, number> = {
  critical: 3,
  action: 2,
  info: 1,
};

export function deriveMyDealsKanbanAlerts(row: DealRegistryRow): MyDealsKanbanAlert[] {
  const alerts: MyDealsKanbanAlert[] = [];
  const status = String(row.status ?? "").toLowerCase();
  const sla = (row.slaStatus ?? "").toLowerCase();

  if (row.riskIndicator === "High" || status === "delayed" || sla.includes("breach")) {
    alerts.push({ id: "sla", label: "SLA / delay requires attention", severity: "critical" });
  } else if (status === "at_risk" || sla.includes("risk")) {
    alerts.push({ id: "risk", label: "Deal at risk", severity: "action" });
  }

  if (row.documentsPending > 0) {
    alerts.push({
      id: "docs",
      label: `${row.documentsPending} document${row.documentsPending === 1 ? "" : "s"} pending`,
      severity: "action",
    });
  }

  if (row.tasksPending > 0) {
    alerts.push({
      id: "tasks",
      label: `${row.tasksPending} task${row.tasksPending === 1 ? "" : "s"} pending`,
      severity: "action",
    });
  }

  const sub = String(row.subStage ?? "").toLowerCase().replace(/\s+/g, "_");
  if (sub === POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.pending) {
    alerts.push({
      id: "pdc",
      label: "Lender confirmation pending",
      severity: "action",
    });
  }

  if (row.priority === "urgent") {
    alerts.push({ id: "priority", label: "Urgent priority", severity: "critical" });
  }

  return alerts.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}

export function primaryMyDealsKanbanAlert(row: DealRegistryRow): {
  primary: MyDealsKanbanAlert | null;
  extraCount: number;
} {
  const alerts = deriveMyDealsKanbanAlerts(row);
  if (alerts.length === 0) return { primary: null, extraCount: 0 };
  return { primary: alerts[0] ?? null, extraCount: Math.max(0, alerts.length - 1) };
}
