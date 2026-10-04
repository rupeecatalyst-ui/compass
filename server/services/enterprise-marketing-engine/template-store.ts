/**
 * CO-MARKETING-MKT-04 / REDESIGN-007 — Organisation-scoped content templates.
 * Prisma when available; in-memory otherwise. Missing table fails closed to memory.
 * Do not apply the companion migration without Product Owner approval.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  buildMarketingTemplateVersion,
  type MarketingTemplateVersionInput,
} from "@/lib/enterprise-marketing-engine/template-versioning";
import type {
  MarketingContentBlock,
  MarketingContentDocument,
  MarketingContentTemplate,
  MarketingReusableBlock,
} from "@/types/enterprise-marketing-campaign";
import type { MarketingChannel } from "@/constants/enterprise-marketing-engine";
import type {
  MarketingTemplateCategory,
  MarketingTemplateStatus,
} from "@/constants/enterprise-marketing-engine/content";

const templates = new Map<string, MarketingContentTemplate>();
const reusableBlocks = new Map<string, MarketingReusableBlock>();

function nowIso() {
  return new Date().toISOString();
}

function asJson<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

type TemplateRow = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  channel: string;
  subject: string;
  previewText: string;
  contentJson: Prisma.JsonValue;
  disclaimer: string | null;
  category: string;
  status: string;
  origin: string;
  versionNumber: number;
  parentTemplateId: string | null;
  immutable: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type TemplateDelegate = {
  findMany: (args: unknown) => Promise<TemplateRow[]>;
  findUnique: (args: unknown) => Promise<TemplateRow | null>;
  upsert: (args: unknown) => Promise<TemplateRow>;
  update: (args: unknown) => Promise<TemplateRow>;
};

function templateDelegate(): TemplateDelegate | null {
  if (!isEnterprisePersistencePrisma()) return null;
  const client = prisma as typeof prisma & {
    enterpriseMarketingContentTemplate?: TemplateDelegate;
  };
  return client.enterpriseMarketingContentTemplate ?? null;
}

function isMissingTable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String(err.code) : "";
  return code === "P2021" || code === "P2022" || /does not exist/i.test(err instanceof Error ? err.message : "");
}

function mapRow(row: TemplateRow): MarketingContentTemplate {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    description: row.description,
    channel: row.channel as MarketingChannel,
    subject: row.subject,
    previewText: row.previewText,
    content: row.contentJson as MarketingContentDocument,
    disclaimer: row.disclaimer,
    category: row.category as MarketingTemplateCategory,
    status: row.status as MarketingTemplateStatus,
    origin: row.origin as MarketingContentTemplate["origin"],
    versionNumber: row.versionNumber,
    parentTemplateId: row.parentTemplateId,
    immutable: row.immutable,
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function remember(template: MarketingContentTemplate): MarketingContentTemplate {
  templates.set(template.id, template);
  return template;
}

export type MarketingTemplateSaveInput = MarketingTemplateVersionInput;

function buildTemplate(
  input: MarketingTemplateSaveInput,
  prev: MarketingContentTemplate | null,
  ts: string,
): MarketingContentTemplate {
  return buildMarketingTemplateVersion({ ...input, now: ts }, prev);
}

async function persistPrisma(next: MarketingContentTemplate): Promise<MarketingContentTemplate | null> {
  const delegate = templateDelegate();
  if (!delegate) return null;
  try {
    const row = await delegate.upsert({
      where: { id: next.id },
      create: {
        id: next.id,
        organizationId: next.organizationId,
        name: next.name,
        description: next.description,
        channel: next.channel,
        subject: next.subject,
        previewText: next.previewText,
        contentJson: asJson(next.content),
        disclaimer: next.disclaimer,
        category: next.category,
        status: next.status,
        origin: next.origin,
        versionNumber: next.versionNumber,
        parentTemplateId: next.parentTemplateId,
        immutable: next.immutable,
        lastUsedAt: next.lastUsedAt ? new Date(next.lastUsedAt) : null,
        createdAt: new Date(next.createdAt),
        updatedAt: new Date(next.updatedAt),
      },
      update: {
        name: next.name,
        description: next.description,
        channel: next.channel,
        subject: next.subject,
        previewText: next.previewText,
        contentJson: asJson(next.content),
        disclaimer: next.disclaimer,
        category: next.category,
        status: next.status,
        origin: next.origin,
        versionNumber: next.versionNumber,
        parentTemplateId: next.parentTemplateId,
        immutable: next.immutable,
        lastUsedAt: next.lastUsedAt ? new Date(next.lastUsedAt) : null,
        updatedAt: new Date(next.updatedAt),
      },
    });
    return mapRow(row);
  } catch (err) {
    if (isMissingTable(err)) return null;
    throw err;
  }
}

export const marketingTemplateStore = {
  list(organizationId: string): MarketingContentTemplate[] {
    return [...templates.values()]
      .filter((t) => t.organizationId === organizationId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async listDurable(organizationId: string): Promise<MarketingContentTemplate[]> {
    const delegate = templateDelegate();
    if (!delegate) return this.list(organizationId);
    try {
      const rows = await delegate.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" },
      });
      const mapped = rows.map(mapRow);
      for (const row of mapped) remember(row);
      return mapped;
    } catch (err) {
      if (isMissingTable(err)) return this.list(organizationId);
      throw err;
    }
  },

  getForOrg(id: string, organizationId: string): MarketingContentTemplate | null {
    const t = templates.get(id);
    if (!t || t.organizationId !== organizationId) return null;
    return t;
  },

  async getForOrgDurable(id: string, organizationId: string): Promise<MarketingContentTemplate | null> {
    const memory = this.getForOrg(id, organizationId);
    if (memory) return memory;
    const delegate = templateDelegate();
    if (!delegate) return null;
    try {
      const row = await delegate.findUnique({ where: { id } });
      if (!row || row.organizationId !== organizationId) return null;
      return remember(mapRow(row));
    } catch (err) {
      if (isMissingTable(err)) return null;
      throw err;
    }
  },

  save(input: MarketingTemplateSaveInput): MarketingContentTemplate {
    const ts = nowIso();
    const prev = input.id?.trim() ? templates.get(input.id.trim()) ?? null : null;
    if (prev && prev.organizationId !== input.organizationId) {
      throw Object.assign(new Error("Template belongs to another organization"), {
        statusCode: 403,
        code: "FORBIDDEN",
      });
    }
    const next = buildTemplate(input, prev, ts);
    remember(next);
    void persistPrisma(next);
    return next;
  },

  async saveDurable(input: MarketingTemplateSaveInput): Promise<MarketingContentTemplate> {
    const ts = nowIso();
    const prev = input.id?.trim()
      ? (await this.getForOrgDurable(input.id.trim(), input.organizationId)) ??
        (templates.get(input.id.trim()) ?? null)
      : null;
    if (prev && prev.organizationId !== input.organizationId) {
      throw Object.assign(new Error("Template belongs to another organization"), {
        statusCode: 403,
        code: "FORBIDDEN",
      });
    }
    const next = buildTemplate(input, prev, ts);
    const persisted = await persistPrisma(next);
    return remember(persisted ?? next);
  },

  markUsed(id: string, organizationId: string): MarketingContentTemplate | null {
    const current = this.getForOrg(id, organizationId);
    if (!current) return null;
    const next: MarketingContentTemplate = {
      ...current,
      lastUsedAt: nowIso(),
      updatedAt: nowIso(),
    };
    remember(next);
    const delegate = templateDelegate();
    if (delegate) {
      void delegate
        .update({
          where: { id },
          data: { lastUsedAt: new Date(next.lastUsedAt!), updatedAt: new Date(next.updatedAt) },
        })
        .catch((err: unknown) => {
          if (!isMissingTable(err)) throw err;
        });
    }
    return next;
  },
};

export const marketingReusableBlockStore = {
  list(organizationId: string): MarketingReusableBlock[] {
    return [...reusableBlocks.values()]
      .filter((b) => b.organizationId === organizationId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  save(input: {
    organizationId: string;
    name: string;
    block: MarketingContentBlock;
  }): MarketingReusableBlock {
    const ts = nowIso();
    const id = `mkt-rblk-${input.organizationId}-${Date.now()}`;
    const next: MarketingReusableBlock = {
      id,
      organizationId: input.organizationId,
      name: input.name.trim() || input.block.type,
      block: {
        ...input.block,
        id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        props: { ...input.block.props },
      },
      createdAt: ts,
      updatedAt: ts,
    };
    reusableBlocks.set(id, next);
    return next;
  },
};
