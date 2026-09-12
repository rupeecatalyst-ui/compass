/**
 * CO-MARKETING-MKT-04 / MKT-05 — Campaign Builder + Lifecycle governance.
 * SAVE never publishes. APPROVE requires permission. No live delivery.
 */

import {
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  MARKETING_PERMISSIONS,
  type MarketingCampaignAction,
  type MarketingCampaignStatus,
  type MarketingChannel,
} from "@/constants/enterprise-marketing-engine";
import {
  assertMarketingTransitionAllowed,
  marketingCampaignEditPolicy,
  MARKETING_ACTION_TARGET_STATUS,
} from "@/constants/enterprise-marketing-engine/transitions";
import { cloneContentDocument, syncCampaignFormFieldsIntoContent } from "@/lib/enterprise-marketing-engine/content-blocks";
import { paragraphTextFromDocument, sanitizeMarketingContentDocument } from "@/lib/enterprise-marketing-engine/visual-editor";
import {
  renderMarketingEmailHtml,
  renderMarketingEmailPlaintext,
} from "@/lib/enterprise-marketing-engine/email-render";
import {
  applyPersonalization,
  assertSafePersonalizationTokens,
  scanDocumentTokens,
} from "@/lib/enterprise-marketing-engine/personalization";
import { MARKETING_PERSONALIZATION_FALLBACKS } from "@/constants/enterprise-marketing-engine/content";
import {
  projectAllowlistedSampleValues,
  resolvePersonalisationWithFallbacks,
  mappedPersonalisationTokenNames,
  type MarketingPersonalisationSampleRecipient,
} from "@/lib/enterprise-marketing-engine/personalisation-catalogue";
import {
  describeMarketingPreviewSample,
  inspectMarketingPreviewWorkspace,
  pickAudiencePreviewSample,
} from "@/lib/enterprise-marketing-engine/preview-workspace";
import {
  assertMarketingInternalTestRecipient,
  assertMarketingLiveTestSendAllowlistIfLive,
  assertMarketingTestSendConfirmed,
  assertMarketingTestSendDryRunOnly,
  forceMarketingTestSendNotActuallySent,
  listMarketingTestSendHistory,
  recordMarketingTestSendHistory,
} from "@/lib/enterprise-marketing-engine/test-send-safety";
import { MARKETING_TEST_SEND_DRY_RUN_NOTICE } from "@/constants/enterprise-marketing-engine/personalisation";
import { MARKETING_LIVE_PROVIDER_SENDING_DISABLED } from "@/constants/enterprise-marketing-engine/delivery-operations";
import {
  assertMarketingPermission,
  assertCanEditMarketingCampaign,
  type MarketingPermissionActor,
} from "@/lib/enterprise-marketing-engine/permissions";
import {
  assertMarketingOperationPermission,
  permissionForMarketingLifecycleAction,
} from "@/lib/enterprise-marketing-engine/operation-permissions";
import {
  assertApprovalFreezesContentAndAudience,
  assertLaunchBlockersPass,
  assertScheduleRequiresApproval,
  buildMarketingLaunchBlockers,
  simulateMarketingTestModeLaunch,
} from "@/lib/enterprise-marketing-engine/approval-rules";
import {
  assertMarketingDeliveryConfirmation,
  retryEligibleMarketingFailures,
} from "@/lib/enterprise-marketing-engine/delivery-operations";
import { composeMarketingReadinessReview } from "@/lib/enterprise-marketing-engine/readiness-review";
import { unresolvedPersonalisationTokens } from "@/lib/enterprise-marketing-engine/campaign-builder-shell";
import {
  assertReadyForApproval,
  runMarketingPrePublishChecks,
} from "@/lib/enterprise-marketing-engine/pre-publish";
import { assertMarketingSenderEligibleForCampaignApproval } from "@/lib/enterprise-marketing-engine/sender-eligibility";
import { EnterpriseMarketingSafetyError } from "@/lib/enterprise-marketing-engine/safety";
import type {
  MarketingCampaign,
  MarketingCampaignPreviewPayload,
  MarketingCampaignVersion,
  MarketingContentDocument,
  MarketingNotificationPlaceholder,
  MarketingPrePublishCheckResult,
  MarketingRoutingPlaceholder,
  MarketingSchedulePlaceholder,
  MarketingSenderIdentityDraft,
} from "@/types/enterprise-marketing-campaign";
import type { MarketingBatchPolicy } from "@/types/enterprise-marketing-execution";
import { recordMarketingAuditEvent } from "./audit";
import { marketingAudienceDefinitionStore } from "./audience-definition-store";
import { marketingAudienceService } from "./audience.service";
import { marketingCampaignStore } from "./campaign-store";
import { marketingEmailDeliveryService } from "./email-delivery.service";
import { marketingSenderIdentityStore } from "./sender-identity-store";
import { marketingExecutionService } from "./execution.service";
import { marketingTemplateStore, marketingReusableBlockStore } from "./template-store";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  applyMarketingOperationalControl,
  getConfiguredMarketingDurabilityPorts,
} from "@/lib/enterprise-marketing-engine/durability";
import { ensureProductionMarketingDurabilityPorts } from "./durability-runtime";

type Actor = MarketingPermissionActor;

function assertNoSend() {
  if (ENTERPRISE_MARKETING_EXECUTION_ENABLED) {
    throw new EnterpriseMarketingSafetyError("campaign.send");
  }
}

