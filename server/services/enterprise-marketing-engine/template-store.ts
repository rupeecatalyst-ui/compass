/**
 * CO-MARKETING-MKT-04 — Content templates + reusable blocks store.
 */

import { cloneContentDocument } from "@/lib/enterprise-marketing-engine/content-blocks";
import type {
  MarketingContentBlock,
  MarketingContentDocument,
  MarketingContentTemplate,
  MarketingReusableBlock,
} from "@/types/enterprise-marketing-campaign";
import type { MarketingChannel } from "@/constants/enterprise-marketing-engine";

const templates = new Map<string, MarketingContentTemplate>();
const reusableBlocks = new Map<string, MarketingReusableBlock>();

function nowIso() {
  return new Date().toISOString();
}

export const marketingTemplateStore = {
  list(organizationId: string): MarketingContentTemplate[] {
    return [...templates.values()]
      .filter((t) => t.organizationId === organizationId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  getForOrg(id: string, organizationId: string): MarketingContentTemplate | null {
    const t = templates.get(id);
    if (!t || t.organizationId !== organizationId) return null;
    return t;
  },

  save(input: {
    id?: string;
    organizationId: string;
    name: string;
    description?: string | null;
    channel: MarketingChannel;
    subject: string;
    previewText: string;
    content: MarketingContentDocument;
    disclaimer?: string | null;
  }): MarketingContentTemplate {
    const ts = nowIso();
    const id = input.id?.trim() || `mkt-tpl-${input.organizationId}-${Date.now()}`;
    const prev = templates.get(id);
    if (prev && prev.organizationId !== input.organizationId) {
      throw Object.assign(new Error("Template belongs to another organization"), {
        statusCode: 403,
        code: "FORBIDDEN",
      });
    }
    const next: MarketingContentTemplate = {
      id,
      organizationId: input.organizationId,
      name: input.name.trim() || "Untitled template",
      description: input.description ?? null,
      channel: input.channel,
      subject: input.subject,
      previewText: input.previewText,
      content: cloneContentDocument(input.content),
      disclaimer: input.disclaimer ?? null,
      createdAt: prev?.createdAt ?? ts,
      updatedAt: ts,
    };
    templates.set(id, next);
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
