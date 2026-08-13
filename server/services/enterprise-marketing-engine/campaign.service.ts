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
import { cloneContentDocument } from "@/lib/enterprise-marketing-engine/content-blocks";
import {
  renderMarketingEmailHtml,
  renderMarketingEmailPlaintext,
} from "@/lib/enterprise-marketing-engine/email-render";
import {
  applyPersonalization,
  assertSafePersonalizationTokens,
  defaultPersonalizationSample,
  scanDocumentTokens,
} from "@/lib/enterprise-marketing-engine/personalization";
import {
  assertMarketingPermission,
  type MarketingPermissionActor,
} from "@/lib/enterprise-marketing-engine/permissions";
import {
  assertReadyForApproval,
  runMarketingPrePublishChecks,
} from "@/lib/enterprise-marketing-engine/pre-publish";
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
import { marketingCampaignStore } from "./campaign-store";
import { marketingExecutionService } from "./execution.service";
import { marketingTemplateStore, marketingReusableBlockStore } from "./template-store";

type Actor = MarketingPermissionActor;

function assertNoSend() {
  if (ENTERPRISE_MARKETING_EXECUTION_ENABLED) {
    throw new EnterpriseMarketingSafetyError("campaign.send");
  }
}

function orgId(actorOrg?: string | null) {
  return (actorOrg ?? "").trim() || "default";
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

function touchModified(campaignId: string, organizationId: string, actor: Actor) {
  const c = marketingCampaignStore.getForOrg(campaignId, organizationId);
  if (!c) return;
  marketingCampaignStore.updateCampaign(campaignId, organizationId, {
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
  list(actor: Actor) {
    assertNoSend();
    return marketingCampaignStore.list(orgId(actor.organizationId));
  },

  get(actor: Actor, campaignId: string) {
    assertNoSend();
    const organizationId = orgId(actor.organizationId);
    const campaign = marketingCampaignStore.getForOrg(campaignId, organizationId);
    if (!campaign) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const draft = marketingCampaignStore.getVersion(campaign.currentDraftVersionId);
    const versions = marketingCampaignStore.listVersions(campaignId);
    const editPolicy = marketingCampaignEditPolicy(campaign.status);
    return { campaign, draft, versions, editPolicy };
  },

  create(
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
      const tpl = marketingTemplateStore.getForOrg(input.templateId, organizationId);
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
    const created = marketingCampaignStore.create({
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
      marketingCampaignStore.updateCampaign(created.campaign.id, organizationId, {
        templateId: input.templateId,
      });
    }
    recordMarketingAuditEvent({
      kind: "campaign.create",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { campaignId: created.campaign.id },
    });
    return this.get(actor, created.campaign.id);
  },

  /**
   * Persist draft content/metadata only.
   * Never transitions to APPROVED / SCHEDULED / RUNNING / etc.
   */
  save(
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
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_CREATE);
    const organizationId = orgId(actor.organizationId);
    const existing = marketingCampaignStore.getForOrg(campaignId, organizationId);
    if (!existing) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
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
        input.batchPolicy !== undefined;
      if (wantsMeta) {
        throw Object.assign(
          new Error(`Campaign metadata locked in status ${existing.status}`),
          { statusCode: 400, code: "METADATA_LOCKED" },
        );
      }
    }

    if (input.content || input.subject || input.previewText) {
      const draft = marketingCampaignStore.getVersion(existing.currentDraftVersionId);
      const subject = input.subject ?? draft?.subject ?? "";
      const previewText = input.previewText ?? draft?.previewText ?? "";
      const content = input.content ?? draft?.content;
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
    if (Object.keys(campaignPatch).length) {
      marketingCampaignStore.updateCampaign(campaignId, organizationId, campaignPatch);
    }

    if (wantsContent) {
      const versionPatch: Parameters<typeof marketingCampaignStore.updateDraftVersion>[2] = {};
      if (input.subject !== undefined) versionPatch.subject = input.subject;
      if (input.previewText !== undefined) versionPatch.previewText = input.previewText;
      if (input.content !== undefined) versionPatch.content = input.content;
      if (input.disclaimer !== undefined) versionPatch.disclaimer = input.disclaimer;
      if (input.trackingEnabled !== undefined) versionPatch.trackingEnabled = input.trackingEnabled;
      if (input.plainTextOverride !== undefined) {
        versionPatch.plainTextOverride = input.plainTextOverride;
      }
      if (input.utm !== undefined) versionPatch.utm = input.utm;
      if (input.ctaLabel !== undefined) versionPatch.ctaLabel = input.ctaLabel;
      if (input.ctaUrl !== undefined) versionPatch.ctaUrl = input.ctaUrl;
      marketingCampaignStore.updateDraftVersion(campaignId, organizationId, versionPatch);
    }

    touchModified(campaignId, organizationId, actor);
    recordMarketingAuditEvent({
      kind: "campaign.save",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { campaignId, note: "SAVE does not publish" },
    });
    return this.get(actor, campaignId);
  },

  prePublishChecks(actor: Actor, campaignId: string): MarketingPrePublishCheckResult {
    assertNoSend();
    const { campaign, draft } = this.get(actor, campaignId);
    if (!draft) {
      throw Object.assign(new Error("Draft missing"), { statusCode: 500, code: "VERSION_MISSING" });
    }
    return runMarketingPrePublishChecks({ campaign, version: draft });
  },

  /**
   * Explicit lifecycle action. SAVE is not a publish path.
   * APPROVE requires CAMPAIGN_APPROVE. No provider send.
   */
  transition(
    actor: Actor,
    campaignId: string,
    action: MarketingCampaignAction,
    opts?: { resumeTarget?: "RUNNING" | "SCHEDULED"; note?: string },
  ) {
    assertNoSend();
    if (action === "SAVE") {
      throw Object.assign(new Error("Use save() for persistence — SAVE is not a lifecycle publish action"), {
        statusCode: 400,
        code: "USE_SAVE_ENDPOINT",
      });
    }

    const organizationId = orgId(actor.organizationId);
    const existing = marketingCampaignStore.getForOrg(campaignId, organizationId);
    if (!existing) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }

    if (action === "APPROVE") {
      assertMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_APPROVE);
    } else {
      assertMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_CREATE);
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

    const draft = marketingCampaignStore.getVersion(existing.currentDraftVersionId);
    if (!draft) {
      throw Object.assign(new Error("Draft missing"), { statusCode: 500, code: "VERSION_MISSING" });
    }

    if (action === "APPROVE") {
      const checks = runMarketingPrePublishChecks({ campaign: existing, version: draft });
      assertReadyForApproval(checks);
      const frozen = marketingCampaignStore.freezeVersion(draft.id, "APPROVED");
      marketingCampaignStore.updateCampaign(campaignId, organizationId, {
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
      marketingCampaignStore.updateCampaign(campaignId, organizationId, {
        governance: {
          ...existing.governance,
          submittedByUserId: actor.userId ?? null,
          submittedAt: new Date().toISOString(),
          modifiedByUserId: actor.userId ?? null,
        },
      });
    }

    if (action === "SCHEDULE") {
      marketingCampaignStore.updateCampaign(campaignId, organizationId, {
        governance: {
          ...existing.governance,
          scheduledByUserId: actor.userId ?? null,
          scheduledAt: new Date().toISOString(),
          modifiedByUserId: actor.userId ?? null,
        },
      });
    }

    if (action === "PREVIEW" || to === "DRAFT") {
      touchModified(campaignId, organizationId, actor);
    }

    // APPROVED → DRAFT: reopen for new version cycle (content remains frozen until edited)
    if (from === "APPROVED" && to === "DRAFT") {
      marketingCampaignStore.updateCampaign(campaignId, organizationId, {
        governance: {
          ...marketingCampaignStore.getForOrg(campaignId, organizationId)!.governance,
          modifiedByUserId: actor.userId ?? null,
        },
      });
    }

    marketingCampaignStore.recordStateChange(campaignId, organizationId, {
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
      detail: {
        campaignId,
        action,
        from,
        to,
        delivery: "none",
        notice: "Lifecycle state only — no provider send in MKT-05",
      },
    });

    if (action === "PAUSE" || action === "STOP" || action === "CANCEL") {
      marketingExecutionService.onStop(campaignId);
    }
    if (action === "RESUME") {
      marketingExecutionService.onResume(campaignId);
    }
    if (action === "SCHEDULE" || action === "RUN") {
      marketingExecutionService.initializeFromTransition(campaignId, organizationId);
    }

    return this.get(actor, campaignId);
  },

  clone(actor: Actor, campaignId: string, name?: string) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_CREATE);
    const organizationId = orgId(actor.organizationId);
    const created = marketingCampaignStore.cloneCampaign(
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
    return this.get(actor, created.campaign.id);
  },

  saveAsTemplate(actor: Actor, campaignId: string, templateName: string) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_CREATE);
    const organizationId = orgId(actor.organizationId);
    const { campaign, draft } = this.get(actor, campaignId);
    if (!draft) {
      throw Object.assign(new Error("Draft missing"), { statusCode: 500, code: "VERSION_MISSING" });
    }
    const template = marketingTemplateStore.save({
      organizationId,
      name: templateName,
      channel: campaign.channel,
      subject: draft.subject,
      previewText: draft.previewText,
      content: draft.content,
      disclaimer: draft.disclaimer,
    });
    recordMarketingAuditEvent({
      kind: "campaign.save_template",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { campaignId, templateId: template.id },
    });
    return template;
  },

  listTemplates(actor: Actor) {
    return marketingTemplateStore.list(orgId(actor.organizationId));
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

  preview(
    actor: Actor,
    campaignId: string,
    personalization?: Record<string, string>,
  ): MarketingCampaignPreviewPayload {
    assertNoSend();
    const { campaign, draft } = this.get(actor, campaignId);
    if (!draft) {
      throw Object.assign(new Error("Draft missing"), { statusCode: 500, code: "VERSION_MISSING" });
    }
    const sample = {
      ...defaultPersonalizationSample(),
      senderName: campaign.sender.fromName || defaultPersonalizationSample().senderName,
      ...personalization,
    };
    validateContentTokens(draft.content, draft.subject, draft.previewText);
    if (draft.plainTextOverride) {
      assertSafePersonalizationTokens(draft.plainTextOverride);
    }
    const tokens = scanDocumentTokens(draft.content);

    if (campaign.status === "DRAFT") {
      try {
        this.transition(actor, campaignId, "PREVIEW", { note: "Opened preview" });
      } catch {
        // soft
      }
    }

    recordMarketingAuditEvent({
      kind: "campaign.preview",
      actorUserId: actor.userId ?? null,
      organizationId: orgId(actor.organizationId),
      detail: { campaignId, tokens, delivery: "none" },
    });

    const renderArgs = {
      content: draft.content,
      subject: draft.subject,
      previewText: draft.previewText,
      personalization: sample,
      trackingEnabled: draft.trackingEnabled,
      utm: draft.utm ?? null,
    };

    return {
      campaignId: campaign.id,
      versionId: draft.id,
      versionNumber: draft.versionNumber,
      subject: applyPersonalization(draft.subject, sample),
      previewText: applyPersonalization(draft.previewText, sample),
      preheader: applyPersonalization(draft.previewText, sample),
      sender: campaign.sender,
      htmlDesktop: renderMarketingEmailHtml({ ...renderArgs, mode: "desktop" }),
      htmlMobile: renderMarketingEmailHtml({ ...renderArgs, mode: "mobile" }),
      plaintext: renderMarketingEmailPlaintext({
        content: draft.content,
        personalization: sample,
        plainTextOverride: draft.plainTextOverride,
        trackingEnabled: draft.trackingEnabled,
        utm: draft.utm ?? null,
      }),
      plainTextIsOverride: Boolean(draft.plainTextOverride?.trim()),
      personalizationSample: sample,
      utm: draft.utm ?? null,
      trackingEnabled: draft.trackingEnabled,
      notice:
        "Preview only — no Test Send or production delivery in MKT-08. Content engine + versioning active; SAVE never publishes.",
    };
  },

  /**
   * Create a new editable draft from a historical frozen version.
   * Never mutates the frozen / published version used by a running campaign.
   */
  restoreVersionAsDraft(actor: Actor, campaignId: string, versionId: string) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_CREATE);
    const organizationId = orgId(actor.organizationId);
    const existing = marketingCampaignStore.getForOrg(campaignId, organizationId);
    if (!existing) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const policy = marketingCampaignEditPolicy(existing.status);
    if (policy.operationalControlsOnly || policy.readOnly) {
      throw Object.assign(
        new Error(`Cannot restore draft while campaign is ${existing.status}`),
        { statusCode: 400, code: "RESTORE_BLOCKED" },
      );
    }
    const source = marketingCampaignStore.getVersion(versionId);
    if (!source || source.campaignId !== campaignId) {
      throw Object.assign(new Error("Version not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    marketingCampaignStore.updateDraftVersion(campaignId, organizationId, {
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
    const after = marketingCampaignStore.getForOrg(campaignId, organizationId)!;
    const draft = marketingCampaignStore.getVersion(after.currentDraftVersionId);
    if (draft?.immutable) {
      marketingCampaignStore.updateDraftVersion(campaignId, organizationId, {
        subject: source.subject,
      });
    }
    touchModified(campaignId, organizationId, actor);
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
    return this.get(actor, campaignId);
  },
};

export type { MarketingCampaign, MarketingCampaignVersion };
