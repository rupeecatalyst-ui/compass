/**
 * CO-GOV-001 — Mirror CO-OPS-002 business audits into governance entity history.
 */

import type { OpsBusinessAuditEvent } from "@/types/ops-observability";
import type { GovernanceEntityType, GovernanceLifecycleAction } from "@/types/enterprise-governance";
import { recordEntityChange } from "./record";

function mapModuleToEntityType(module: string): GovernanceEntityType {
  const m = module.toLowerCase();
  if (m.includes("customer") || m.includes("contact") || m === "ecm") return "Contact";
  if (m.includes("opportunity")) return "Opportunity";
  if (m.includes("deal")) return "EnterpriseDeal";
  if (m.includes("loan")) return "LoanFile";
  if (m.includes("lender")) return "Lender";
  if (m.includes("document")) return "Document";
  if (m.includes("workflow") || m.includes("status")) return "Workflow";
  if (m.includes("account")) return "AccountingEntry";
  if (m.includes("auth")) return "Other";
  return "Other";
}

function mapAction(action: string): GovernanceLifecycleAction {
  const a = action.toLowerCase();
  if (a.includes("restore")) return "Restored";
  if (a.includes("delete") || a.includes("archiv")) return "Deleted";
  if (a.includes("create") || a.includes("login") || a.includes("assign") || a.includes("upload")) {
    return a.includes("create") || a.includes("login") ? "Created" : "Updated";
  }
  if (a.includes("update") || a.includes("change") || a.includes("transition")) return "Updated";
  return "Updated";
}

export function mirrorOpsAuditToGovernance(event: OpsBusinessAuditEvent): void {
  if (!event.entityId) return;
  try {
    recordEntityChange({
      entityType: mapModuleToEntityType(String(event.module)),
      entityId: event.entityId,
      action: mapAction(event.action),
      actorUserId: event.actorUserId,
      summary: event.action,
      previousValue: event.previousValue,
      newValue: event.newValue,
      correlationId: event.correlationId,
    });
  } catch {
    /* never break ops path */
  }
}
