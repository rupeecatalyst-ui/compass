/**
 * CO-GOV-001 — Configuration versioning via Enterprise Decision Ledger.
 * Stores Version · Author · Effective Date · Previous Version linkage in metadata.
 */

import { recordEnterpriseDecision } from "@/lib/enterprise-decision-ledger";
import type { EdlChangeCategory, EdlLedgerEntry } from "@/types/enterprise-decision-ledger";
import { recordEntityChange } from "./record";

export type PublishConfigurationVersionInput = {
  configKey: string;
  configLabel?: string;
  version: string;
  previousVersion?: string | null;
  authorUserId: string;
  authorName?: string;
  effectiveDate: string;
  previousValue?: unknown;
  newValue?: unknown;
  category: EdlChangeCategory;
  relatedEngine: string;
  justification: string;
  impactScope?: EdlLedgerEntry["impactScope"];
};

export function publishConfigurationVersion(
  input: PublishConfigurationVersionInput,
): EdlLedgerEntry {
  const entry = recordEnterpriseDecision({
    requestedBy: input.authorUserId,
    approvedBy: input.authorUserId,
    implementedBy: input.authorUserId,
    previousValue: input.previousValue ?? { version: input.previousVersion ?? null },
    newValue: input.newValue ?? { version: input.version },
    businessJustification: input.justification,
    effectiveFrom: input.effectiveDate,
    versionNumber: input.version,
    impactScope: input.impactScope ?? "organization",
    changeType: "versioned",
    changeCategory: input.category,
    relatedEngine: input.relatedEngine,
    relatedEntityType: "Configuration",
    relatedEntityId: input.configKey,
    relatedEntityLabel: input.configLabel ?? input.configKey,
    metadata: {
      configKey: input.configKey,
      previousVersion: input.previousVersion ?? null,
      authorName: input.authorName ?? null,
      coGov: "CO-GOV-001",
    },
  });

  recordEntityChange({
    entityType: "Configuration",
    entityId: input.configKey,
    action: "Updated",
    actorUserId: input.authorUserId,
    summary: `Configuration ${input.configKey} → v${input.version}`,
    previousValue: input.previousVersion ?? null,
    newValue: input.version,
    reason: input.justification,
  });

  return entry;
}
