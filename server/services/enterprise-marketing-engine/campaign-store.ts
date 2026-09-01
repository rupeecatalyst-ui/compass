/**
 * Campaign / version stores.
 * Prisma when ENTERPRISE_PERSISTENCE_MODE=prisma; in-memory otherwise (engineering verifiers).
 * No live send. Immutable versions are frozen. Governance + state history.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  MARKETING_PO_DEMO_INTERNAL_DESCRIPTION,
  MARKETING_PO_DEMO_KEY,
  MARKETING_PO_DEMO_NAME,
} from "@/constants/enterprise-marketing-engine/demo-campaign";
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
import type { MarketingBatchPolicy } from "@/types/enterprise-marketing-execution";

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

function usePrisma(): boolean {
  return isEnterprisePersistencePrisma();
}

function asJson<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function mapVersion(row: {
  id: string;
  campaignId: string;
  versionNumber: number;
  immutable: boolean;
  frozenAt: Date | null;
  frozenReason: string | null;
  subject: string;
  previewText: string;
  contentJson: Prisma.JsonValue;
  disclaimer: string | null;
  trackingEnabled: boolean;
  plainTextOverride: string | null;
  utmJson: Prisma.JsonValue | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}): MarketingCampaignVersion {
  return {
    id: row.id,
    campaignId: row.campaignId,
    versionNumber: row.versionNumber,
    immutable: row.immutable,
    frozenAt: toIso(row.frozenAt),
    frozenReason: (row.frozenReason as MarketingCampaignVersion["frozenReason"]) ?? null,
    subject: row.subject,
    previewText: row.previewText,
    content: row.contentJson as MarketingContentDocument,
    disclaimer: row.disclaimer,
    trackingEnabled: row.trackingEnabled,
    plainTextOverride: row.plainTextOverride,
    utm: (row.utmJson as MarketingCampaignVersion["utm"]) ?? null,
    ctaLabel: row.ctaLabel,
    ctaUrl: row.ctaUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapCampaign(row: {
  id: string;
  organizationId: string;
  name: string;
  objective: string | null;
  internalDescription: string | null;
  product: string | null;
  audienceId: string | null;
  channel: string;
  senderJson: Prisma.JsonValue;
  status: string;
  currentDraftVersionId: string;
  activePublishedVersionId: string | null;
  scheduleJson: Prisma.JsonValue;
  routingJson: Prisma.JsonValue;
  notificationJson: Prisma.JsonValue;
  batchPolicyJson: Prisma.JsonValue | null;
  senderIdentityId: string | null;
  whatsappTemplateId: string | null;
  templateId: string | null;
  governanceJson: Prisma.JsonValue;
  stateHistoryJson: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): MarketingCampaign {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    objective: row.objective,
    internalDescription: row.internalDescription,
    product: row.product,
    audienceId: row.audienceId,
    channel: row.channel as MarketingCampaign["channel"],
    sender: row.senderJson as MarketingSenderIdentityDraft,
    status: row.status as MarketingCampaignStatus,
    currentDraftVersionId: row.currentDraftVersionId,
    activePublishedVersionId: row.activePublishedVersionId,
    schedulePlaceholder: row.scheduleJson as MarketingCampaign["schedulePlaceholder"],
    routingPlaceholder: row.routingJson as MarketingCampaign["routingPlaceholder"],
    notificationPlaceholder: row.notificationJson as MarketingCampaign["notificationPlaceholder"],
    batchPolicy: (row.batchPolicyJson as MarketingBatchPolicy | null) ?? null,
    senderIdentityId: row.senderIdentityId,
    whatsappTemplateId: row.whatsappTemplateId,
    templateId: row.templateId,
    governance: row.governanceJson as MarketingCampaignGovernance,
    stateHistory: (row.stateHistoryJson as MarketingCampaignStateChange[]) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function persistGet(id: string): Promise<MarketingCampaign | null> {
  const row = await prisma.enterpriseMarketingCampaign.findUnique({ where: { id } });
  return row ? mapCampaign(row) : null;
}

async function persistGetForOrg(id: string, organizationId: string): Promise<MarketingCampaign | null> {
  const row = await prisma.enterpriseMarketingCampaign.findFirst({
    where: { id, organizationId },
  });
  return row ? mapCampaign(row) : null;
}

async function persistList(organizationId: string): Promise<MarketingCampaign[]> {
  const rows = await prisma.enterpriseMarketingCampaign.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(mapCampaign);
}

async function persistGetVersion(versionId: string): Promise<MarketingCampaignVersion | null> {
  const row = await prisma.enterpriseMarketingCampaignVersion.findUnique({ where: { id: versionId } });
  return row ? mapVersion(row) : null;
}

async function persistListVersions(campaignId: string): Promise<MarketingCampaignVersion[]> {
  const rows = await prisma.enterpriseMarketingCampaignVersion.findMany({
    where: { campaignId },
    orderBy: { versionNumber: "desc" },
  });
  return rows.map(mapVersion);
}

async function persistWriteCampaign(campaign: MarketingCampaign, demoKey?: string | null) {
  const data = {
    organizationId: campaign.organizationId,
    demoKey: demoKey === undefined ? undefined : demoKey,
    name: campaign.name,
    objective: campaign.objective ?? null,
    internalDescription: campaign.internalDescription ?? null,
    product: campaign.product ?? null,
    audienceId: campaign.audienceId ?? null,
    channel: campaign.channel,
    senderJson: asJson(campaign.sender),
    status: campaign.status,
    currentDraftVersionId: campaign.currentDraftVersionId,
    activePublishedVersionId: campaign.activePublishedVersionId ?? null,
    scheduleJson: asJson(campaign.schedulePlaceholder),
    routingJson: asJson(campaign.routingPlaceholder),
    notificationJson: asJson(campaign.notificationPlaceholder),
    batchPolicyJson: campaign.batchPolicy == null ? Prisma.JsonNull : asJson(campaign.batchPolicy),
    senderIdentityId: campaign.senderIdentityId ?? null,
    whatsappTemplateId: campaign.whatsappTemplateId ?? null,
    templateId: campaign.templateId ?? null,
    governanceJson: asJson(campaign.governance),
    stateHistoryJson: asJson(campaign.stateHistory),
    createdAt: new Date(campaign.createdAt),
    updatedAt: new Date(campaign.updatedAt),
  };
  await prisma.enterpriseMarketingCampaign.upsert({
    where: { id: campaign.id },
    create: { id: campaign.id, ...data, demoKey: demoKey ?? null },
    update: data,
  });
}

async function persistWriteVersion(version: MarketingCampaignVersion, organizationId: string) {
  const data = {
    campaignId: version.campaignId,
    organizationId,
    versionNumber: version.versionNumber,
    immutable: version.immutable,
    frozenAt: version.frozenAt ? new Date(version.frozenAt) : null,
    frozenReason: version.frozenReason ?? null,
    subject: version.subject,
    previewText: version.previewText,
    contentJson: asJson(version.content),
    disclaimer: version.disclaimer ?? null,
    trackingEnabled: version.trackingEnabled,
    plainTextOverride: version.plainTextOverride ?? null,
    utmJson: version.utm == null ? Prisma.JsonNull : asJson(version.utm),
    ctaLabel: version.ctaLabel ?? null,
    ctaUrl: version.ctaUrl ?? null,
    createdAt: new Date(version.createdAt),
    updatedAt: new Date(version.updatedAt),
  };
  await prisma.enterpriseMarketingCampaignVersion.upsert({
    where: { id: version.id },
    create: { id: version.id, ...data },
    update: data,
  });
}

const memoryStore = {
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
    demoKey?: string | null;
  }): { campaign: MarketingCampaign; version: MarketingCampaignVersion } {
    const ts = nowIso();
    const campaignId = input.demoKey
      ? `mkt-camp-${input.organizationId}-${input.demoKey}`
      : `mkt-camp-${input.organizationId}-${Date.now()}`;
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
      internalDescription: input.demoKey ? MARKETING_PO_DEMO_INTERNAL_DESCRIPTION : null,
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

export async function ensureProductOwnerDemoCampaign(
  organizationId: string,
): Promise<MarketingCampaign> {
  if (!usePrisma()) {
    const existing = memoryStore
      .list(organizationId)
      .find((c) => c.id.endsWith(`-${MARKETING_PO_DEMO_KEY}`) || c.name === MARKETING_PO_DEMO_NAME);
    if (existing) return existing;
    const created = memoryStore.create({
      organizationId,
      name: MARKETING_PO_DEMO_NAME,
      objective: "Product Awareness",
      demoKey: MARKETING_PO_DEMO_KEY,
      createdByUserId: "system:marketing-demo",
    });
    return memoryStore.updateCampaign(created.campaign.id, organizationId, {
      internalDescription: MARKETING_PO_DEMO_INTERNAL_DESCRIPTION,
      schedulePlaceholder: {
        enabled: false,
        notes: "Scheduling is inactive. Demonstration campaign — live send is prohibited.",
      },
    });
  }

  const existing = await prisma.enterpriseMarketingCampaign.findFirst({
    where: { organizationId, demoKey: MARKETING_PO_DEMO_KEY },
  });
  if (existing) return mapCampaign(existing);

  const created = memoryStore.create({
    organizationId,
    name: MARKETING_PO_DEMO_NAME,
    objective: "Product Awareness",
    demoKey: MARKETING_PO_DEMO_KEY,
    createdByUserId: "system:marketing-demo",
  });
  const campaign = memoryStore.updateCampaign(created.campaign.id, organizationId, {
    internalDescription: MARKETING_PO_DEMO_INTERNAL_DESCRIPTION,
    schedulePlaceholder: {
      enabled: false,
      notes: "Scheduling is inactive. Demonstration campaign — live send is prohibited.",
    },
  });
  try {
    await persistWriteCampaign(campaign, MARKETING_PO_DEMO_KEY);
    await persistWriteVersion(
      memoryStore.getVersion(campaign.currentDraftVersionId)!,
      organizationId,
    );
    return campaign;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "P2002") {
      const raced = await prisma.enterpriseMarketingCampaign.findFirst({
        where: { organizationId, demoKey: MARKETING_PO_DEMO_KEY },
      });
      if (raced) return mapCampaign(raced);
    }
    throw err;
  }
}

export const marketingCampaignStore = {
  async list(organizationId: string): Promise<MarketingCampaign[]> {
    if (usePrisma()) {
      await ensureProductOwnerDemoCampaign(organizationId);
      return persistList(organizationId);
    }
    return memoryStore.list(organizationId);
  },

  async listAll(): Promise<MarketingCampaign[]> {
    if (usePrisma()) {
      const rows = await prisma.enterpriseMarketingCampaign.findMany({
        orderBy: { updatedAt: "desc" },
      });
      return rows.map(mapCampaign);
    }
    return memoryStore.listAll();
  },

  async get(id: string): Promise<MarketingCampaign | null> {
    if (usePrisma()) return persistGet(id);
    return memoryStore.get(id);
  },

  async getForOrg(id: string, organizationId: string): Promise<MarketingCampaign | null> {
    if (usePrisma()) return persistGetForOrg(id, organizationId);
    return memoryStore.getForOrg(id, organizationId);
  },

  async getVersion(versionId: string): Promise<MarketingCampaignVersion | null> {
    if (usePrisma()) return persistGetVersion(versionId);
    return memoryStore.getVersion(versionId);
  },

  async listVersions(campaignId: string): Promise<MarketingCampaignVersion[]> {
    if (usePrisma()) return persistListVersions(campaignId);
    return memoryStore.listVersions(campaignId);
  },

  async create(input: Parameters<typeof memoryStore.create>[0]) {
    if (input.demoKey) {
      const existing = await this.list(input.organizationId);
      const hit = existing.find(
        (c) => c.id.endsWith(`-${input.demoKey}`) || c.name === MARKETING_PO_DEMO_NAME,
      );
      if (hit) {
        const version = await this.getVersion(hit.currentDraftVersionId);
        if (version) return { campaign: hit, version };
      }
    }
    const created = memoryStore.create(input);
    if (usePrisma()) {
      await persistWriteCampaign(created.campaign, input.demoKey ?? null);
      await persistWriteVersion(created.version, input.organizationId);
      const persisted = await persistGetForOrg(created.campaign.id, input.organizationId);
      const version = await persistGetVersion(created.version.id);
      if (persisted && version) return { campaign: persisted, version };
    }
    return created;
  },

  async updateCampaign(
    campaignId: string,
    organizationId: string,
    patch: Parameters<typeof memoryStore.updateCampaign>[2],
  ) {
    if (usePrisma()) {
      const current = await persistGetForOrg(campaignId, organizationId);
      if (!current) {
        throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
      }
      const next = { ...current, ...patch, updatedAt: nowIso() };
      await persistWriteCampaign(next);
      return next;
    }
    return memoryStore.updateCampaign(campaignId, organizationId, patch);
  },

  async recordStateChange(
    campaignId: string,
    organizationId: string,
    entry: Parameters<typeof memoryStore.recordStateChange>[2],
  ) {
    if (usePrisma()) {
      const current = await persistGetForOrg(campaignId, organizationId);
      if (!current) {
        throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
      }
      return this.updateCampaign(campaignId, organizationId, {
        status: entry.to,
        stateHistory: [
          ...current.stateHistory,
          {
            id: `mkt-st-${campaignId}-${current.stateHistory.length + 1}`,
            from: entry.from,
            to: entry.to,
            action: entry.action,
            actorUserId: entry.actorUserId,
            at: entry.at ?? nowIso(),
            note: entry.note ?? null,
          },
        ],
      });
    }
    return memoryStore.recordStateChange(campaignId, organizationId, entry);
  },

  async updateDraftVersion(
    campaignId: string,
    organizationId: string,
    patch: Parameters<typeof memoryStore.updateDraftVersion>[2],
  ) {
    if (!usePrisma()) {
      return memoryStore.updateDraftVersion(campaignId, organizationId, patch);
    }
    const current = await persistGetForOrg(campaignId, organizationId);
    if (!current) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    let version = await persistGetVersion(current.currentDraftVersionId);
    if (!version) {
      throw Object.assign(new Error("Draft version missing"), { statusCode: 500, code: "VERSION_MISSING" });
    }
    if (version.immutable) {
      const listed = await persistListVersions(campaignId);
      const nextNum = Math.max(...listed.map((v) => v.versionNumber)) + 1;
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
          patch.plainTextOverride !== undefined ? patch.plainTextOverride : version.plainTextOverride,
        utm: patch.utm !== undefined ? patch.utm : version.utm,
        ctaLabel: patch.ctaLabel !== undefined ? patch.ctaLabel : version.ctaLabel,
        ctaUrl: patch.ctaUrl !== undefined ? patch.ctaUrl : version.ctaUrl,
        createdAt: ts,
        updatedAt: ts,
      };
      await persistWriteVersion(version, organizationId);
      await this.updateCampaign(campaignId, organizationId, { currentDraftVersionId: newId });
      return version;
    }
    const next: MarketingCampaignVersion = {
      ...version,
      ...patch,
      content: patch.content ? cloneContentDocument(patch.content) : version.content,
      updatedAt: nowIso(),
    };
    await persistWriteVersion(next, organizationId);
    await this.updateCampaign(campaignId, organizationId, {});
    return next;
  },

  async freezeVersion(versionId: string, reason: "APPROVED" | "MANUAL_FREEZE") {
    if (!usePrisma()) return memoryStore.freezeVersion(versionId, reason);
    const v = await persistGetVersion(versionId);
    if (!v) {
      throw Object.assign(new Error("Version not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    if (v.immutable) return v;
    const campaign = await persistGet(v.campaignId);
    const next: MarketingCampaignVersion = {
      ...v,
      immutable: true,
      frozenAt: nowIso(),
      frozenReason: reason,
      updatedAt: nowIso(),
    };
    await persistWriteVersion(next, campaign?.organizationId ?? "");
    return next;
  },

  async cloneCampaign(
    sourceId: string,
    organizationId: string,
    name?: string,
    createdByUserId?: string | null,
  ) {
    if (!usePrisma()) {
      return memoryStore.cloneCampaign(sourceId, organizationId, name, createdByUserId);
    }
    const src = await persistGetForOrg(sourceId, organizationId);
    if (!src) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const srcVer =
      (await persistGetVersion(src.currentDraftVersionId)) ??
      (src.activePublishedVersionId ? await persistGetVersion(src.activePublishedVersionId) : null);
    if (!srcVer) {
      throw Object.assign(new Error("Source version missing"), { statusCode: 500, code: "VERSION_MISSING" });
    }
    const created = await this.create({
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
    await this.updateCampaign(created.campaign.id, organizationId, {
      internalDescription: src.internalDescription ?? null,
    });
    await this.updateDraftVersion(created.campaign.id, organizationId, {
      disclaimer: srcVer.disclaimer,
      trackingEnabled: srcVer.trackingEnabled,
      plainTextOverride: srcVer.plainTextOverride ?? null,
      utm: srcVer.utm ?? null,
      ctaLabel: srcVer.ctaLabel,
      ctaUrl: srcVer.ctaUrl,
    });
    const campaign = (await persistGetForOrg(created.campaign.id, organizationId))!;
    const version = (await persistGetVersion(campaign.currentDraftVersionId))!;
    return { campaign, version };
  },
};

export type { MarketingCampaignAction, MarketingCampaignStatus };
