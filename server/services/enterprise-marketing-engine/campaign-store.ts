/**
 * CO-MARKETING-MKT-04 / MKT-05 — In-memory campaign / version stores.
 * No send. Immutable versions are frozen. Governance + state history.
 */

import { createEmptyContentDocument, cloneContentDocument } from "@/lib/enterprise-marketing-engine/content-blocks";
import type {
  MarketingCampaign,
  MarketingCampaignGovernance,
  MarketingCampaignStateChange,
  MarketingCampaignVersion,
  MarketingContentDocument,
  MarketingSenderIdentityDraft,
} from "@/types/enterprise-marketing-campaign";
import type { MarketingCampaignAction, MarketingCampaignStatus } from "@/constants/enterprise-marketing-engine";

const campaigns = new Map<string, MarketingCampaign>();
const versions = new Map<string, MarketingCampaignVersion>();

function nowIso() {
  return new Date().toISOString();
}

function defaultSender(): MarketingSenderIdentityDraft {
  return {
    fromName: "Rupee Catalyst Campaigns",
    fromAddress: "campaigns@campaign.example.rupeecatalyst.com",
    replyTo: "champion@rupeecatalyst.com",
  };
}

function emptyGovernance(userId: string | null): MarketingCampaignGovernance {
  return {
    createdByUserId: userId,
    modifiedByUserId: userId,
    submittedByUserId: null,
    approvedByUserId: null,
    scheduledByUserId: null,
    submittedAt: null,
    approvedAt: null,
    scheduledAt: null,
  };
}

