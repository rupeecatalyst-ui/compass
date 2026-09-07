/**
 * CO-MARKETING-REDESIGN-001 — Durable operating-record contracts.
 * Framework-independent. Not a prospect database. Live send remains disabled.
 *
 * Google Sheet remains the raw audience SSOT. These records store only the
 * approved operational snapshot needed to execute and audit one campaign.
 */

export const MARKETING_DURABLE_LEDGER_STATUSES = [
  "eligible",
  "queued",
  "scheduled",
  "processing",
  "sent",
  "delivered",
  "deferred",
  "bounced",
  "failed",
  "skipped",
  "suppressed",
  "cancelled",
] as const;

export type MarketingDurableLedgerStatus = (typeof MARKETING_DURABLE_LEDGER_STATUSES)[number];

export const MARKETING_LEASE_PAUSE_STATES = ["ACTIVE", "PAUSED", "STOPPED"] as const;
export type MarketingLeasePauseState = (typeof MARKETING_LEASE_PAUSE_STATES)[number];

export const MARKETING_COLUMN_MAP_REQUIRED_FIELDS = ["email"] as const;

export type MarketingColumnMap = {
  email: string;
  name?: string | null;
  mobile?: string | null;
  location?: string | null;
  productInterest?: string | null;
  consent?: string | null;
  sourceStableKey?: string | null;
  extras?: Record<string, string>;
};

export type MarketingConfirmedColumnMapping = {
  map: MarketingColumnMap;
  confirmed: true;
  confirmedAt: string;
  confirmedByUserId: string | null;
  suggested: MarketingColumnMap;
};

export type MarketingDurableActorStamp = {
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketingDurableCampaignRecord = MarketingDurableActorStamp & {
  id: string;
  organizationId: string;
  name: string;
  status: string;
  currentDraftVersionId: string;
  activePublishedVersionId: string | null;
  approvedSnapshotId: string | null;
  sourceBindingId: string | null;
};

export type MarketingDurableContentVersionRecord = MarketingDurableActorStamp & {
  id: string;
  organizationId: string;
  campaignId: string;
  versionNumber: number;
  immutable: boolean;
  frozenAt: string | null;
};

export type MarketingDurableSheetBindingRecord = MarketingDurableActorStamp & {
  id: string;
  organizationId: string;
  displayName: string;
  spreadsheetId: string;
  driveFileId: string;
  authorised: boolean;
  authRef: string;
  status: string;
};

export type MarketingDurableAudienceDefinitionRecord = MarketingDurableActorStamp & {
  id: string;
  organizationId: string;
  campaignId: string | null;
  bindingId: string;
  sourceTabId: string;
  sourceTabName: string;
  columnMap: MarketingColumnMap;
  name?: string;
  description?: string | null;
  filterDefinition?: unknown;
  exclusionDefinition?: unknown;
  suppressionPolicy?: unknown;
  eligibilityRules?: unknown;
  mappingConfirmed?: boolean;
};

export type MarketingDurableAudienceSnapshotRecord = MarketingDurableActorStamp & {
  id: string;
  organizationId: string;
  campaignId: string;
  campaignVersionId: string;
  sourceBindingId: string;
  sourceWorkbookId: string;
  sourceTabId: string;
  sourceTabName: string;
  extractedAt: string;
  frozenAt: string;
  frozenByUserId: string | null;
  eligibleCount: number;
  estimatedBatchCount: number;
  columnMap: MarketingColumnMap;
  /** SHA-256 of workbook + tab + mapping + filters + frozen recipient identities. */
  snapshotHash?: string;
  sourceRowCount?: number;
  validEmailCount?: number;
  duplicateCount?: number;
  invalidCount?: number;
  suppressedCount?: number;
  previouslyContactedCount?: number;
  filterSnapshot?: unknown;
  exclusionSnapshot?: unknown;
};

export type MarketingDurableSnapshotRecipientRecord = {
  id: string;
  organizationId: string;
  snapshotId: string;
  campaignId: string;
  sourceWorkbookId: string;
  sourceTabId: string;
  sourceTabName: string;
  sourceRowNumber: number | null;
  sourceStableKey: string;
  recipientFingerprint: string;
  normalizedEmail: string;
  assignedBatchNumber: number | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketingDurableDeliveryBatchRecord = MarketingDurableActorStamp & {
  id: string;
  organizationId: string;
  campaignId: string;
  snapshotId: string;
  batchNumber: number;
  scheduledAt: string;
  processedAt: string | null;
  status: string;
  dryRun: boolean;
};

export type MarketingDurableLedgerRecord = MarketingDurableActorStamp & {
  id: string;
  organizationId: string;
  campaignId: string;
  campaignVersionId: string;
  snapshotId: string;
  snapshotRecipientId: string;
  channel: string;
  normalizedEmail: string;
  sourceStableKey: string;
  idempotencyKey: string;
  batchId: string | null;
  batchNumber: number | null;
  status: MarketingDurableLedgerStatus;
  scheduledAt: string | null;
  claimedAt: string | null;
  processedAt: string | null;
  attemptCount: number;
  providerMessageId: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  repliedAt: string | null;
  unsubscribedAt: string | null;
  suppressionReason: string | null;
  linkedContactId: string | null;
  linkedOpportunityId: string | null;
};

export type MarketingDurableExecutionLeaseRecord = MarketingDurableActorStamp & {
  id: string;
  organizationId: string;
  campaignId: string;
  snapshotId: string | null;
  nextRunAt: string | null;
  streamCursor: string | null;
  lastCompletedBatchNumber: number | null;
  pauseState: MarketingLeasePauseState;
  leaseHolder: string | null;
  leaseExpiresAt: string | null;
  /** Optional pacing fields — present on Prisma; memory fixture preserves them. */
  dailyProcessedCount?: number;
  dailyCountResetDate?: string;
  lastError?: string | null;
};

export type MarketingDurableSuppressionRecord = MarketingDurableActorStamp & {
  id: string;
  organizationId: string;
  identityFingerprint: string;
  normalizedEmail: string | null;
  channel: string;
  reason: string;
  consentStatus: string;
};

export type MarketingDurableEngagementEventRecord = {
  id: string;
  organizationId: string;
  campaignId: string;
  ledgerId: string | null;
  eventType: string;
  providerEventId: string;
  idempotencyKey: string | null;
  occurredAt: string;
  createdAt: string;
};

export type MarketingDurableTestSendRecord = {
  id: string;
  organizationId: string;
  campaignId: string;
  campaignVersionId: string;
  testRecipientEmail: string;
  dryRun: boolean;
  actuallySent: boolean;
  idempotencyKey: string;
  providerMessageId: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketingDurableQualificationRecord = MarketingDurableActorStamp & {
  id: string;
  organizationId: string;
  campaignId: string;
  recipientFingerprint: string;
  linkedContactId: string | null;
  linkedOpportunityId: string | null;
  contactCreated: boolean;
  opportunityCreated: boolean;
};

export type MarketingDurableAuditEventRecord = {
  id: string;
  organizationId: string;
  campaignId: string | null;
  actorUserId: string | null;
  kind: string;
  createdAt: string;
  detailJson?: Record<string, unknown>;
};