function orgId(actorOrg?: string | null) {
  const trimmed = (actorOrg ?? "").trim();
  if (!trimmed || trimmed === "default") {
    throw Object.assign(new Error("Marketing requires an authenticated organization"), {
      statusCode: 400,
      code: "ORGANIZATION_REQUIRED",
    });
  }
  return trimmed;
}

function loadCampaignMapping(
  actor: Actor,
  audienceId?: string | null,
): { columnMap: import("@/types/enterprise-marketing-durability").MarketingColumnMap | null; mappingConfirmed: boolean } {
  if (!audienceId?.trim()) return { columnMap: null, mappingConfirmed: false };
  const organizationId = (actor.organizationId ?? "").trim();
  const def = marketingAudienceDefinitionStore.getForOrg(audienceId, organizationId);
  if (!def) return { columnMap: null, mappingConfirmed: false };
  return { columnMap: def.columnMap, mappingConfirmed: def.mappingConfirmed };
}

function validateContentTokens(content: MarketingContentDocument, subject: string, previewText: string) {
  assertSafePersonalizationTokens(subject);
  assertSafePersonalizationTokens(previewText);
  for (const b of content.blocks) {
    for (const v of Object.values(b.props)) {
      if (typeof v === "string") assertSafePersonalizationTokens(v);
    }
  }
}

async function touchModified(campaignId: string, organizationId: string, actor: Actor) {
  const c = await marketingCampaignStore.getForOrg(campaignId, organizationId);
  if (!c) return;
  await marketingCampaignStore.updateCampaign(campaignId, organizationId, {
    governance: {
      ...c.governance,
      modifiedByUserId: actor.userId ?? null,
    },
  });
}

function resolveActionTarget(
  action: MarketingCampaignAction,
  from: MarketingCampaignStatus,
  resumeTarget?: "RUNNING" | "SCHEDULED",
): MarketingCampaignStatus {
  if (action === "RESUME") {
    return resumeTarget === "SCHEDULED" ? "SCHEDULED" : "RUNNING";
  }
  if (action === "SAVE") {
    return from;
  }
  const target = MARKETING_ACTION_TARGET_STATUS[action];
  if (!target) {
    throw Object.assign(new Error(`Action ${action} has no lifecycle target`), {
      statusCode: 400,
      code: "INVALID_LIFECYCLE_ACTION",
    });
  }
  return target;
}

