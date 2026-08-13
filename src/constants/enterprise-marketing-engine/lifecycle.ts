/**
 * CO-MARKETING-MKT-01 — Campaign lifecycle vocabulary (contracts only).
 * No campaign execution or persistence in this sprint.
 */

export const MARKETING_CAMPAIGN_STATUSES = [
  "DRAFT",
  "PREVIEW",
  "READY_FOR_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "STOPPED",
  "CANCELLED",
  "FAILED",
] as const;

export type MarketingCampaignStatus = (typeof MARKETING_CAMPAIGN_STATUSES)[number];

/** Explicit operator actions — SAVE never implies SEND. */
export const MARKETING_CAMPAIGN_ACTIONS = [
  "SAVE",
  "PREVIEW",
  "SUBMIT_FOR_REVIEW",
  "APPROVE",
  "REOPEN_DRAFT",
  "SCHEDULE",
  "RUN",
  "PAUSE",
  "RESUME",
  "STOP",
  "COMPLETE",
  "CANCEL",
] as const;

export type MarketingCampaignAction = (typeof MARKETING_CAMPAIGN_ACTIONS)[number];

export const MARKETING_CHANNELS = ["EMAIL", "WHATSAPP", "DIGITAL"] as const;
export type MarketingChannel = (typeof MARKETING_CHANNELS)[number];
