/**
 * CO-MARKETING-MKT-05 — Campaign lifecycle transitions & registry labels.
 * RESUMED is an action (PAUSED → RUNNING), not a durable resting state (ARCH-001).
 */

import type { MarketingCampaignAction, MarketingCampaignStatus } from "./lifecycle";

/** Human-readable registry labels (UI). */
export const MARKETING_CAMPAIGN_STATUS_LABELS: Record<MarketingCampaignStatus, string> = {
  DRAFT: "Draft",
  PREVIEW: "Preview",
  READY_FOR_REVIEW: "In Review",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  RUNNING: "Running",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  STOPPED: "Stopped",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
};

/** Registry filter chips — primary operational set. */
export const MARKETING_CAMPAIGN_REGISTRY_STATUSES = [
  "DRAFT",
  "READY_FOR_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "STOPPED",
  "FAILED",
] as const satisfies readonly MarketingCampaignStatus[];

/**
 * Legal transitions (from → allowed next states).
 * Aligns with CO-MARKETING-ARCH-001 Logical Model §4.2.
 */
export const MARKETING_LEGAL_TRANSITIONS: Record<
  MarketingCampaignStatus,
  readonly MarketingCampaignStatus[]
> = {
  DRAFT: ["PREVIEW", "READY_FOR_REVIEW", "CANCELLED"],
  PREVIEW: ["DRAFT", "READY_FOR_REVIEW", "CANCELLED"],
  READY_FOR_REVIEW: ["DRAFT", "APPROVED", "CANCELLED"],
  APPROVED: ["SCHEDULED", "RUNNING", "DRAFT", "CANCELLED"],
  SCHEDULED: ["RUNNING", "PAUSED", "CANCELLED", "FAILED"],
  RUNNING: ["PAUSED", "COMPLETED", "STOPPED", "FAILED"],
  PAUSED: ["RUNNING", "SCHEDULED", "STOPPED", "CANCELLED", "FAILED"],
  COMPLETED: [],
  STOPPED: [],
  CANCELLED: [],
  FAILED: ["DRAFT", "STOPPED"],
};

/** Action → target status (when the action has a single primary outcome). */
export const MARKETING_ACTION_TARGET_STATUS: Partial<
  Record<MarketingCampaignAction, MarketingCampaignStatus>
> = {
  PREVIEW: "PREVIEW",
  SUBMIT_FOR_REVIEW: "READY_FOR_REVIEW",
  APPROVE: "APPROVED",
  REOPEN_DRAFT: "DRAFT",
  SCHEDULE: "SCHEDULED",
  RUN: "RUNNING",
  PAUSE: "PAUSED",
  RESUME: "RUNNING",
  STOP: "STOPPED",
  COMPLETE: "COMPLETED",
  CANCEL: "CANCELLED",
};

export function isMarketingTransitionAllowed(
  from: MarketingCampaignStatus,
  to: MarketingCampaignStatus,
): boolean {
  if (from === to) return true;
  return MARKETING_LEGAL_TRANSITIONS[from].includes(to);
}

export function assertMarketingTransitionAllowed(
  from: MarketingCampaignStatus,
  to: MarketingCampaignStatus,
): void {
  if (isMarketingTransitionAllowed(from, to)) return;
  throw Object.assign(
    new Error(`Illegal campaign lifecycle transition: ${from} → ${to}`),
    { statusCode: 400, code: "ILLEGAL_LIFECYCLE_TRANSITION" },
  );
}

/** Content / field editing rules by status. */
export function marketingCampaignEditPolicy(status: MarketingCampaignStatus): {
  contentEditable: boolean;
  metadataEditable: boolean;
  readOnly: boolean;
  operationalControlsOnly: boolean;
} {
  switch (status) {
    case "DRAFT":
    case "PREVIEW":
      return {
        contentEditable: true,
        metadataEditable: true,
        readOnly: false,
        operationalControlsOnly: false,
      };
    case "READY_FOR_REVIEW":
      return {
        contentEditable: false,
        metadataEditable: false,
        readOnly: false,
        operationalControlsOnly: false,
      };
    case "APPROVED":
    case "SCHEDULED":
      return {
        contentEditable: false,
        metadataEditable: false,
        readOnly: false,
        operationalControlsOnly: false,
      };
    case "RUNNING":
    case "PAUSED":
      return {
        contentEditable: false,
        metadataEditable: false,
        readOnly: false,
        operationalControlsOnly: true,
      };
    case "COMPLETED":
    case "STOPPED":
    case "CANCELLED":
      return {
        contentEditable: false,
        metadataEditable: false,
        readOnly: true,
        operationalControlsOnly: false,
      };
    case "FAILED":
      return {
        contentEditable: false,
        metadataEditable: false,
        readOnly: false,
        operationalControlsOnly: false,
      };
    default:
      return {
        contentEditable: false,
        metadataEditable: false,
        readOnly: true,
        operationalControlsOnly: false,
      };
  }
}

/** Actions that require CAMPAIGN_APPROVE (Save never includes these). */
export const MARKETING_APPROVAL_GATED_ACTIONS: readonly MarketingCampaignAction[] = [
  "APPROVE",
] as const;

/** Operational actions — no send; state only until execution sprint. */
export const MARKETING_OPERATIONAL_ACTIONS: readonly MarketingCampaignAction[] = [
  "SCHEDULE",
  "RUN",
  "PAUSE",
  "RESUME",
  "STOP",
  "COMPLETE",
] as const;
