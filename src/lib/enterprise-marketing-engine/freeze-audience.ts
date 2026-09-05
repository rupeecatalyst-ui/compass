/**
 * CO-MARKETING-REDESIGN-003 — Freeze an approved audience snapshot.
 * Execution must consume this snapshot, never a live Sheet reread.
 * Does not create Contacts or Opportunities.
 */

import { hashMarketingAudienceSnapshot } from "@/lib/enterprise-marketing-engine/snapshot-hash";
import {
  scanMarketingAudienceEligibility,
  type MarketingEligibilityLookups,
} from "@/lib/enterprise-marketing-engine/eligibility-scan";
import {
  assertConfirmedMarketingColumnMap,
  type MarketingConfirmedColumnMapping,
} from "@/lib/enterprise-marketing-engine/column-mapping";
import { emptyFilterDefinition } from "@/lib/enterprise-marketing-engine/audience-filters";
import type { MarketingDataSourcePort } from "@/lib/enterprise-marketing-engine/ports/data-source.port";
import type { MarketingDurabilityPorts } from "@/types/enterprise-marketing-durability-ports";
import type {
  MarketingDurableAudienceSnapshotRecord,
  MarketingDurableSnapshotRecipientRecord,
} from "@/types/enterprise-marketing-durability";
import type {
  MarketingEligibilityRules,
  MarketingFilterDefinition,
} from "@/types/enterprise-marketing-audience";
import type { MarketingChannel } from "@/constants/enterprise-marketing-engine/lifecycle";

export type MarketingFrozenAudienceSnapshot = {
  snapshot: MarketingDurableAudienceSnapshotRecord & {
    snapshotHash: string;
    sourceRowCount: number;
    validEmailCount: number;
    duplicateCount: number;
    invalidCount: number;
    suppressedCount: number;
    previouslyContactedCount: number;
    filterSnapshot: MarketingFilterDefinition;
    exclusionSnapshot: MarketingFilterDefinition;
  };
  recipients: MarketingDurableSnapshotRecipientRecord[];
  snapshotHash: string;
  eligibleCount: number;
};

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function freezeApprovedAudienceSnapshot(input: {
  ports: MarketingDurabilityPorts;
  port: MarketingDataSourcePort;
  organizationId: string;
  campaignId: string;
  campaignVersionId: string;
  sourceBindingId: string;
  sourceWorkbookId: string;
  sourceTabId: string;
  sourceTabName: string;
  mapping: MarketingConfirmedColumnMapping;
  headers: string[];
  inclusion: MarketingFilterDefinition;
  exclusion?: MarketingFilterDefinition;
  eligibilityRules?: MarketingEligibilityRules & { excludePreviouslyContacted?: boolean };
  lookups?: MarketingEligibilityLookups;
  channel?: MarketingChannel | null;
  actorUserId?: string | null;
}): Promise<MarketingFrozenAudienceSnapshot> {
  const confirmed = assertConfirmedMarketingColumnMap({
    mapping: input.mapping,
    headers: input.headers,
    channel: input.channel ?? "EMAIL",
  });
  const exclusion = input.exclusion ?? emptyFilterDefinition();
  const eligibilityRules = input.eligibilityRules ?? {
    requireIdentity: true,
    requireValidEmailIfPresent: true,
    excludeDuplicatesInScan: true,
    excludePreviouslyContacted: false,
  };

  const scan = await scanMarketingAudienceEligibility({
    port: input.port,
    bindingId: input.sourceBindingId,
    datasetId: input.sourceTabId,
    columnMap: confirmed.map,
    mapping: confirmed,
    inclusion: input.inclusion,
    exclusion,
    eligibilityRules,
    purpose: "approval",
    lookups: input.lookups,
  });

  const extractedAt = nowIso();
  const snapshotHash = hashMarketingAudienceSnapshot({
    workbookId: input.sourceWorkbookId,
    tabId: input.sourceTabId,
    tabName: input.sourceTabName,
    mapping: confirmed.map,
    inclusion: input.inclusion,
    exclusion,
    recipients: scan.eligibleRecipients,
  });

  const snapshotId = id("mkt-snap");
  const ts = extractedAt;
  const actor = input.actorUserId ?? null;
  const estimatedBatchCount = Math.ceil(scan.counts.eligible / 100);

  const snapshot: MarketingFrozenAudienceSnapshot["snapshot"] = {
    id: snapshotId,
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    campaignVersionId: input.campaignVersionId,
    sourceBindingId: input.sourceBindingId,
    sourceWorkbookId: input.sourceWorkbookId,
    sourceTabId: input.sourceTabId,
    sourceTabName: input.sourceTabName,
    extractedAt,
    frozenAt: extractedAt,
    frozenByUserId: actor,
    eligibleCount: scan.counts.eligible,
    estimatedBatchCount,
    columnMap: confirmed.map,
    snapshotHash,
    sourceRowCount: scan.counts.totalRows,
    validEmailCount: scan.counts.validEmails,
    duplicateCount: scan.counts.duplicates,
    invalidCount: scan.counts.invalidEmails,
    suppressedCount: scan.counts.suppressed,
    previouslyContactedCount: scan.counts.previouslyContacted,
    filterSnapshot: input.inclusion,
    exclusionSnapshot: exclusion,
    createdByUserId: actor,
    updatedByUserId: actor,
    createdAt: ts,
    updatedAt: ts,
  };

  const inserted = await input.ports.snapshots.insert(snapshot);

  const recipients: MarketingDurableSnapshotRecipientRecord[] = scan.eligibleRecipients.map(
    (row, index) => ({
      id: `${snapshotId}-r-${index + 1}`,
      organizationId: input.organizationId,
      snapshotId: inserted.id,
      campaignId: input.campaignId,
      sourceWorkbookId: input.sourceWorkbookId,
      sourceTabId: input.sourceTabId,
      sourceTabName: input.sourceTabName,
      sourceRowNumber: row.sourceRowNumber,
      sourceStableKey: row.sourceStableKey,
      recipientFingerprint: row.recipientFingerprint,
      normalizedEmail: row.normalizedEmail,
      assignedBatchNumber: Math.floor(index / 100) + 1,
      createdAt: ts,
      updatedAt: ts,
    }),
  );

  const CHUNK = 500;
  for (let i = 0; i < recipients.length; i += CHUNK) {
    await input.ports.snapshotRecipients.insertMany(recipients.slice(i, i + CHUNK));
  }

  return {
    snapshot: { ...snapshot, id: inserted.id },
    recipients,
    snapshotHash,
    eligibleCount: scan.counts.eligible,
  };
}
