/**
 * CO-MARKETING-REDESIGN-009 — Approval rules.
 * Save Draft is not approval. Approved content/audience are immutable until a new draft.
 */

import type { MarketingCampaignAction, MarketingCampaignStatus } from "@/constants/enterprise-marketing-engine/lifecycle";
import { ENTERPRISE_MARKETING_EXECUTION_ENABLED } from "@/constants/enterprise-marketing-engine/safety";
import { MARKETING_LIVE_PROVIDER_SENDING_DISABLED } from "@/constants/enterprise-marketing-engine/delivery-operations";
import type { MarketingCampaignVersion } from "@/types/enterprise-marketing-campaign";
import { cloneContentDocument } from "@/lib/enterprise-marketing-engine/content-blocks";

export function assertSaveDraftIsNotApproval(payload: {
  action?: string;
  status?: string;
  lifecycleAction?: string;
}): void {
  if (payload.action !== "save") {
    throw new Error("Draft persistence must use action=save");
  }
  if (payload.status === "APPROVED" || payload.lifecycleAction === "APPROVE") {
    throw Object.assign(new Error("Save Draft is not approval"), {
      statusCode: 400,
      code: "SAVE_IS_NOT_APPROVAL",
    });
  }
}

export function freezeMarketingContentVersion<T extends { immutable: boolean; frozenAt?: string | null; frozenReason?: "APPROVED" | "MANUAL_FREEZE" | null }>(
  version: T,
  frozenAt = new Date().toISOString(),
): T {
  return {
    ...version,
    immutable: true,
    frozenAt,
    frozenReason: "APPROVED",
  };
}

export function assertApprovalFreezesContentAndAudience(input: {
  contentFrozen: boolean;
  snapshotFrozen: boolean;
}): void {
  if (!input.contentFrozen) {
    throw Object.assign(new Error("Approval must freeze the content version"), {
      statusCode: 400,
      code: "CONTENT_NOT_FROZEN",
    });
  }
  if (!input.snapshotFrozen) {
    throw Object.assign(new Error("Approval must freeze the audience snapshot"), {
      statusCode: 400,
      code: "SNAPSHOT_NOT_FROZEN",
    });
  }
}

export function assertApprovedContentIsImmutable(input: {
  status: MarketingCampaignStatus;
  versionImmutable: boolean;
}): void {
  if ((input.status === "APPROVED" || input.status === "SCHEDULED") && !input.versionImmutable) {
    throw Object.assign(new Error("Approved content must remain immutable"), {
      statusCode: 400,
      code: "APPROVED_CONTENT_NOT_IMMUTABLE",
    });
  }
}

export function assertCannotMutateFrozenContent(version: { immutable: boolean }): void {
  if (!version.immutable) return;
  throw Object.assign(new Error("Frozen content versions cannot be mutated in place"), {
    statusCode: 400,
    code: "FROZEN_CONTENT_IMMUTABLE",
  });
}

export function mintMarketingReapprovalDraft(
  frozen: MarketingCampaignVersion,
  now = new Date().toISOString(),
): { frozenPreserved: MarketingCampaignVersion; draft: MarketingCampaignVersion; requiresReapproval: true } {
  if (!frozen.immutable) {
    throw Object.assign(new Error("Reapproval drafts are minted from a frozen published version"), {
      statusCode: 400,
      code: "REQUIRES_FROZEN_VERSION",
    });
  }
  return {
    frozenPreserved: { ...frozen },
    draft: {
      ...frozen,
      id: `${frozen.campaignId}-draft-v${frozen.versionNumber + 1}`,
      versionNumber: frozen.versionNumber + 1,
      immutable: false,
      frozenAt: null,
      frozenReason: null,
      content: cloneContentDocument(frozen.content),
      createdAt: now,
      updatedAt: now,
    },
    requiresReapproval: true,
  };
}

export function assertEditApprovedRequiresReapproval(input: {
  status: MarketingCampaignStatus;
  editingContentOrAudience: boolean;
  reapprovalDraftCreated: boolean;
}): void {
  if (!input.editingContentOrAudience) return;
  if (input.status !== "APPROVED" && input.status !== "SCHEDULED") return;
  if (input.reapprovalDraftCreated) return;
  throw Object.assign(
    new Error("Editing approved content or audience creates a new draft that requires reapproval"),
    { statusCode: 400, code: "REQUIRES_REAPPROVAL_DRAFT" },
  );
}

export function assertScheduleRequiresApproval(status: MarketingCampaignStatus): void {
  if (status === "APPROVED" || status === "SCHEDULED") return;
  throw Object.assign(new Error("Scheduling requires approval"), {
    statusCode: 400,
    code: "SCHEDULE_REQUIRES_APPROVAL",
  });
}

export function buildMarketingLaunchBlockers(input: {
  stepBlockers?: string[];
  prePublishBlockingCodes?: string[];
  contentFrozen: boolean;
  snapshotFrozen: boolean;
  extra?: string[];
}): string[] {
  const blockers = [...(input.stepBlockers ?? [])];
  for (const code of input.prePublishBlockingCodes ?? []) {
    if (code) blockers.push(code);
  }
  if (!input.contentFrozen) blockers.push("Content version is not frozen");
  if (!input.snapshotFrozen) blockers.push("Audience snapshot is not frozen");
  for (const extra of input.extra ?? []) {
    if (extra) blockers.push(extra);
  }
  return [...new Set(blockers)];
}

export function assertLaunchBlockersPass(blockers: string[]): void {
  if (blockers.length === 0) return;
  throw Object.assign(new Error(`Launch blocked: ${blockers.join("; ")}`), {
    statusCode: 400,
    code: "LAUNCH_BLOCKERS_PRESENT",
  });
}

export function simulateMarketingTestModeLaunch(input: {
  executionEnabled?: boolean;
  approved: boolean;
  blockers: string[];
  hasRunPermission: boolean;
}): {
  ok: boolean;
  simulated: true;
  actuallySent: false;
  liveProviderSending: false;
  notice: string;
  reason: string | null;
} {
  const executionEnabled = input.executionEnabled ?? ENTERPRISE_MARKETING_EXECUTION_ENABLED;
  let reason: string | null = null;
  if (executionEnabled) reason = "Live execution is not authorised in this programme";
  else if (!input.hasRunPermission) reason = "Requires campaign run permission";
  else if (!input.approved) reason = "Campaign must be approved before launch";
  else if (input.blockers.length) reason = `Launch blocked: ${input.blockers.join("; ")}`;
  return {
    ok: reason == null,
    simulated: true,
    actuallySent: false,
    liveProviderSending: false,
    notice: MARKETING_LIVE_PROVIDER_SENDING_DISABLED,
    reason,
  };
}

export function isMarketingReopenAction(action: MarketingCampaignAction): boolean {
  return action === "REOPEN_DRAFT";
}