export const marketingCampaignStore = {
  list(organizationId: string): MarketingCampaign[] {
    return [...campaigns.values()]
      .filter((c) => c.organizationId === organizationId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  listAll(): MarketingCampaign[] {
    return [...campaigns.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  get(id: string): MarketingCampaign | null {
    return campaigns.get(id) ?? null;
  },

  getForOrg(id: string, organizationId: string): MarketingCampaign | null {
    const c = campaigns.get(id);
    if (!c || c.organizationId !== organizationId) return null;
    return c;
  },

  getVersion(versionId: string): MarketingCampaignVersion | null {
    return versions.get(versionId) ?? null;
  },

  listVersions(campaignId: string): MarketingCampaignVersion[] {
    return [...versions.values()]
      .filter((v) => v.campaignId === campaignId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  },

  create(input: {
    organizationId: string;
    name: string;
    objective?: string | null;
    product?: string | null;
    audienceId?: string | null;
    channel?: MarketingCampaign["channel"];
    content?: MarketingContentDocument;
    subject?: string;
    previewText?: string;
    createdByUserId?: string | null;
  }): { campaign: MarketingCampaign; version: MarketingCampaignVersion } {
    const ts = nowIso();
    const campaignId = `mkt-camp-${input.organizationId}-${Date.now()}`;
    const versionId = `mkt-ver-${campaignId}-1`;
    const version: MarketingCampaignVersion = {
      id: versionId,
      campaignId,
      versionNumber: 1,
      immutable: false,
      subject: input.subject ?? "Your campaign subject",
      previewText: input.previewText ?? "Preview text for inbox",
      content: input.content ?? createEmptyContentDocument(),
      disclaimer:
        "This communication is for informational purposes. Terms apply. Unsubscribe controls appear at send time.",
      trackingEnabled: true,
      plainTextOverride: null,
      utm: {
        source: "email",
        medium: "marketing",
        campaign: "",
        content: null,
        term: null,
      },
      ctaLabel: "Learn more",
      ctaUrl: "https://rupeecatalyst.com",
      createdAt: ts,
      updatedAt: ts,
    };
    const actor = input.createdByUserId ?? null;
    const campaign: MarketingCampaign = {
      id: campaignId,
      organizationId: input.organizationId,
      name: input.name.trim() || "Untitled campaign",
      objective: input.objective ?? null,
      internalDescription: null,
      product: input.product ?? null,
      audienceId: input.audienceId ?? null,
      channel: input.channel ?? "EMAIL",
      sender: defaultSender(),
      status: "DRAFT",
      currentDraftVersionId: versionId,
      activePublishedVersionId: null,
      schedulePlaceholder: {
        enabled: false,
        notes: "Schedule configuration arrives in a later sprint.",
      },
      routingPlaceholder: {
        mode: "UNCONFIGURED",
        notes: "Configure assignee routing on Responses (user / team / round-robin / closed rules).",
      },
      notificationPlaceholder: {
        inApp: true,
        email: false,
        whatsapp: false,
        notes: "In-app uses Enterprise Notification Engine. Email/WhatsApp are dry-run until approved.",
      },
      templateId: null,
      governance: emptyGovernance(actor),
      stateHistory: [
        {
          id: `mkt-st-${campaignId}-0`,
          from: "DRAFT",
          to: "DRAFT",
          action: "SAVE",
          actorUserId: actor,
          at: ts,
          note: "Campaign created",
        },
      ],
      createdAt: ts,
      updatedAt: ts,
    };
    versions.set(versionId, version);
    campaigns.set(campaignId, campaign);
    return { campaign, version };
  },

  updateCampaign(
    campaignId: string,
    organizationId: string,
    patch: Partial<
      Pick<
        MarketingCampaign,
        | "name"
        | "objective"
        | "internalDescription"
        | "product"
        | "audienceId"
        | "channel"
        | "sender"
        | "status"
        | "schedulePlaceholder"
        | "routingPlaceholder"
        | "notificationPlaceholder"
        | "batchPolicy"
        | "senderIdentityId"
        | "whatsappTemplateId"
        | "templateId"
        | "activePublishedVersionId"
        | "currentDraftVersionId"
        | "governance"
        | "stateHistory"
      >
    >,
  ): MarketingCampaign {
    const c = this.getForOrg(campaignId, organizationId);
    if (!c) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const next = { ...c, ...patch, updatedAt: nowIso() };
    campaigns.set(campaignId, next);
    return next;
  },

  recordStateChange(
    campaignId: string,
    organizationId: string,
    entry: Omit<MarketingCampaignStateChange, "id" | "at"> & { at?: string },
  ): MarketingCampaign {
    const c = this.getForOrg(campaignId, organizationId);
    if (!c) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const at = entry.at ?? nowIso();
    const change: MarketingCampaignStateChange = {
      id: `mkt-st-${campaignId}-${c.stateHistory.length + 1}`,
      from: entry.from,
      to: entry.to,
      action: entry.action,
      actorUserId: entry.actorUserId,
      at,
      note: entry.note ?? null,
    };
    return this.updateCampaign(campaignId, organizationId, {
      status: entry.to,
      stateHistory: [...c.stateHistory, change],
    });
  },

  updateDraftVersion(
    campaignId: string,
    organizationId: string,
    patch: Partial<
      Pick<
        MarketingCampaignVersion,
        | "subject"
        | "previewText"
        | "content"
        | "disclaimer"
        | "trackingEnabled"
        | "plainTextOverride"
        | "utm"
        | "ctaLabel"
        | "ctaUrl"
      >
    >,
  ): MarketingCampaignVersion {
    const c = this.getForOrg(campaignId, organizationId);
    if (!c) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    let version = this.getVersion(c.currentDraftVersionId);
    if (!version) {
      throw Object.assign(new Error("Draft version missing"), { statusCode: 500, code: "VERSION_MISSING" });
    }
    if (version.immutable) {
      const nextNum = Math.max(...this.listVersions(campaignId).map((v) => v.versionNumber)) + 1;
      const ts = nowIso();
      const newId = `mkt-ver-${campaignId}-${nextNum}`;
      version = {
        ...version,
        id: newId,
        versionNumber: nextNum,
        immutable: false,
        frozenAt: null,
        frozenReason: null,
        subject: patch.subject ?? version.subject,
        previewText: patch.previewText ?? version.previewText,
        content: patch.content ? cloneContentDocument(patch.content) : cloneContentDocument(version.content),
        disclaimer: patch.disclaimer !== undefined ? patch.disclaimer : version.disclaimer,
        trackingEnabled: patch.trackingEnabled ?? version.trackingEnabled,
        plainTextOverride:
          patch.plainTextOverride !== undefined
            ? patch.plainTextOverride
            : version.plainTextOverride,
        utm: patch.utm !== undefined ? patch.utm : version.utm,
        ctaLabel: patch.ctaLabel !== undefined ? patch.ctaLabel : version.ctaLabel,
        ctaUrl: patch.ctaUrl !== undefined ? patch.ctaUrl : version.ctaUrl,
        createdAt: ts,
        updatedAt: ts,
      };
      versions.set(newId, version);
      this.updateCampaign(campaignId, organizationId, { currentDraftVersionId: newId });
      return version;
    }
    const next: MarketingCampaignVersion = {
      ...version,
      ...patch,
      content: patch.content ? cloneContentDocument(patch.content) : version.content,
      updatedAt: nowIso(),
    };
    versions.set(version.id, next);
    this.updateCampaign(campaignId, organizationId, {});
    return next;
  },

  freezeVersion(
    versionId: string,
    reason: "APPROVED" | "MANUAL_FREEZE",
  ): MarketingCampaignVersion {
    const v = versions.get(versionId);
    if (!v) {
      throw Object.assign(new Error("Version not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    if (v.immutable) return v;
    const next: MarketingCampaignVersion = {
      ...v,
      immutable: true,
      frozenAt: nowIso(),
      frozenReason: reason,
      updatedAt: nowIso(),
    };
    versions.set(versionId, next);
    return next;
  },

  cloneCampaign(
    sourceId: string,
    organizationId: string,
    name?: string,
    createdByUserId?: string | null,
  ): { campaign: MarketingCampaign; version: MarketingCampaignVersion } {
    const src = this.getForOrg(sourceId, organizationId);
    if (!src) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const srcVer =
      this.getVersion(src.currentDraftVersionId) ??
      (src.activePublishedVersionId
        ? this.getVersion(src.activePublishedVersionId)
        : null);
    if (!srcVer) {
      throw Object.assign(new Error("Source version missing"), { statusCode: 500, code: "VERSION_MISSING" });
    }
    const created = this.create({
      organizationId,
      name: name?.trim() || `${src.name} (Copy)`,
      objective: src.objective,
      product: src.product,
      audienceId: src.audienceId,
      channel: src.channel,
      content: cloneContentDocument(srcVer.content),
      subject: srcVer.subject,
      previewText: srcVer.previewText,
      createdByUserId: createdByUserId ?? null,
    });
    this.updateCampaign(created.campaign.id, organizationId, {
      internalDescription: src.internalDescription ?? null,
    });
    this.updateDraftVersion(created.campaign.id, organizationId, {
      disclaimer: srcVer.disclaimer,
      trackingEnabled: srcVer.trackingEnabled,
      plainTextOverride: srcVer.plainTextOverride ?? null,
      utm: srcVer.utm ?? null,
      ctaLabel: srcVer.ctaLabel,
      ctaUrl: srcVer.ctaUrl,
    });
    return {
      campaign: this.getForOrg(created.campaign.id, organizationId)!,
      version: this.getVersion(
        this.getForOrg(created.campaign.id, organizationId)!.currentDraftVersionId,
      )!,
    };
  },
};

export type { MarketingCampaignAction, MarketingCampaignStatus };
