/**
 * Enterprise Decision Ledger — append-only registry (constitutional memory).
 */

import {
  EDL_FRAMEWORK_VERSION,
  EDL_LEDGER_ID_PREFIX,
} from "@/constants/enterprise-decision-ledger";
import type {
  CreateEdlEntryInput,
  EdlLedgerEntry,
  EdlRegistrySnapshot,
} from "@/types/enterprise-decision-ledger";
import { recordEdlAuditLink } from "./audit-integration";
import { getEdlPorts } from "./composition";

let seq = 0;

function nextLedgerId(): string {
  seq += 1;
  const stamp = Date.now().toString(36).toUpperCase();
  const n = String(seq).padStart(4, "0");
  return `${EDL_LEDGER_ID_PREFIX}-${stamp}-${n}`;
}

function assertJustification(text: string): void {
  const t = text?.trim();
  if (!t || t.length < 8) {
    throw new Error("EDL: Business Justification is mandatory (min 8 characters).");
  }
}

/**
 * Record a permanent enterprise decision.
 * Never overwrites. Never deletes. History is constitutional.
 */
export function recordEnterpriseDecision(input: CreateEdlEntryInput): EdlLedgerEntry {
  assertJustification(input.businessJustification);

  const ledgerId = nextLedgerId();
  const recordedAt = new Date().toISOString();

  const eafAuditEntryId = recordEdlAuditLink({
    ledgerId,
    actorId: input.implementedBy || input.approvedBy || input.requestedBy,
    remarks: `EDL ${input.changeCategory}: ${input.businessJustification.slice(0, 160)}`,
    previousStateRef:
      input.previousValue === undefined ? undefined : JSON.stringify(input.previousValue).slice(0, 500),
    newStateRef:
      input.newValue === undefined ? undefined : JSON.stringify(input.newValue).slice(0, 500),
  });

  const entry: EdlLedgerEntry = {
    ledgerId,
    recordedAt,
    requestedBy: input.requestedBy,
    approvedBy: input.approvedBy,
    implementedBy: input.implementedBy,
    previousValue: input.previousValue,
    newValue: input.newValue,
    businessJustification: input.businessJustification.trim(),
    effectiveFrom: input.effectiveFrom,
    effectiveUntil: input.effectiveUntil ?? null,
    versionNumber: input.versionNumber,
    impactScope: input.impactScope,
    changeType: input.changeType,
    changeCategory: input.changeCategory,
    relatedEngine: input.relatedEngine,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    relatedEntityLabel: input.relatedEntityLabel,
    eafAuditEntryId,
    notImpactedNote: input.notImpactedNote,
    tenantId: input.tenantId,
    metadata: input.metadata,
  };

  getEdlPorts().ledger.append(entry);
  return entry;
}

export function listEnterpriseDecisions(): EdlLedgerEntry[] {
  return [...getEdlPorts().ledger.list()].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );
}

export function getEnterpriseDecision(ledgerId: string): EdlLedgerEntry | undefined {
  return getEdlPorts().ledger.findById(ledgerId);
}

export function listEnterpriseDecisionsByEntity(
  entityType: string,
  entityId: string,
): EdlLedgerEntry[] {
  return [...getEdlPorts().ledger.listByEntity(entityType, entityId)].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );
}

export function listEnterpriseDecisionsByCategory(category: string): EdlLedgerEntry[] {
  return [...getEdlPorts().ledger.listByCategory(category)].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );
}

export function listEnterpriseDecisionsByEngine(relatedEngine: string): EdlLedgerEntry[] {
  return [...getEdlPorts().ledger.listByEngine(relatedEngine)].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );
}

/**
 * Legally permitted fact correction — preserves original via previousValue.
 * Never silently mutates the original fact; always creates an EDL entry.
 */
export function recordImmutableFactCorrection(input: {
  requestedBy: string;
  approvedBy: string;
  implementedBy?: string;
  factKey: string;
  originalValue: unknown;
  correctedValue: unknown;
  businessJustification: string;
  relatedEntityType: string;
  relatedEntityId: string;
  relatedEntityLabel?: string;
  relatedEngine?: string;
}): EdlLedgerEntry {
  return recordEnterpriseDecision({
    requestedBy: input.requestedBy,
    approvedBy: input.approvedBy,
    implementedBy: input.implementedBy,
    previousValue: { factKey: input.factKey, value: input.originalValue },
    newValue: { factKey: input.factKey, value: input.correctedValue },
    businessJustification: input.businessJustification,
    effectiveFrom: new Date().toISOString(),
    versionNumber: "correction",
    impactScope: "entity",
    changeType: "corrected",
    changeCategory: "immutable_fact_correction",
    relatedEngine: input.relatedEngine ?? "Enterprise Decision Ledger",
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    relatedEntityLabel: input.relatedEntityLabel,
    notImpactedNote:
      "Original fact remains historically preserved in previousValue. Correction is additive.",
  });
}

export function getEdlRegistrySnapshot(): EdlRegistrySnapshot {
  const ports = getEdlPorts();
  return {
    frameworkVersion: EDL_FRAMEWORK_VERSION,
    entryCount: ports.ledger.list().length,
    commercialVersionCount: ports.commercials.list().length,
    capturedAt: new Date().toISOString(),
  };
}
