/**
 * CO-MARKETING-REDESIGN-005 — Home command-centre cards and registry IA.
 * Visual language is Catalyst One. Do not copy third-party branding.
 */

import type { MarketingCampaignStatus, MarketingChannel } from "./lifecycle";

export const MARKETING_TEST_MODE_BANNER =
  "TEST MODE — live sending is disabled. Controlled dry-run only." as const;

export const MARKETING_HOME_LIFECYCLE_CARDS = [
  { id: "draft", label: "Draft", statuses: ["DRAFT", "PREVIEW"] as const },
  { id: "awaiting_approval", label: "Awaiting approval", statuses: ["READY_FOR_REVIEW"] as const },
  { id: "scheduled", label: "Scheduled", statuses: ["SCHEDULED"] as const },
  { id: "running", label: "Running", statuses: ["RUNNING"] as const },
  { id: "paused", label: "Paused", statuses: ["PAUSED"] as const },
  { id: "completed", label: "Completed", statuses: ["COMPLETED"] as const },
  { id: "failed", label: "Failed", statuses: ["FAILED"] as const },
] as const;

export const MARKETING_HOME_OUTCOME_CARDS = [
  { id: "qualified_responses", label: "Qualified responses" },
  { id: "opportunities_created", label: "Opportunities created" },
  { id: "attributed_pipeline", label: "Attributed pipeline / revenue" },
] as const;

export type MarketingHomeLifecycleCardId = (typeof MARKETING_HOME_LIFECYCLE_CARDS)[number]["id"];
export type MarketingHomeOutcomeCardId = (typeof MARKETING_HOME_OUTCOME_CARDS)[number]["id"];

export const MARKETING_REGISTRY_DATE_PRESETS = ["all", "7d", "30d", "90d"] as const;
export type MarketingRegistryDatePreset = (typeof MARKETING_REGISTRY_DATE_PRESETS)[number];

export const MARKETING_REGISTRY_CHANNELS: readonly (MarketingChannel | "all")[] = [
  "all",
  "EMAIL",
  "WHATSAPP",
  "DIGITAL",
];

export const MARKETING_ATTENTION_STATUSES: readonly MarketingCampaignStatus[] = [
  "READY_FOR_REVIEW",
  "FAILED",
  "PAUSED",
];
