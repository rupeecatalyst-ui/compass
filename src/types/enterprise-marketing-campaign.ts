/**
 * CO-MARKETING-MKT-04 / MKT-05 — Campaign / content / asset domain types.
 */

import type {
  MarketingCampaignAction,
  MarketingCampaignStatus,
  MarketingChannel,
} from "@/constants/enterprise-marketing-engine";
import type {
  MarketingAssetCategory,
  MarketingContentBlockType,
} from "@/constants/enterprise-marketing-engine/content";
import type { MarketingBatchPolicy } from "@/types/enterprise-marketing-execution";
import type { MarketingUtmConfig } from "@/lib/enterprise-marketing-engine/utm";

export type { MarketingUtmConfig };

export type MarketingContentBlock = {
  id: string;
  type: MarketingContentBlockType;
  /** Extensible props — renderer ignores unknown keys safely. */
  props: Record<string, unknown>;
};

export type MarketingContentDocument = {
  version: 1;
  blocks: MarketingContentBlock[];
};

export type MarketingSenderIdentityDraft = {
  fromName: string;
  fromAddress: string;
  replyTo?: string | null;
};

/** Schedule intent — startAt syncs into batchPolicy on configure / controlled test. */
export type MarketingSchedulePlaceholder = {
  enabled: boolean;
  /** ISO-8601 start datetime (operator intent). */
  startAt?: string | null;
  notes?: string | null;
};

export type MarketingRoutingPlaceholder = {
  mode: "SINGLE_USER" | "TEAM" | "ROUND_ROBIN" | "USER_POOL" | "RULE_BASED" | "UNCONFIGURED";
  notes?: string | null;
};

export type MarketingNotificationPlaceholder = {
  inApp: boolean;
  email: boolean;
  whatsapp: boolean;
  notes?: string | null;
};

export type MarketingCampaignVersion = {
  id: string;
  campaignId: string;
  versionNumber: number;
  /** Frozen versions must not be mutated. */
  immutable: boolean;
  frozenAt?: string | null;
  frozenReason?: "APPROVED" | "MANUAL_FREEZE" | null;
  subject: string;
  /** Inbox preheader (also called preview text). */
  previewText: string;
  content: MarketingContentDocument;
  disclaimer?: string | null;
  trackingEnabled: boolean;
  /** Editable plain-text fallback — when null, auto-derived from blocks. */
  plainTextOverride?: string | null;
  /** UTM tracking configuration (applied to CTA/links when trackingEnabled). */
  utm?: MarketingUtmConfig | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** CO-MARKETING-MKT-05 — governance actors + timestamps. */
export type MarketingCampaignGovernance = {
  createdByUserId: string | null;
  modifiedByUserId: string | null;
  submittedByUserId: string | null;
  approvedByUserId: string | null;
  scheduledByUserId: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  scheduledAt: string | null;
};

export type MarketingCampaignStateChange = {
  id: string;
  from: MarketingCampaignStatus;
  to: MarketingCampaignStatus;
  action: MarketingCampaignAction;
  actorUserId: string | null;
  at: string;
  note?: string | null;
};

export type MarketingCampaign = {
  id: string;
  organizationId: string;
  name: string;
  objective?: string | null;
  /** Internal operator description — not rendered in customer email. */
  internalDescription?: string | null;
  product?: string | null;
  audienceId?: string | null;
  channel: MarketingChannel;
  sender: MarketingSenderIdentityDraft;
  status: MarketingCampaignStatus;
  currentDraftVersionId: string;
  activePublishedVersionId?: string | null;
  schedulePlaceholder: MarketingSchedulePlaceholder;
  routingPlaceholder: MarketingRoutingPlaceholder;
  notificationPlaceholder: MarketingNotificationPlaceholder;
  /** MKT-06 — batch pacing policy (optional until configured). */
  batchPolicy?: MarketingBatchPolicy | null;
  /** MKT-07 — configured sender identity reference (credentials not on campaign). */
  senderIdentityId?: string | null;
  /** MKT-09 — approved WhatsApp template reference (template-only messaging). */
  whatsappTemplateId?: string | null;
  templateId?: string | null;
  governance: MarketingCampaignGovernance;
  stateHistory: MarketingCampaignStateChange[];
  createdAt: string;
  updatedAt: string;
};

export type MarketingPrePublishCheck = {
  id: string;
  label: string;
  severity: "error" | "warning";
  passed: boolean;
  message: string;
};

export type MarketingPrePublishCheckResult = {
  readyForApproval: boolean;
  checks: MarketingPrePublishCheck[];
  blockingCodes: string[];
};

export type MarketingContentTemplate = {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  channel: MarketingChannel;
  subject: string;
  previewText: string;
  content: MarketingContentDocument;
  disclaimer?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketingReusableBlock = {
  id: string;
  organizationId: string;
  name: string;
  block: MarketingContentBlock;
  createdAt: string;
  updatedAt: string;
};

export type MarketingAsset = {
  id: string;
  organizationId: string;
  title: string;
  mimeType: string;
  category: MarketingAssetCategory;
  tags: string[];
  /** Preview / CDN URL or data URL for foundation. */
  url: string;
  byteSize: number;
  checksum: string;
  archived: boolean;
  /** Active = not archived (MKT-08 vocabulary). */
  active: boolean;
  permissionScope: "ORG_MARKETING";
  /** Email display guidance from asset optimization. */
  suggestedMaxWidth?: number | null;
  optimizationWarnings?: string[];
  createdAt: string;
  updatedAt: string;
};

export type MarketingCampaignPreviewPayload = {
  campaignId: string;
  versionId: string;
  versionNumber: number;
  subject: string;
  /** Preheader / preview text. */
  previewText: string;
  preheader: string;
  sender: MarketingSenderIdentityDraft;
  htmlDesktop: string;
  htmlMobile: string;
  plaintext: string;
  plainTextIsOverride: boolean;
  personalizationSample: Record<string, string>;
  utm: MarketingUtmConfig | null;
  trackingEnabled: boolean;
  notice: string;
};
