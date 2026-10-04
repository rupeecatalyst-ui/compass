/**
 * CO-MARKETING-REDESIGN-007 — Reusable template versioning (pure).
 * Organisation templates increment in place until immutable, then fork.
 */

import { cloneContentDocument } from "@/lib/enterprise-marketing-engine/content-blocks";
import { sanitizeMarketingContentDocument } from "@/lib/enterprise-marketing-engine/visual-editor";
import type { MarketingContentDocument, MarketingContentTemplate } from "@/types/enterprise-marketing-campaign";
import type { MarketingChannel } from "@/constants/enterprise-marketing-engine";
import type {
  MarketingTemplateCategory,
  MarketingTemplateStatus,
} from "@/constants/enterprise-marketing-engine/content";

export type MarketingTemplateVersionInput = {
  id?: string;
  organizationId: string;
  name: string;
  description?: string | null;
  channel: MarketingChannel;
  subject: string;
  previewText: string;
  content: MarketingContentDocument;
  disclaimer?: string | null;
  category?: MarketingTemplateCategory;
  status?: MarketingTemplateStatus;
  origin?: MarketingContentTemplate["origin"];
  immutable?: boolean;
  now?: string;
};

export function buildMarketingTemplateVersion(
  input: MarketingTemplateVersionInput,
  prev: MarketingContentTemplate | null,
): MarketingContentTemplate {
  const ts = input.now ?? new Date().toISOString();
  const content = sanitizeMarketingContentDocument(cloneContentDocument(input.content));
  const forkImmutable = Boolean(prev?.immutable);
  const id =
    input.id?.trim() && !forkImmutable
      ? input.id.trim()
      : `mkt-tpl-${input.organizationId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (prev && prev.organizationId !== input.organizationId) {
    throw Object.assign(new Error("Template belongs to another organization"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
  return {
    id,
    organizationId: input.organizationId,
    name: input.name.trim() || "Untitled template",
    description: input.description ?? prev?.description ?? null,
    channel: input.channel,
    subject: input.subject,
    previewText: input.previewText,
    content,
    disclaimer: input.disclaimer ?? prev?.disclaimer ?? null,
    category: input.category ?? prev?.category ?? "organisation",
    status: input.status ?? prev?.status ?? "DRAFT",
    origin: input.origin ?? prev?.origin ?? "organisation",
    versionNumber: prev ? prev.versionNumber + 1 : 1,
    parentTemplateId: forkImmutable && prev ? prev.id : prev && !forkImmutable ? prev.parentTemplateId : null,
    immutable: input.immutable ?? false,
    lastUsedAt: prev?.lastUsedAt ?? null,
    createdAt: forkImmutable || !prev ? ts : prev.createdAt,
    updatedAt: ts,
  };
}
