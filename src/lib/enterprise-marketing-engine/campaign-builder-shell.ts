/**
 * CO-MARKETING-REDESIGN-006 — Full-page Campaign Builder shell contracts.
 * Save Draft never publishes or sends. Steps 1–5 cannot send.
 */

import {
  MARKETING_BUILDER_DRAFT_SAVE_CONTRACT,
  MARKETING_BUILDER_SEND_FORBIDDEN_STEP_NUMBERS,
  MARKETING_CAMPAIGN_BUILDER_STEPS,
  MARKETING_PERMISSIONS,
  type MarketingCampaignStatus,
  type MarketingChannel,
} from "@/constants/enterprise-marketing-engine";
import { hasMarketingPermission, type MarketingPermissionActor } from "@/lib/enterprise-marketing-engine/permissions";
import { applyPersonalization } from "@/lib/enterprise-marketing-engine/personalization";
import { MARKETING_PERSONALIZATION_FALLBACKS } from "@/constants/enterprise-marketing-engine/content";
import {
  inspectMarketingPersonalisationUsage,
  mappedPersonalisationTokenNames,
} from "@/lib/enterprise-marketing-engine/personalisation-catalogue";
import type { MarketingColumnMap } from "@/types/enterprise-marketing-durability";
import type { MarketingFilterDefinition } from "@/types/enterprise-marketing-audience";
import type { MarketingPrePublishCheckResult } from "@/types/enterprise-marketing-campaign";
import { hasMarketingUnsubscribeBlock, paragraphTextFromDocument } from "@/lib/enterprise-marketing-engine/visual-editor";

export type MarketingBuilderDraft = {
  name: string;
  internalDescription: string;
  objective: string;
  channel: MarketingChannel;
  ownerUserId: string;
  tags: string[];
  bindingId: string;
  datasetId: string;
  audienceId: string;
  columnMapEmail: string;
  mappingConfirmed: boolean;
  snapshotStatus: "Not frozen" | "Frozen" | "Unavailable";
  filterCount: number;
  exclusionCount: number;
  eligibleCount: number | null;
  senderName: string;
  senderAddress: string;
  subject: string;
  preheader: string;
  templateId: string;
  messageBody: string;
  emailContent?: import("@/types/enterprise-marketing-campaign").MarketingContentDocument;
  personalizationSample: Record<string, string>;
  startAt: string;
  timezone: string;
  batchSize: number;
  intervalMs: number;
  windowStart: string;
  windowEnd: string;
  dailyMax: number;
};

export type MarketingBuilderStepGate =
  | { ok: true }
  | { ok: false; message: string };

export function marketingBuilderStepTitles(): string[] {
  return MARKETING_CAMPAIGN_BUILDER_STEPS.map((step) => step.title);
}

export function isMarketingBuilderSendForbiddenOnStep(stepNumber: number): boolean {
  return (MARKETING_BUILDER_SEND_FORBIDDEN_STEP_NUMBERS as readonly number[]).includes(stepNumber);
}

export function marketingBuilderDraftSavePayload(campaignId: string, draft: MarketingBuilderDraft) {
  return {
    action: MARKETING_BUILDER_DRAFT_SAVE_CONTRACT.apiAction,
    campaignId,
    name: draft.name,
    objective: draft.objective || null,
    internalDescription: draft.internalDescription || null,
    audienceId: draft.audienceId || null,
    channel: draft.channel,
    sender: {
      fromName: draft.senderName,
      fromAddress: draft.senderAddress,
    },
    subject: draft.subject,
    previewText: draft.preheader,
    schedulePlaceholder: {
      enabled: Boolean(draft.startAt),
      startAt: draft.startAt || null,
    },
    routingPlaceholder: {
      mode: "UNCONFIGURED" as const,
      tags: draft.tags,
      ownerUserId: draft.ownerUserId || null,
    },
    batchPolicy: {
      batchSize: draft.batchSize,
      intervalMs: draft.intervalMs,
      dailyMax: draft.dailyMax,
      sendWindowStart: draft.windowStart,
      sendWindowEnd: draft.windowEnd,
      timezone: draft.timezone,
      startAt: draft.startAt || null,
      endAt: null,
    },
    templateId: draft.templateId || null,
  };
}

export function assertMarketingBuilderDraftSaveDoesNotSend(payload: {
  action?: string;
  status?: string;
  lifecycleAction?: string;
}): void {
  if (payload.action !== MARKETING_BUILDER_DRAFT_SAVE_CONTRACT.apiAction) {
    throw new Error("Draft persistence must use action=save");
  }
  if (payload.status !== undefined) {
    throw new Error("Save Draft cannot mutate lifecycle status");
  }
  if (payload.lifecycleAction) {
    throw new Error("Save Draft cannot run a lifecycle action");
  }
}

