/**
 * CO-MARKETING-REDESIGN-007 — Organisation-scoped visual template gallery.
 * Thumbnails are generated from structured blocks — no external asset downloads.
 */

import { cloneContentDocument, createEmptyContentDocument } from "@/lib/enterprise-marketing-engine/content-blocks";
import { MARKETING_STANDARD_EMAIL_TEMPLATES } from "@/lib/enterprise-marketing-engine/standard-email-templates";
import { hasMarketingUnsubscribeBlock } from "@/lib/enterprise-marketing-engine/visual-editor";
import type {
  MarketingContentDocument,
  MarketingContentTemplate,
} from "@/types/enterprise-marketing-campaign";
import type { MarketingTemplateCategory, MarketingTemplateStatus } from "@/constants/enterprise-marketing-engine/content";

export const MARKETING_BLANK_TEMPLATE_ID = "mkt-tpl-blank";

export type MarketingTemplateGallerySectionId =
  | "blank"
  | "organisation"
  | "standard"
  | "recent";

export type MarketingTemplateGalleryCard = {
  id: string;
  name: string;
  category: MarketingTemplateCategory;
  status: MarketingTemplateStatus | "BLANK";
  updatedAt: string;
  lastUsedAt: string | null;
  thumbnailSvg: string;
  origin: MarketingContentTemplate["origin"] | "blank";
  versionNumber: number;
  template: MarketingContentTemplate;
};

export type MarketingTemplateGallerySection = {
  id: MarketingTemplateGallerySectionId;
  title: string;
  cards: MarketingTemplateGalleryCard[];
};

const BLOCK_COLORS: Record<string, string> = {
  header: "#0f172a",
  text: "#94a3b8",
  image: "#cbd5e1",
  cta: "#0f766e",
  divider: "#e2e8f0",
  spacer: "#f1f5f9",
  columns: "#64748b",
  social: "#334155",
  footer: "#475569",
  unsubscribe: "#0f766e",
};

export function blankMarketingEmailTemplate(): MarketingContentTemplate {
  const ts = "2026-09-05T00:00:00.000Z";
  return {
    id: MARKETING_BLANK_TEMPLATE_ID,
    organizationId: "blank",
    name: "Blank email",
    description: "Start from a heading, paragraph, button, footer, and unsubscribe block.",
    channel: "EMAIL",
    subject: "",
    previewText: "",
    content: createEmptyContentDocument(),
    disclaimer: null,
    category: "blank",
    status: "DRAFT",
    origin: "blank",
    versionNumber: 1,
    parentTemplateId: null,
    immutable: false,
    lastUsedAt: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function generateMarketingTemplateThumbnailSvg(doc: MarketingContentDocument): string {
  const rows = doc.blocks.slice(0, 8);
  const bars = rows
    .map((block, index) => {
      const fill = BLOCK_COLORS[block.type] ?? "#cbd5e1";
      const y = 10 + index * 14;
      const width = block.type === "cta" || block.type === "unsubscribe" ? 70 : 140;
      const x = block.type === "cta" || block.type === "unsubscribe" ? 45 : 10;
      return `<rect x="${x}" y="${y}" width="${width}" height="10" rx="3" fill="${fill}"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 130" role="img" aria-hidden="true"><rect width="160" height="130" rx="10" fill="#f8fafc"/><rect x="6" y="6" width="148" height="118" rx="8" fill="#ffffff" stroke="#e2e8f0"/>${bars}</svg>`;
}

function toCard(template: MarketingContentTemplate): MarketingTemplateGalleryCard {
  return {
    id: template.id,
    name: template.name,
    category: template.category,
    status: template.origin === "blank" ? "BLANK" : template.status,
    updatedAt: template.updatedAt,
    lastUsedAt: template.lastUsedAt,
    thumbnailSvg: generateMarketingTemplateThumbnailSvg(template.content),
    origin: template.origin,
    versionNumber: template.versionNumber,
    template,
  };
}

export function composeMarketingTemplateGallery(input: {
  organizationId: string;
  saved: MarketingContentTemplate[];
}): MarketingTemplateGallerySection[] {
  const orgSaved = input.saved.filter((row) => row.organizationId === input.organizationId);
  const recent = [...orgSaved]
    .filter((row) => Boolean(row.lastUsedAt))
    .sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""))
    .slice(0, 6);

  return [
    { id: "blank", title: "Blank email", cards: [toCard(blankMarketingEmailTemplate())] },
    {
      id: "organisation",
      title: "Saved organisation templates",
      cards: orgSaved
        .filter((row) => row.origin === "organisation" || row.category === "organisation")
        .map(toCard),
    },
    {
      id: "standard",
      title: "Approved standard templates",
      cards: MARKETING_STANDARD_EMAIL_TEMPLATES.filter((row) => row.status === "APPROVED").map(toCard),
    },
    { id: "recent", title: "Recently used templates", cards: recent.map(toCard) },
  ];
}

export function resolveMarketingGalleryTemplate(
  id: string,
  organizationId: string,
  saved: MarketingContentTemplate[],
): MarketingContentTemplate | null {
  if (id === MARKETING_BLANK_TEMPLATE_ID) return blankMarketingEmailTemplate();
  const standard = MARKETING_STANDARD_EMAIL_TEMPLATES.find((row) => row.id === id);
  if (standard) return standard;
  return saved.find((row) => row.id === id && row.organizationId === organizationId) ?? null;
}

export function applyMarketingGalleryTemplate(template: MarketingContentTemplate): {
  templateId: string;
  subject: string;
  previewText: string;
  content: MarketingContentDocument;
  hasUnsubscribe: boolean;
} {
  const content = cloneContentDocument(template.content);
  return {
    templateId: template.id,
    subject: template.subject,
    previewText: template.previewText,
    content,
    hasUnsubscribe: hasMarketingUnsubscribeBlock(content),
  };
}