export const marketingCampaignService = {
  async list(actor: Actor) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.COMMAND_CENTER);
    return await marketingCampaignStore.list(orgId(actor.organizationId));
  },

  async get(actor: Actor, campaignId: string) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.COMMAND_CENTER);
    const organizationId = orgId(actor.organizationId);
    const campaign = await marketingCampaignStore.getForOrg(campaignId, organizationId);
    if (!campaign) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const draft = await marketingCampaignStore.getVersion(campaign.currentDraftVersionId);
    const versions = await marketingCampaignStore.listVersions(campaignId);
    const editPolicy = marketingCampaignEditPolicy(campaign.status);
    return { campaign, draft, versions, editPolicy };
  },

  async create(
    actor: Actor,
    input: {
      name: string;
      objective?: string | null;
      product?: string | null;
      audienceId?: string | null;
      channel?: MarketingChannel;
      templateId?: string;
    },
  ) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_CREATE);
    const organizationId = orgId(actor.organizationId);
    let content: MarketingContentDocument | undefined;
    let subject: string | undefined;
    let previewText: string | undefined;
    if (input.templateId) {
      const tpl = await marketingTemplateStore.getForOrgDurable(input.templateId, organizationId);
      if (!tpl) {
        throw Object.assign(new Error("Template not found"), { statusCode: 404, code: "NOT_FOUND" });
      }
      content = cloneContentDocument(tpl.content);
      subject = tpl.subject;
      previewText = tpl.previewText;
    }
    if (input.audienceId) {
      const aud = marketingAudienceDefinitionStore.getForOrg(input.audienceId, organizationId);
      if (!aud) {
        throw Object.assign(new Error("Audience not found"), { statusCode: 404, code: "AUDIENCE_NOT_FOUND" });
      }
    }
    const created = await marketingCampaignStore.create({
      organizationId,
      name: input.name,
      objective: input.objective,
      product: input.product,
      audienceId: input.audienceId,
      channel: input.channel,
      content,
      subject,
      previewText,
      createdByUserId: actor.userId ?? null,
    });
    if (input.templateId) {
      await marketingCampaignStore.updateCampaign(created.campaign.id, organizationId, {
        templateId: input.templateId,
      });
      marketingTemplateStore.markUsed(input.templateId, organizationId);
    }
    recordMarketingAuditEvent({
      kind: "campaign.create",
      actorUserId: actor.userId ?? null,
      organizationId,
      action: "create",
      objectType: "campaign",
      objectId: created.campaign.id,
      campaignId: created.campaign.id,
      previousState: null,
      resultingState: "DRAFT",
      detail: { campaignId: created.campaign.id },
    });
    return await this.get(actor, created.campaign.id);
  },

  /**
   * Persist draft content/metadata only.
   * Never transitions to APPROVED / SCHEDULED / RUNNING / etc.
   */
  async save(
    actor: Actor,
    campaignId: string,
    input: {
      name?: string;
      objective?: string | null;
      internalDescription?: string | null;
      product?: string | null;
      audienceId?: string | null;
      channel?: MarketingChannel;
      sender?: MarketingSenderIdentityDraft;
      schedulePlaceholder?: MarketingSchedulePlaceholder;
      routingPlaceholder?: MarketingRoutingPlaceholder;
      notificationPlaceholder?: MarketingNotificationPlaceholder;
      batchPolicy?: MarketingBatchPolicy | null;
      senderIdentityId?: string | null;
      whatsappTemplateId?: string | null;
      templateId?: string | null;
      subject?: string;
      previewText?: string;
      content?: MarketingContentDocument;
      disclaimer?: string | null;
      trackingEnabled?: boolean;
      plainTextOverride?: string | null;
      utm?: import("@/lib/enterprise-marketing-engine/utm").MarketingUtmConfig | null;
      ctaLabel?: string | null;
      ctaUrl?: string | null;
    },
  ) {
    assertNoSend();
    const organizationId = orgId(actor.organizationId);
    let existing = await marketingCampaignStore.getForOrg(campaignId, organizationId);
    if (!existing) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    assertCanEditMarketingCampaign(actor, existing);

    const wantsContent =
      input.subject !== undefined ||
      input.previewText !== undefined ||
      input.content !== undefined ||
      input.disclaimer !== undefined ||
      input.trackingEnabled !== undefined ||
      input.plainTextOverride !== undefined ||
      input.utm !== undefined ||
      input.ctaLabel !== undefined ||
      input.ctaUrl !== undefined;
    const wantsAudience = input.audienceId !== undefined;
    if (
      (existing.status === "APPROVED" || existing.status === "SCHEDULED") &&
      (wantsContent || wantsAudience)
    ) {
      await this.reopenApprovedAsDraft(actor, campaignId);
      existing = await marketingCampaignStore.getForOrg(campaignId, organizationId);
      if (!existing) {
        throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
      }
    }

    const policy = marketingCampaignEditPolicy(existing.status);
    if (policy.readOnly) {
      throw Object.assign(new Error(`Campaign is read-only in status ${existing.status}`), {
        statusCode: 400,
        code: "CAMPAIGN_READ_ONLY",
      });
    }
    if (policy.operationalControlsOnly) {
      throw Object.assign(
        new Error(`Content edits blocked while ${existing.status} — use operational controls only`),
        { statusCode: 400, code: "OPERATIONAL_CONTROLS_ONLY" },
      );
    }

    if (wantsContent && !policy.contentEditable) {
      throw Object.assign(
        new Error(`Content is locked in status ${existing.status}. Withdraw to Draft or clone.`),
        { statusCode: 400, code: "CONTENT_LOCKED" },
      );
    }

    if (!policy.metadataEditable && !policy.contentEditable) {
      // READY_FOR_REVIEW / APPROVED — block metadata edits too
      const wantsMeta =
        input.name !== undefined ||
        input.objective !== undefined ||
        input.internalDescription !== undefined ||
        input.product !== undefined ||
        input.audienceId !== undefined ||
        input.channel !== undefined ||
        input.sender !== undefined ||
        input.schedulePlaceholder !== undefined ||
        input.routingPlaceholder !== undefined ||
        input.notificationPlaceholder !== undefined ||
        input.batchPolicy !== undefined ||
        input.senderIdentityId !== undefined ||
        input.whatsappTemplateId !== undefined ||
        input.templateId !== undefined;
      if (wantsMeta) {
        throw Object.assign(
          new Error(`Campaign metadata locked in status ${existing.status}`),
          { statusCode: 400, code: "METADATA_LOCKED" },
        );
      }
    }

    if (input.content || input.subject || input.previewText) {
      const draft = await marketingCampaignStore.getVersion(existing.currentDraftVersionId);
      const subject = input.subject ?? draft?.subject ?? "";
      const previewText = input.previewText ?? draft?.previewText ?? "";
      const content = input.content
        ? sanitizeMarketingContentDocument(input.content)
        : draft?.content;
      if (content) validateContentTokens(content, subject, previewText);
    }

    const campaignPatch: Parameters<typeof marketingCampaignStore.updateCampaign>[2] = {};
    if (input.name !== undefined) campaignPatch.name = input.name;
    if (input.objective !== undefined) campaignPatch.objective = input.objective;
    if (input.internalDescription !== undefined) {
      campaignPatch.internalDescription = input.internalDescription;
    }
    if (input.product !== undefined) campaignPatch.product = input.product;
    if (input.audienceId !== undefined) campaignPatch.audienceId = input.audienceId;
    if (input.channel !== undefined) campaignPatch.channel = input.channel;
    if (input.sender !== undefined) campaignPatch.sender = input.sender;
    if (input.schedulePlaceholder !== undefined) {
      campaignPatch.schedulePlaceholder = input.schedulePlaceholder;
    }
    if (input.routingPlaceholder !== undefined) {
      campaignPatch.routingPlaceholder = input.routingPlaceholder;
    }
    if (input.notificationPlaceholder !== undefined) {
      campaignPatch.notificationPlaceholder = input.notificationPlaceholder;
    }
    if (input.batchPolicy !== undefined) {
      campaignPatch.batchPolicy = input.batchPolicy;
    }
    if (input.senderIdentityId !== undefined) {
      campaignPatch.senderIdentityId = input.senderIdentityId;
    }
    if (input.whatsappTemplateId !== undefined) {
      campaignPatch.whatsappTemplateId = input.whatsappTemplateId;
    }
    if (input.templateId !== undefined) {
      campaignPatch.templateId = input.templateId;
      if (input.templateId) marketingTemplateStore.markUsed(input.templateId, organizationId);
    }
    if (Object.keys(campaignPatch).length) {
      await marketingCampaignStore.updateCampaign(campaignId, organizationId, campaignPatch);
    }

    if (wantsContent) {
      const draftBefore = await marketingCampaignStore.getVersion(existing.currentDraftVersionId);
      const versionPatch: Parameters<typeof marketingCampaignStore.updateDraftVersion>[2] = {};
      if (input.subject !== undefined) versionPatch.subject = input.subject;
      if (input.previewText !== undefined) versionPatch.previewText = input.previewText;
      if (input.disclaimer !== undefined) versionPatch.disclaimer = input.disclaimer;
      if (input.trackingEnabled !== undefined) versionPatch.trackingEnabled = input.trackingEnabled;
      if (input.plainTextOverride !== undefined) {
        versionPatch.plainTextOverride = input.plainTextOverride;
      }
      if (input.utm !== undefined) versionPatch.utm = input.utm;
      if (input.ctaLabel !== undefined) versionPatch.ctaLabel = input.ctaLabel;
      if (input.ctaUrl !== undefined) versionPatch.ctaUrl = input.ctaUrl;

      const baseContent = input.content
        ? sanitizeMarketingContentDocument(input.content)
        : draftBefore?.content ?? null;
      if (baseContent) {
        versionPatch.content = syncCampaignFormFieldsIntoContent(baseContent, {
          ctaLabel:
            input.ctaLabel !== undefined ? input.ctaLabel : draftBefore?.ctaLabel ?? null,
          ctaUrl: input.ctaUrl !== undefined ? input.ctaUrl : draftBefore?.ctaUrl ?? null,
          disclaimer:
            input.disclaimer !== undefined ? input.disclaimer : draftBefore?.disclaimer ?? null,
        });
      }

      await marketingCampaignStore.updateDraftVersion(campaignId, organizationId, versionPatch);
    }

    touchModified(campaignId, organizationId, actor);
    recordMarketingAuditEvent({
      kind: "campaign.save",
      actorUserId: actor.userId ?? null,
      organizationId,
      action: "save",
      objectType: "campaign",
      objectId: campaignId,
      campaignId,
      versionId: existing.currentDraftVersionId,
      previousState: existing.status,
      resultingState: existing.status,
      detail: { campaignId, note: "SAVE does not publish" },
    });
    return await this.get(actor, campaignId);
  },

  async prePublishChecks(actor: Actor, campaignId: string): Promise<MarketingPrePublishCheckResult> {
    assertNoSend();
    const { campaign, draft } = await this.get(actor, campaignId);
    if (!draft) {
      throw Object.assign(new Error("Draft missing"), { statusCode: 500, code: "VERSION_MISSING" });
    }
    const mapping = loadCampaignMapping(actor, campaign.audienceId);
    return runMarketingPrePublishChecks({
      campaign,
      version: draft,
      columnMap: mapping.columnMap,
      mappingConfirmed: mapping.mappingConfirmed,
    });
  },

  /**
   * Explicit lifecycle action. SAVE is not a publish path.
   * APPROVE requires CAMPAIGN_APPROVE. No provider send.
   */
    async transition(
    actor: Actor,
    campaignId: string,
    action: MarketingCampaignAction,
    opts?: {
      resumeTarget?: "RUNNING" | "SCHEDULED";
      note?: string;
      confirmed?: boolean;
      confirmationPhrase?: string;
    },
  ) {
    assertNoSend();
    if (action === "SAVE") {
      throw Object.assign(new Error("Use save() for persistence — SAVE is not a lifecycle publish action"), {
        statusCode: 400,
        code: "USE_SAVE_ENDPOINT",
      });
    }

    const organizationId = orgId(actor.organizationId);
    const existing = await marketingCampaignStore.getForOrg(campaignId, organizationId);
    if (!existing) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }

    assertMarketingPermission(actor, permissionForMarketingLifecycleAction(action));
    if (action === "STOP") {
      assertMarketingDeliveryConfirmation({
        action: "STOP",
        confirmed: opts?.confirmed,
        confirmationPhrase: opts?.confirmationPhrase,
      });
    }

    // SEND-capable actions remain state-only — never call providers
    if (action === "RUN" || action === "SCHEDULE") {
      if (ENTERPRISE_MARKETING_EXECUTION_ENABLED) {
        throw new EnterpriseMarketingSafetyError("campaign.execution");
      }
    }

    const from = existing.status;
    const to = resolveActionTarget(action, from, opts?.resumeTarget);
    assertMarketingTransitionAllowed(from, to);

    const draft = await marketingCampaignStore.getVersion(existing.currentDraftVersionId);
    if (!draft) {
      throw Object.assign(new Error("Draft missing"), { statusCode: 500, code: "VERSION_MISSING" });
    }

    if (action === "APPROVE") {
      const linkedSender = existing.senderIdentityId
        ? marketingSenderIdentityStore.get(existing.senderIdentityId, organizationId)
        : null;
      assertMarketingSenderEligibleForCampaignApproval({
        identity: linkedSender,
        senderIdentityId: existing.senderIdentityId,
        productionCapable: ENTERPRISE_MARKETING_EXECUTION_ENABLED,
      });
      const mapping = loadCampaignMapping(actor, existing.audienceId);
      const checks = runMarketingPrePublishChecks({
        campaign: existing,
        version: draft,
        columnMap: mapping.columnMap,
        mappingConfirmed: mapping.mappingConfirmed,
      });
      assertReadyForApproval(checks);
      const frozen = await marketingCampaignStore.freezeVersion(draft.id, "APPROVED");
      const durabilityPorts = getConfiguredMarketingDurabilityPorts();
      let snapshotFrozen = !durabilityPorts;
      if (durabilityPorts && existing.audienceId) {
        await marketingAudienceService.freezeForCampaign(
          { userId: actor.userId, organizationId },
          {
            audienceId: existing.audienceId,
            campaignId,
            campaignVersionId: frozen.id,
            channel: existing.channel,
          },
        );
        const snaps = await durabilityPorts.snapshots.listByCampaign(organizationId, campaignId);
        snapshotFrozen = snaps.some((row) => Boolean(row.frozenAt));
      }
      assertApprovalFreezesContentAndAudience({
        contentFrozen: Boolean(frozen.immutable && frozen.frozenAt),
        snapshotFrozen,
      });
      await marketingCampaignStore.updateCampaign(campaignId, organizationId, {
        activePublishedVersionId: frozen.id,
        governance: {
          ...existing.governance,
          approvedByUserId: actor.userId ?? null,
          approvedAt: new Date().toISOString(),
          modifiedByUserId: actor.userId ?? null,
        },
      });
    }

    if (action === "SUBMIT_FOR_REVIEW") {
      await marketingCampaignStore.updateCampaign(campaignId, organizationId, {
        governance: {
          ...existing.governance,
          submittedByUserId: actor.userId ?? null,
          submittedAt: new Date().toISOString(),
          modifiedByUserId: actor.userId ?? null,
        },
      });
    }

    if (action === "SCHEDULE") {
      assertScheduleRequiresApproval(from);
      await marketingCampaignStore.updateCampaign(campaignId, organizationId, {
        governance: {
          ...existing.governance,
          scheduledByUserId: actor.userId ?? null,
          scheduledAt: new Date().toISOString(),
          modifiedByUserId: actor.userId ?? null,
        },
      });
    }

    if (action === "RUN") {
      const mapping = loadCampaignMapping(actor, existing.audienceId);
      const checks = runMarketingPrePublishChecks({
        campaign: existing,
        version: draft,
        columnMap: mapping.columnMap,
        mappingConfirmed: mapping.mappingConfirmed,
      });
      const ports = getConfiguredMarketingDurabilityPorts();
      let snapshotFrozen = !ports;
      if (ports) {
        const snaps = await ports.snapshots.listByCampaign(organizationId, campaignId);
        snapshotFrozen = snaps.some((row) => Boolean(row.frozenAt));
      }
      assertLaunchBlockersPass(
        buildMarketingLaunchBlockers({
          prePublishBlockingCodes: checks.blockingCodes,
          contentFrozen: Boolean(draft.immutable && draft.frozenAt),
          snapshotFrozen,
        }),
      );
    }

    if (action === "REOPEN_DRAFT") {
      if (draft.immutable) {
        await marketingCampaignStore.updateDraftVersion(campaignId, organizationId, {});
      }
      await marketingCampaignStore.updateCampaign(campaignId, organizationId, {
        governance: {
          ...existing.governance,
          approvedByUserId: null,
          approvedAt: null,
          scheduledByUserId: null,
          scheduledAt: null,
          modifiedByUserId: actor.userId ?? null,
        },
      });
    }

    if (action === "PREVIEW" || to === "DRAFT") {
      await touchModified(campaignId, organizationId, actor);
    }

    // APPROVED → DRAFT: reopen for new version cycle (content remains frozen until edited)
    if (from === "APPROVED" && to === "DRAFT") {
      const reopened = await marketingCampaignStore.getForOrg(campaignId, organizationId);
      if (reopened) {
        await marketingCampaignStore.updateCampaign(campaignId, organizationId, {
          governance: {
            ...reopened.governance,
            modifiedByUserId: actor.userId ?? null,
          },
        });
      }
    }

    await marketingCampaignStore.recordStateChange(campaignId, organizationId, {
      from,
      to,
      action,
      actorUserId: actor.userId ?? null,
      note: opts?.note ?? null,
    });

    const auditKind =
      action === "APPROVE"
        ? "campaign.approve"
        : action === "SUBMIT_FOR_REVIEW"
          ? "campaign.submit_for_review"
          : action === "SCHEDULE"
            ? "campaign.schedule"
            : action === "RUN"
              ? "campaign.run"
              : action === "PAUSE"
                ? "campaign.pause"
                : action === "RESUME"
                  ? "campaign.resume"
                  : action === "STOP"
                    ? "campaign.stop"
                    : action === "COMPLETE"
                      ? "campaign.complete"
                      : action === "CANCEL"
                        ? "campaign.cancel"
                        : "campaign.transition";

    recordMarketingAuditEvent({
      kind: auditKind,
      actorUserId: actor.userId ?? null,
      organizationId,
      action,
      objectType: "campaign",
      objectId: campaignId,
      campaignId,
      versionId: draft.id,
      previousState: from,
      resultingState: to,
      reason: opts?.note ?? null,
      detail: {
        campaignId,
        action,
        from,
        to,
        delivery: "none",
        notice: "Lifecycle state only — no provider send in MKT-05",
      },
    });

    if (action === "PAUSE" || action === "STOP" || action === "CANCEL" || action === "RESUME") {
      const ports = isEnterprisePersistencePrisma()
        ? ensureProductionMarketingDurabilityPorts()
        : getConfiguredMarketingDurabilityPorts();
      if (ports) {
        await applyMarketingOperationalControl({
          ports,
          organizationId,
          campaignId,
          fromStatus: from,
          action,
          actorUserId: actor.userId ?? null,
        });
      } else if (action === "PAUSE") {
        marketingExecutionService.onPause(campaignId);
      } else if (action === "STOP") {
        marketingExecutionService.onStop(campaignId);
      } else if (action === "CANCEL") {
        marketingExecutionService.onCancel(campaignId);
      } else {
        marketingExecutionService.onResume(campaignId);
      }
    }
    if (action === "SCHEDULE" || action === "RUN") {
      await marketingExecutionService.initializeFromTransition(campaignId, organizationId);
    }

    return await this.get(actor, campaignId);
  },

  async clone(actor: Actor, campaignId: string, name?: string) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_CREATE);
    const organizationId = orgId(actor.organizationId);
    const created = await marketingCampaignStore.cloneCampaign(
      campaignId,
      organizationId,
      name,
      actor.userId ?? null,
    );
    recordMarketingAuditEvent({
      kind: "campaign.clone",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { from: campaignId, to: created.campaign.id },
    });
    return await this.get(actor, created.campaign.id);
  },

  async saveAsTemplate(actor: Actor, campaignId: string, templateName: string) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.TEMPLATE_MANAGE);
    const organizationId = orgId(actor.organizationId);
    const { campaign, draft } = await this.get(actor, campaignId);
    if (!draft) {
      throw Object.assign(new Error("Draft missing"), { statusCode: 500, code: "VERSION_MISSING" });
    }
    const template = await marketingTemplateStore.saveDurable({
      organizationId,
      name: templateName,
      channel: campaign.channel,
      subject: draft.subject,
      previewText: draft.previewText,
      content: draft.content,
      disclaimer: draft.disclaimer,
      category: "organisation",
      status: "DRAFT",
      origin: "organisation",
    });
    recordMarketingAuditEvent({
      kind: "campaign.save_template",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { campaignId, templateId: template.id },
    });
    return template;
  },

  async listTemplates(actor: Actor) {
    return marketingTemplateStore.listDurable(orgId(actor.organizationId));
  },

  saveReusableBlock(
    actor: Actor,
    input: { name: string; block: MarketingCampaignVersion["content"]["blocks"][number] },
  ) {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_CREATE);
    return marketingReusableBlockStore.save({
      organizationId: orgId(actor.organizationId),
      name: input.name,
      block: input.block,
    });
  },

  listReusableBlocks(actor: Actor) {
    return marketingReusableBlockStore.list(orgId(actor.organizationId));
  },

  async preview(
    actor: Actor,
    campaignId: string,
    personalization?: Record<string, string>,
    opts?: { sampleRecipientId?: string | null },
  ): Promise<MarketingCampaignPreviewPayload> {
    assertNoSend();
    const { campaign, draft } = await this.get(actor, campaignId);
    if (!draft) {
      throw Object.assign(new Error("Draft missing"), { statusCode: 500, code: "VERSION_MISSING" });
    }

    let audienceSamples: MarketingPersonalisationSampleRecipient[] = [];
    if (campaign.audienceId) {
      try {
        const preview = await marketingAudienceService.previewSaved(actor, campaign.audienceId);
        audienceSamples = preview.sampleRecipients ?? [];
      } catch {
        audienceSamples = [];
      }
    }
    const picked = pickAudiencePreviewSample(audienceSamples, opts?.sampleRecipientId);
    const described = describeMarketingPreviewSample({
      sample: picked,
      senderName: campaign.sender.fromName || MARKETING_PERSONALIZATION_FALLBACKS.senderName,
    });
    const sample = resolvePersonalisationWithFallbacks({
      ...described.values,
      ...projectAllowlistedSampleValues({ extras: personalization ?? {} }),
      ...(personalization ?? {}),
      senderName: campaign.sender.fromName || described.values.senderName,
    });

    validateContentTokens(draft.content, draft.subject, draft.previewText);
    if (draft.plainTextOverride) {
      assertSafePersonalizationTokens(draft.plainTextOverride);
    }
    const tokens = scanDocumentTokens(draft.content);

    if (campaign.status === "DRAFT") {
      try {
        await this.transition(actor, campaignId, "PREVIEW", { note: "Opened preview" });
      } catch {
        // soft
      }
    }

    recordMarketingAuditEvent({
      kind: "campaign.preview",
      actorUserId: actor.userId ?? null,
      organizationId: orgId(actor.organizationId),
      detail: { campaignId, tokens, delivery: "none", sampleSource: described.source },
    });

    const renderArgs = {
      content: draft.content,
      subject: draft.subject,
      previewText: draft.previewText,
      personalization: sample,
      trackingEnabled: draft.trackingEnabled,
      utm: draft.utm ?? null,
    };
    const htmlDesktop = renderMarketingEmailHtml({ ...renderArgs, mode: "desktop" });
    const htmlMobile = renderMarketingEmailHtml({ ...renderArgs, mode: "mobile" });
    const inspection = inspectMarketingPreviewWorkspace({
      content: draft.content,
      htmlDesktop,
      htmlMobile,
    });

    return {
      campaignId: campaign.id,
      versionId: draft.id,
      versionNumber: draft.versionNumber,
      subject: applyPersonalization(draft.subject, sample),
      previewText: applyPersonalization(draft.previewText, sample),
      preheader: applyPersonalization(draft.previewText, sample),
      sender: campaign.sender,
      htmlDesktop,
      htmlMobile,
      plaintext: renderMarketingEmailPlaintext({
        content: draft.content,
        personalization: sample,
        plainTextOverride: draft.plainTextOverride,
        trackingEnabled: draft.trackingEnabled,
        utm: draft.utm ?? null,
      }),
      plainTextIsOverride: Boolean(draft.plainTextOverride?.trim()),
      personalizationSample: sample,
      sampleRecipientAvailable: described.available,
      sampleRecipientLabel: described.label,
      sampleSource: described.source,
      linkInventory: inspection.linkInventory,
      missingImageWarnings: inspection.missingImageWarnings,
      unsubscribeVerified: inspection.unsubscribeVerified,
      utm: draft.utm ?? null,
      trackingEnabled: draft.trackingEnabled,
      notice: described.available
        ? `${described.notice} Live preview does not send. SAVE never publishes.`
        : `${described.notice} Preview does not send. SAVE never publishes.`,
    };
  },

  /**
   * Test send — renders via the same path as Preview, then hands the payload to the
   * existing Marketing email delivery port (dry-run unless live adapter is authorised).
   * Separate from production Launch / run_test_batch.
   */
  async testSend(
    actor: Actor,
    campaignId: string,
    input: {
      recipientEmail: string;
      personalization?: Record<string, string>;
      confirmed?: boolean;
      confirmationPhrase?: string;
      sampleRecipientId?: string | null;
    },
  ) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_CREATE);
    assertMarketingTestSendConfirmed({
      confirmed: input.confirmed,
      confirmationPhrase: input.confirmationPhrase,
    });
    const recipientEmail = assertMarketingLiveTestSendAllowlistIfLive(
      assertMarketingInternalTestRecipient(input.recipientEmail ?? ""),
    );

    const preview = await this.preview(actor, campaignId, input.personalization, {
      sampleRecipientId: input.sampleRecipientId,
    });
    const { campaign, draft } = await this.get(actor, campaignId);
    if (!draft) {
      throw Object.assign(new Error("Draft missing"), { statusCode: 500, code: "VERSION_MISSING" });
    }

    const organizationId = orgId(actor.organizationId);
    const batchId = `test-send-${Date.now()}`;
    const idempotencyKey = `mkt-test:${campaignId}:${recipientEmail}:${batchId}`;

    const delivery = await marketingEmailDeliveryService.deliver({
      idempotencyKey,
      organizationId,
      campaignId,
      campaignVersionId: draft.id,
      batchId,
      recipientFingerprint: `test:${recipientEmail}`,
      recipientEmail,
      sender: {
        senderIdentityId: campaign.senderIdentityId || "inline",
        displayName: campaign.sender.fromName || preview.sender.fromName,
        fromAddress: campaign.sender.fromAddress || preview.sender.fromAddress,
        replyTo: campaign.sender.replyTo ?? null,
      },
      subject: preview.subject,
      htmlBody: preview.htmlDesktop,
      textBody: preview.plaintext,
      assetRefs: [],
      tracking: {
        enabled: draft.trackingEnabled,
        campaignId,
        batchId,
        campaignVersionId: draft.id,
        recipientFingerprint: `test:${recipientEmail}`,
      },
    });

    assertMarketingTestSendDryRunOnly({ dryRun: delivery.dryRun });
    const actuallySent = forceMarketingTestSendNotActuallySent();
    const failureReason =
      delivery.errorMessage ??
      (delivery.outcome !== "SENT" && delivery.outcome !== "ACCEPTED" ? delivery.outcome : null) ??
      null;

    const history = recordMarketingTestSendHistory({
      id: `hist-${idempotencyKey}`,
      campaignId,
      campaignVersionId: draft.id,
      campaignVersionNumber: draft.versionNumber,
      requesterUserId: actor.userId ?? null,
      recipientEmail,
      timestamp: new Date().toISOString(),
      adapterResult: `${delivery.dryRun ? "dry_run" : "provider"}:${delivery.outcome}`,
      failureReason,
    });

    const ports = getConfiguredMarketingDurabilityPorts();
    if (ports) {
      await ports.testSends.record({
        id: history.id,
        organizationId,
        campaignId,
        campaignVersionId: draft.id,
        testRecipientEmail: recipientEmail,
        dryRun: true,
        actuallySent: false,
        idempotencyKey,
        providerMessageId: delivery.providerMessageId ?? null,
        createdByUserId: actor.userId ?? null,
        createdAt: history.timestamp,
        updatedAt: history.timestamp,
      });
    }

    recordMarketingAuditEvent({
      kind: "campaign.test_send",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: {
        campaignId,
        outcome: delivery.outcome,
        dryRun: true,
        actuallySent,
        delivery: "dry_run",
        notice: MARKETING_TEST_SEND_DRY_RUN_NOTICE,
      },
    });

    return {
      preview,
      delivery: { ...delivery, dryRun: true as const },
      actuallySent,
      history,
      notice: MARKETING_TEST_SEND_DRY_RUN_NOTICE,
    };
  },

  listTestHistory(actor: Actor, campaignId: string) {
    assertNoSend();
    orgId(actor.organizationId);
    return listMarketingTestSendHistory(campaignId);
  },

  /**
   * Create a new editable draft from a historical frozen version.
   * Never mutates the frozen / published version used by a running campaign.
   */
  async restoreVersionAsDraft(actor: Actor, campaignId: string, versionId: string) {
    assertNoSend();
    const organizationId = orgId(actor.organizationId);
    const existing = await marketingCampaignStore.getForOrg(campaignId, organizationId);
    if (!existing) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    assertCanEditMarketingCampaign(actor, existing);
    const policy = marketingCampaignEditPolicy(existing.status);
    if (policy.operationalControlsOnly || policy.readOnly) {
      throw Object.assign(
        new Error(`Cannot restore draft while campaign is ${existing.status}`),
        { statusCode: 400, code: "RESTORE_BLOCKED" },
      );
    }
    const source = await marketingCampaignStore.getVersion(versionId);
    if (!source || source.campaignId !== campaignId) {
      throw Object.assign(new Error("Version not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    await marketingCampaignStore.updateDraftVersion(campaignId, organizationId, {
      subject: source.subject,
      previewText: source.previewText,
      content: cloneContentDocument(source.content),
      disclaimer: source.disclaimer,
      trackingEnabled: source.trackingEnabled,
      plainTextOverride: source.plainTextOverride ?? null,
      utm: source.utm ?? null,
      ctaLabel: source.ctaLabel,
      ctaUrl: source.ctaUrl,
    });
    // If current draft was frozen (active published), mint already happened above.
    // Force another mint if current draft is still the published frozen id:
    const after = await marketingCampaignStore.getForOrg(campaignId, organizationId);
    if (!after) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const draft = await marketingCampaignStore.getVersion(after.currentDraftVersionId);
    if (draft?.immutable) {
      await marketingCampaignStore.updateDraftVersion(campaignId, organizationId, {
        subject: source.subject,
      });
    }
    await touchModified(campaignId, organizationId, actor);
    recordMarketingAuditEvent({
      kind: "campaign.save",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: {
        campaignId,
        note: "Restored content into new draft from version history",
        fromVersionId: versionId,
        delivery: "none",
      },
    });
    return await this.get(actor, campaignId);
  },

  async reopenApprovedAsDraft(actor: Actor, campaignId: string) {
    return this.transition(actor, campaignId, "REOPEN_DRAFT", {
      note: "Edit of approved content or audience requires reapproval",
    });
  },

  async simulateLaunch(actor: Actor, campaignId: string) {
    assertNoSend();
    assertMarketingOperationPermission(actor, "run");
    const { campaign, draft } = await this.get(actor, campaignId);
    if (!draft) {
      throw Object.assign(new Error("Draft missing"), { statusCode: 500, code: "VERSION_MISSING" });
    }
    const organizationId = orgId(actor.organizationId);
    const mapping = loadCampaignMapping(actor, campaign.audienceId);
    const checks = runMarketingPrePublishChecks({
      campaign,
      version: draft,
      columnMap: mapping.columnMap,
      mappingConfirmed: mapping.mappingConfirmed,
    });
    const ports = getConfiguredMarketingDurabilityPorts();
    let snapshotFrozen = !ports;
    if (ports) {
      const snaps = await ports.snapshots.listByCampaign(organizationId, campaignId);
      snapshotFrozen = snaps.some((row) => Boolean(row.frozenAt));
    }
    const blockers = buildMarketingLaunchBlockers({
      prePublishBlockingCodes: checks.blockingCodes,
      contentFrozen: Boolean(draft.immutable && draft.frozenAt),
      snapshotFrozen,
    });
    const result = simulateMarketingTestModeLaunch({
      approved: campaign.status === "APPROVED" || campaign.status === "SCHEDULED",
      blockers,
      hasRunPermission: true,
    });
    if (!result.ok) {
      throw Object.assign(new Error(result.reason ?? "Launch simulation blocked"), {
        statusCode: 400,
        code: "LAUNCH_BLOCKERS_PRESENT",
      });
    }
    recordMarketingAuditEvent({
      kind: "campaign.run",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { campaignId, actuallySent: false, simulated: true },
    });
    return result;
  },

  async retryEligibleFailures(
    actor: Actor,
    campaignId: string,
    opts?: { confirmed?: boolean; confirmationPhrase?: string },
  ) {
    assertNoSend();
    assertMarketingOperationPermission(actor, "retry");
    assertMarketingDeliveryConfirmation({
      action: "RETRY",
      confirmed: opts?.confirmed,
      confirmationPhrase: opts?.confirmationPhrase,
    });
    const organizationId = orgId(actor.organizationId);
    const ports = getConfiguredMarketingDurabilityPorts();
    if (!ports) {
      return { retried: 0, skipped: 0, actuallySent: false as const, notice: MARKETING_LIVE_PROVIDER_SENDING_DISABLED };
    }
    const result = await retryEligibleMarketingFailures({
      ports,
      organizationId,
      campaignId,
      workerId: actor.userId ?? "retry-worker",
    });
    return { ...result, notice: MARKETING_LIVE_PROVIDER_SENDING_DISABLED };
  },

  async readinessReview(actor: Actor, campaignId: string) {
    assertNoSend();
    const { campaign, draft } = await this.get(actor, campaignId);
    if (!draft) {
      throw Object.assign(new Error("Draft missing"), { statusCode: 500, code: "VERSION_MISSING" });
    }
    const organizationId = orgId(actor.organizationId);
    const mapping = loadCampaignMapping(actor, campaign.audienceId);
    const history = listMarketingTestSendHistory(campaignId);
    const ports = getConfiguredMarketingDurabilityPorts();
    const snaps = ports ? await ports.snapshots.listByCampaign(organizationId, campaignId) : [];
    const snapshot = [...snaps].sort((a, b) => b.frozenAt.localeCompare(a.frozenAt))[0] ?? null;
    return composeMarketingReadinessReview({
      campaign,
      version: draft,
      columnMap: mapping.columnMap,
      snapshot,
      unresolvedWarnings: unresolvedPersonalisationTokens({
        subject: draft.subject,
        preheader: draft.previewText,
        messageBody: paragraphTextFromDocument(draft.content),
        mappedVariables: mappedPersonalisationTokenNames(mapping.columnMap ?? { email: "" }),
        content: draft.content,
      }),
      latestTestSend: history[0] ?? null,
    });
  },
};

export type { MarketingCampaign, MarketingCampaignVersion };
