/**
 * CO-MARKETING-REDESIGN-003 — Freeze an approved audience snapshot.
 * Execution must consume this snapshot, never a live Sheet reread.
 * Does not create Contacts or Opportunities.
 */

import { hashMarketingAudienceSnapshot } from "@/lib/enterprise-marketing-engine/snapshot-hash";
import { MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING } from "@/constants/enterprise-marketing-engine/hostinger-smtp";
import { assertMarketingPhase1CampaignAudienceCeiling } from "@/lib/enterprise-marketing-engine/phase1-live-ceiling";
import {
  scanMarketingAudienceEligibility,
  type MarketingEligibilityLookups,
  type MarketingEligibilityScanResult,
} from "@/lib/enterprise-marketing-engine/eligibility-scan";
import {
  isCompleteFreezeWorkingSet,
  rememberCompleteAudienceWorkingSet,
} from "@/lib/enterprise-marketing-engine/audience-working-set";
import {
  assertConfirmedMarketingColumnMap,
  type MarketingConfirmedColumnMapping,
} from "@/lib/enterprise-marketing-engine/column-mapping";
import { emptyFilterDefinition } from "@/lib/enterprise-marketing-engine/audience-filters";
import {
  normalizeAssignedEmailSet,
  readMarketingAudienceSegment,
} from "@/lib/enterprise-marketing-engine/audience-segment";
import { normalizeMarketingLedgerEmail } from "@/lib/enterprise-marketing-engine/durability/identity";
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
  audienceDefinitionId?: string | null;
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
  completeScan?: MarketingEligibilityScanResult | null;
}): Promise<MarketingFrozenAudienceSnapshot> {
  const confirmed = assertConfirmedMarketingColumnMap({
    mapping: input.mapping,
    headers: input.headers,
    channel: input.channel ?? "EMAIL",
  });
  const exclusion = input.exclusion ?? emptyFilterDefinition();
  if (readMarketingAudienceSegment(input.inclusion)) {
    return freezeGovernedSegment(input, confirmed, exclusion);
  }
  const eligibilityRules = input.eligibilityRules ?? {
    requireIdentity: true,
    requireValidEmailIfPresent: true,
    excludeDuplicatesInScan: true,
    excludePreviouslyContacted: false,
  };

  const keyInput = {
    organizationId: input.organizationId,
    bindingId: input.sourceBindingId,
    datasetId: input.sourceTabId,
    columnMap: confirmed.map,
    inclusion: input.inclusion,
    exclusion,
    eligibilityRules,
  };
  let scan =
    input.completeScan && isCompleteFreezeWorkingSet(input.completeScan)
      ? input.completeScan
      : await scanMarketingAudienceEligibility({
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
  const stoppedEarly = scan.scanComplete === false && scan.audienceLimitStatus === "over_limit";
  if (!isCompleteFreezeWorkingSet(scan)) {
    throw Object.assign(
      new Error(
        stoppedEarly
          ? `Approval scan stopped because the audience exceeds ${MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING.toLocaleString("en-US")} recipients. The final eligible count was not calculated.`
          : "Freeze requires a complete approval scan. A capped eligibility preview cannot be frozen.",
      ),
      { statusCode: 409, code: "INCOMPLETE_AUDIENCE_SCAN" },
    );
  }

  assertMarketingPhase1CampaignAudienceCeiling(scan.counts.eligible);
  rememberCompleteAudienceWorkingSet(keyInput, scan);

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
    audienceDefinitionId: input.audienceDefinitionId ?? null,
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
      displayName: row.displayName,
      normalizedMobile: row.normalizedMobile,
      mappedAttributesJson: row.mappedAttributes,
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

async function freezeGovernedSegment(
  input: {
    ports: MarketingDurabilityPorts;
    port: MarketingDataSourcePort;
    organizationId: string;
    campaignId: string;
    campaignVersionId: string;
    audienceDefinitionId?: string | null;
    sourceBindingId: string;
    sourceWorkbookId: string;
    sourceTabId: string;
    sourceTabName: string;
    inclusion: MarketingFilterDefinition;
    eligibilityRules?: MarketingEligibilityRules & { excludePreviouslyContacted?: boolean };
    lookups?: MarketingEligibilityLookups;
    actorUserId?: string | null;
  },
  confirmed: MarketingConfirmedColumnMapping,
  exclusion: MarketingFilterDefinition,
): Promise<MarketingFrozenAudienceSnapshot> {
  const segment = readMarketingAudienceSegment(input.inclusion);
  if (!segment) {
    throw Object.assign(new Error("Governed segment clause is required"), {
      statusCode: 400,
      code: "SEGMENT_REQUIRED",
    });
  }
  const eligibilityRules = input.eligibilityRules ?? {
    requireIdentity: true,
    requireValidEmailIfPresent: true,
    excludeDuplicatesInScan: true,
    excludePreviouslyContacted: false,
  };
  const assignedBefore = normalizeAssignedEmailSet(
    await input.ports.snapshotRecipients.listAssignedEmails({
      organizationId: input.organizationId,
      sourceWorkbookId: input.sourceWorkbookId,
      sourceTabId: input.sourceTabId,
    }),
  );
  let scan: MarketingEligibilityScanResult;
  try {
    scan = await scanMarketingAudienceEligibility({
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
      assignedEmails: assignedBefore,
    });
  } catch (error) {
    throw Object.assign(error instanceof Error ? error : new Error("Segment scan failed"), {
      statusCode: (error as { statusCode?: number })?.statusCode ?? 502,
      code: (error as { code?: string })?.code ?? "SEGMENT_SCAN_FAILED",
    });
  }
  if (
    scan.purpose !== "approval" ||
    scan.scanCapped ||
    scan.segmentAllocation?.complete !== true ||
    scan.segmentAllocation.mode !== "next_unassigned"
  ) {
    throw Object.assign(
      new Error("Segment freeze requires a finished approval scan. A preview or interrupted scan cannot be frozen."),
      { statusCode: 409, code: "INCOMPLETE_AUDIENCE_SCAN" },
    );
  }
  assertMarketingPhase1CampaignAudienceCeiling(scan.counts.eligible);

  return input.ports.allocateSourceSegment(
    {
      organizationId: input.organizationId,
      sourceBindingId: input.sourceBindingId,
      sourceWorkbookId: input.sourceWorkbookId,
      sourceTabId: input.sourceTabId,
    },
    async ({ assignedEmails, persist }) => {
      const overlap = scan.eligibleRecipients.filter((row) =>
        assignedEmails.has(normalizeMarketingLedgerEmail(row.normalizedEmail)),
      );
      if (overlap.length > 0) {
        throw Object.assign(
          new Error(
            "Another frozen segment already assigned one of these recipients. Retry the segment to take the next unassigned recipients.",
          ),
          { statusCode: 409, code: "SEGMENT_ALLOCATION_CONFLICT" },
        );
      }
      const extractedAt = nowIso();
      const filterSnapshot = {
        ...input.inclusion,
        segmentResult: scan.segmentAllocation,
      };
      const snapshotHash = hashMarketingAudienceSnapshot({
        workbookId: input.sourceWorkbookId,
        tabId: input.sourceTabId,
        tabName: input.sourceTabName,
        mapping: confirmed.map,
        inclusion: filterSnapshot,
        exclusion,
        recipients: scan.eligibleRecipients,
      });
      const snapshotId = id("mkt-snap");
      const actor = input.actorUserId ?? null;
      const snapshot: MarketingFrozenAudienceSnapshot["snapshot"] = {
        id: snapshotId,
        organizationId: input.organizationId,
        campaignId: input.campaignId,
        campaignVersionId: input.campaignVersionId,
        audienceDefinitionId: input.audienceDefinitionId ?? null,
        sourceBindingId: input.sourceBindingId,
        sourceWorkbookId: input.sourceWorkbookId,
        sourceTabId: input.sourceTabId,
        sourceTabName: input.sourceTabName,
        extractedAt,
        frozenAt: extractedAt,
        frozenByUserId: actor,
        eligibleCount: scan.counts.eligible,
        estimatedBatchCount: Math.ceil(scan.counts.eligible / 100),
        columnMap: confirmed.map,
        snapshotHash,
        sourceRowCount: scan.counts.scannedRows,
        validEmailCount: scan.counts.validEmails,
        duplicateCount: scan.counts.duplicates,
        invalidCount: scan.counts.invalidEmails,
        suppressedCount: scan.counts.suppressed,
        previouslyContactedCount: scan.counts.previouslyContacted,
        filterSnapshot,
        exclusionSnapshot: exclusion,
        createdByUserId: actor,
        updatedByUserId: actor,
        createdAt: extractedAt,
        updatedAt: extractedAt,
      };
      const recipients: MarketingDurableSnapshotRecipientRecord[] = scan.eligibleRecipients.map(
        (row, index) => ({
          id: `${snapshotId}-r-${index + 1}`,
          organizationId: input.organizationId,
          snapshotId,
          campaignId: input.campaignId,
          sourceWorkbookId: input.sourceWorkbookId,
          sourceTabId: input.sourceTabId,
          sourceTabName: input.sourceTabName,
          sourceRowNumber: row.sourceRowNumber,
          sourceStableKey: row.sourceStableKey,
          recipientFingerprint: row.recipientFingerprint,
          normalizedEmail: row.normalizedEmail,
          displayName: row.displayName,
          normalizedMobile: row.normalizedMobile,
          mappedAttributesJson: row.mappedAttributes,
          assignedBatchNumber: Math.floor(index / 100) + 1,
          createdAt: extractedAt,
          updatedAt: extractedAt,
        }),
      );
      await persist(snapshot, recipients);
      return {
        snapshot,
        recipients,
        snapshotHash,
        eligibleCount: scan.counts.eligible,
      };
    },
  );
}
