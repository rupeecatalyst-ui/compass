/**
 * ECG configuration change audit (field-level SSOT trail).
 */

import type {
  EcgConfigChangeAudit,
  EcgConfigLifecycleState,
  EcgDomainKey,
} from "@/types/enterprise-interface-configuration-grants";
import { recordEcgAudit } from "./audit-integration";
import { getEcgPorts } from "./composition";

export function recordEcgConfigChange(input: {
  domainKey: EcgDomainKey;
  packageId?: string;
  actorId: string;
  fieldPath: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string;
  lifecycleState?: EcgConfigLifecycleState;
}): EcgConfigChangeAudit {
  const entry: EcgConfigChangeAudit = {
    id: crypto.randomUUID(),
    domainKey: input.domainKey,
    packageId: input.packageId,
    actorId: input.actorId,
    occurredOn: new Date().toISOString(),
    fieldPath: input.fieldPath,
    previousValue: input.previousValue,
    newValue: input.newValue,
    reason: input.reason,
    lifecycleState: input.lifecycleState,
  };

  getEcgPorts().configAudits.save(entry);
  recordEcgAudit({
    entityId: entry.id,
    entityType: "config_change",
    action: "modified",
    actorId: input.actorId,
    remarks: `ECG ${input.domainKey}.${input.fieldPath}: ${input.reason}`,
  });

  // Enterprise Decision Ledger — permanent constitutional memory (non-blocking).
  void import("@/lib/enterprise-decision-ledger")
    .then((edl) =>
      edl.recordEnterpriseDecision({
        requestedBy: input.actorId,
        approvedBy: input.actorId,
        previousValue: input.previousValue,
        newValue: input.newValue,
        businessJustification: input.reason,
        effectiveFrom: entry.occurredOn,
        versionNumber: "ecg",
        impactScope: "organization",
        changeType: "updated",
        changeCategory: "experience_console_changes",
        relatedEngine: "ECG · Enterprise Interface Configuration Grants",
        relatedEntityType: "ecg_domain",
        relatedEntityId: input.domainKey,
        relatedEntityLabel: `${input.domainKey}.${input.fieldPath}`,
        notImpactedNote: "ECG field change recorded for explainability; prior package versions remain historical.",
        metadata: { packageId: input.packageId, fieldPath: input.fieldPath },
      }),
    )
    .catch(() => undefined);

  return entry;
}

export function listEcgConfigChanges(domainKey?: EcgDomainKey): EcgConfigChangeAudit[] {
  const all = domainKey
    ? getEcgPorts().configAudits.listByDomain(domainKey)
    : getEcgPorts().configAudits.list();
  return [...all].sort(
    (a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime(),
  );
}