export function fingerprintMarketingBuilderDraft(draft: MarketingBuilderDraft): string {
  return JSON.stringify(draft);
}

export function isMarketingBuilderDraftDirty(saved: string, current: MarketingBuilderDraft): boolean {
  return saved !== fingerprintMarketingBuilderDraft(current);
}

export function emptyMarketingFilters(): MarketingFilterDefinition {
  return { version: 1, logic: "AND", rules: [] };
}

export function validateMarketingBuilderStep(
  stepNumber: number,
  draft: MarketingBuilderDraft,
): MarketingBuilderStepGate {
  switch (stepNumber) {
    case 1:
      if (!draft.name.trim()) {
        return { ok: false, message: "Campaign name is required before continuing." };
      }
      if (!draft.channel) {
        return { ok: false, message: "Select a channel before continuing." };
      }
      if (draft.channel !== "EMAIL") {
        return {
          ok: false,
          message: "This channel is Not configured. Email remains the operational channel.",
        };
      }
      return { ok: true };
    case 2:
      if (!draft.bindingId) {
        return { ok: false, message: "Select the authorised workbook before continuing." };
      }
      if (!draft.datasetId) {
        return { ok: false, message: "Select a worksheet tab before continuing." };
      }
      if (!draft.columnMapEmail.trim()) {
        return { ok: false, message: "Map the email column before continuing." };
      }
      if (!draft.mappingConfirmed) {
        return { ok: false, message: "Confirm column mapping before continuing." };
      }
      return { ok: true };
    case 3:
      if (!draft.senderName.trim() || !draft.senderAddress.trim()) {
        return { ok: false, message: "Sender name and address are required before continuing." };
      }
      if (draft.channel === "EMAIL" && !draft.subject.trim()) {
        return { ok: false, message: "Subject is required before continuing." };
      }
      if (draft.channel === "EMAIL" && draft.emailContent) {
        if (!hasMarketingUnsubscribeBlock(draft.emailContent)) {
          return {
            ok: false,
            message: "Add an Unsubscribe block before continuing. Footer wording is not sufficient.",
          };
        }
        const body =
          draft.messageBody.trim() || paragraphTextFromDocument(draft.emailContent).trim();
        if (!body) {
          return { ok: false, message: "Message body is required before continuing." };
        }
      } else if (draft.channel === "EMAIL" && !draft.messageBody.trim()) {
        return { ok: false, message: "Message body is required before continuing." };
      }
      if (draft.channel === "WHATSAPP" && !draft.templateId.trim()) {
        return { ok: false, message: "Select an approved WhatsApp template before continuing." };
      }
      return { ok: true };
    case 4:
      return { ok: true };
    case 5:
      if (!draft.timezone.trim()) {
        return { ok: false, message: "Timezone is required before continuing." };
      }
      if (!Number.isFinite(draft.batchSize) || draft.batchSize < 1) {
        return { ok: false, message: "Batch size must be at least 1." };
      }
      if (!Number.isFinite(draft.intervalMs) || draft.intervalMs < 1) {
        return { ok: false, message: "Batch interval is required." };
      }
      return { ok: true };
    case 6:
      return { ok: true };
    default:
      return { ok: false, message: "Unknown builder step." };
  }
}

export function mappedPersonalisationVariables(columnMap: MarketingColumnMap): string[] {
  return mappedPersonalisationTokenNames(columnMap);
}

export function unresolvedPersonalisationTokens(input: {
  subject: string;
  preheader: string;
  messageBody: string;
  mappedVariables: string[];
  content?: MarketingBuilderDraft["emailContent"];
}): string[] {
  const inspection = inspectMarketingPersonalisationUsage({
    subject: input.subject,
    preheader: input.preheader,
    messageBody: input.messageBody,
    content: input.content,
    mappedVariables: input.mappedVariables,
  });
  return [...new Set([...inspection.unsupportedTokens, ...inspection.unresolvedTokens])];
}

export function resolvePersonalisationSamplePreview(input: {
  subject: string;
  messageBody: string;
  sample: Record<string, string>;
}): { subject: string; body: string } {
  try {
    return {
      subject: applyPersonalization(input.subject || "(no subject)", input.sample),
      body: applyPersonalization(input.messageBody || "(no body)", input.sample),
    };
  } catch (err) {
    return {
      subject: input.subject || "(no subject)",
      body: err instanceof Error ? err.message : "Preview unavailable",
    };
  }
}

export function personalisationFallbackEntries() {
  return Object.entries(MARKETING_PERSONALIZATION_FALLBACKS);
}

