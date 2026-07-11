/**
 * EOWE audit integration — reuses Sprint 1 EAF audit infrastructure.
 */

import { appendEafAuditEntry } from "@/lib/enterprise-asset-framework";

export function recordEoweOrgAudit(input: {
  nodeId: string;
  action: "created" | "modified" | "lifecycle_changed" | "archived";
  actorId: string;
  previousStateRef?: string;
  newStateRef?: string;
  remarks?: string;
}): void {
  appendEafAuditEntry({
    assetId: input.nodeId,
    action:
      input.action === "created"
        ? "created"
        : input.action === "archived"
          ? "archived"
          : input.action === "modified"
            ? "modified"
            : "lifecycle_changed",
    actorId: input.actorId,
    previousStateRef: input.previousStateRef,
    newStateRef: input.newStateRef,
    remarks: input.remarks,
  });
}
