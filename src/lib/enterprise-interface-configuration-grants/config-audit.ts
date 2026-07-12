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