export type MarketingDeliveryEstimate = {
  firstBatch: string;
  batchCount: string;
  completionEstimate: string;
};

export function estimateMarketingDeliveryPlan(input: {
  startAt: string;
  batchSize: number;
  intervalMs: number;
  dailyMax: number;
  eligibleCount: number | null;
}): MarketingDeliveryEstimate {
  if (input.eligibleCount == null) {
    return {
      firstBatch: input.startAt || "Unavailable",
      batchCount: "Unavailable",
      completionEstimate: "Unavailable",
    };
  }
  const size = Math.max(1, input.batchSize);
  const batches = Math.max(1, Math.ceil(input.eligibleCount / size));
  const firstBatch = input.startAt || "Not scheduled";
  if (!input.startAt) {
    return {
      firstBatch,
      batchCount: String(batches),
      completionEstimate: "Not scheduled",
    };
  }
  const startMs = Date.parse(input.startAt);
  if (!Number.isFinite(startMs)) {
    return {
      firstBatch: "Unavailable",
      batchCount: String(batches),
      completionEstimate: "Unavailable",
    };
  }
  const perDay = Math.max(1, Math.floor(input.dailyMax / size));
  const days = Math.ceil(batches / perDay);
  const completionMs = startMs + (batches - 1) * input.intervalMs;
  const completion = Number.isFinite(completionMs)
    ? new Date(completionMs).toISOString()
    : "Unavailable";
  return {
    firstBatch: new Date(startMs).toISOString(),
    batchCount: `${batches} (${days} day window at daily cap ${input.dailyMax})`,
    completionEstimate: completion,
  };
}

export type MarketingBuilderReview = {
  blockers: string[];
  warnings: string[];
  testStatus: string;
  canApprove: boolean;
  approveReason: string | null;
  canLaunch: boolean;
  launchReason: string | null;
  readySummary: string;
};

export function composeMarketingBuilderReview(input: {
  draft: MarketingBuilderDraft;
  status: MarketingCampaignStatus;
  actor: MarketingPermissionActor;
  executionEnabled: boolean;
  prePublish: MarketingPrePublishCheckResult | null;
}): MarketingBuilderReview {
  const blockers: string[] = [];
  const warnings: string[] = [];
  for (const step of MARKETING_CAMPAIGN_BUILDER_STEPS) {
    if (step.number === 6) continue;
    const gate = validateMarketingBuilderStep(step.number, input.draft);
    if (!gate.ok) blockers.push(`Step ${step.number} ${step.title}: ${gate.message}`);
  }
  if (input.prePublish) {
    for (const check of input.prePublish.checks) {
      if (!check.passed && check.severity === "error") blockers.push(check.message);
      if (!check.passed && check.severity === "warning") warnings.push(check.message);
    }
  } else {
    warnings.push("Pre-publish checks have not been loaded yet.");
  }
  if (input.draft.snapshotStatus !== "Frozen") {
    warnings.push(`Audience snapshot: ${input.draft.snapshotStatus}`);
  }

  const canApprovePermission = hasMarketingPermission(input.actor, MARKETING_PERMISSIONS.CAMPAIGN_APPROVE);
  const canSendPermission = hasMarketingPermission(input.actor, MARKETING_PERMISSIONS.CAMPAIGN_SEND);
  const ready = blockers.length === 0 && (input.prePublish?.readyForApproval ?? false);
  let approveReason: string | null = null;
  if (!canApprovePermission) approveReason = "Requires campaign approve permission";
  else if (input.status !== "READY_FOR_REVIEW") approveReason = "Submit for review before approval";
  else if (!ready) approveReason = "Fix blockers before approval";

  const approved = input.status === "APPROVED" || input.status === "SCHEDULED";
  const launchBlockers = [...new Set(blockers)];
  if (input.draft.snapshotStatus !== "Frozen") {
    launchBlockers.push("Audience snapshot is not frozen");
  }
  let launchReason: string | null = null;
  if (!input.executionEnabled) launchReason = "Live send is disabled in TEST MODE";
  else if (!canSendPermission) launchReason = "Requires campaign send permission";
  else if (!approved) launchReason = "Campaign must be approved before launch";
  else if (launchBlockers.length) launchReason = `Launch blocked: ${launchBlockers.join("; ")}`;

  return {
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
    testStatus: input.executionEnabled ? "Live execution available" : "TEST MODE — simulated only, not run",
    canApprove: approveReason == null && canApprovePermission && ready,
    approveReason,
    canLaunch: launchReason == null,
    launchReason,
    readySummary: ready
      ? "Ready for approval review"
      : `${blockers.length} blocker(s) prevent launch`,
  };
}
