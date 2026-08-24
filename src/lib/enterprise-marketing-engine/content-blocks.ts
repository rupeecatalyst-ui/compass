/**
 * CO-MARKETING-MKT-04 / MKT-08 — Block document helpers.
 */

import type { MarketingContentBlockType } from "@/constants/enterprise-marketing-engine/content";
import type {
  MarketingContentBlock,
  MarketingContentDocument,
} from "@/types/enterprise-marketing-campaign";

export function createEmptyContentDocument(): MarketingContentDocument {
  return {
    version: 1,
    blocks: [
      {
        id: `blk-${Date.now()}-header`,
        type: "header",
        props: { title: "Rupee Catalyst", subtitle: "" },
      },
      {
        id: `blk-${Date.now()}-text`,
        type: "text",
        props: {
          html: "Hello {{firstName}},\n\nWe have an update for professionals in {{city}} from {{senderName}} regarding {{product}}.",
        },
      },
      {
        id: `blk-${Date.now()}-cta`,
        type: "cta",
        props: { label: "Learn more", url: "https://rupeecatalyst.com" },
      },
      {
        id: `blk-${Date.now()}-disclaimer`,
        type: "disclaimer",
        props: {
          text: "This communication is for informational purposes. Terms apply.",
        },
      },
      {
        id: `blk-${Date.now()}-footer`,
        type: "footer",
        props: { text: "© Rupee Catalyst · Unsubscribe link will appear at send time." },
      },
    ],
  };
}

export function createBlock(
  type: MarketingContentBlockType,
  props?: Record<string, unknown>,
): MarketingContentBlock {
  const id = `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const defaults: Record<MarketingContentBlockType, Record<string, unknown>> = {
    header: { title: "Campaign header", subtitle: "" },
    logo: { assetId: null, alt: "Logo", url: "" },
    hero_image: { assetId: null, alt: "Hero", url: "", caption: "" },
    text: { html: "Enter your message. Use {{firstName}} for personalization." },
    image: { assetId: null, alt: "Image", url: "" },
    image_text: { assetId: null, alt: "Image", url: "", html: "Supporting text" },
    product_card: { title: "Product", body: "Description", amountLabel: "" },
    offer_card: { title: "Offer", body: "Limited offer details", badge: "Offer" },
    cta: { label: "Call to action", url: "https://rupeecatalyst.com" },
    divider: {},
    spacer: { heightPx: "24" },
    highlight: {
      title: "Key highlight",
      body: "Share an important benefit or message.",
      tone: "teal",
    },
    contact: {
      name: "{{senderName}}",
      email: "campaigns@campaign.example.rupeecatalyst.com",
      phone: "",
      address: "",
    },
    footer: { text: "Footer / signature" },
    disclaimer: { text: "Disclaimer text" },
  };
  return { id, type, props: { ...defaults[type], ...(props ?? {}) } };
}

export function cloneContentDocument(doc: MarketingContentDocument): MarketingContentDocument {
  return {
    version: 1,
    blocks: doc.blocks.map((b) => ({
      id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: b.type,
      props: { ...b.props },
    })),
  };
}

/**
 * Keep form-level CTA / disclaimer in sync with content blocks so email-render
 * (which only renders blocks) matches what operators configure in Campaign Builder.
 * Does not invent content — only upserts existing block types when values are set.
 */
export function syncCampaignFormFieldsIntoContent(
  doc: MarketingContentDocument,
  fields: {
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    disclaimer?: string | null;
  },
): MarketingContentDocument {
  const blocks = [...doc.blocks];
  const ctaLabel = fields.ctaLabel?.trim() ?? "";
  const ctaUrl = fields.ctaUrl?.trim() ?? "";
  const disclaimer = fields.disclaimer?.trim() ?? "";

  if (ctaLabel || ctaUrl) {
    const ctaIdx = blocks.findIndex((b) => b.type === "cta");
    if (ctaIdx >= 0) {
      blocks[ctaIdx] = {
        ...blocks[ctaIdx],
        props: {
          ...blocks[ctaIdx].props,
          ...(ctaLabel ? { label: ctaLabel } : {}),
          ...(ctaUrl ? { url: ctaUrl } : {}),
        },
      };
    } else if (ctaLabel && ctaUrl) {
      blocks.push(createBlock("cta", { label: ctaLabel, url: ctaUrl }));
    }
  }

  if (disclaimer) {
    const discIdx = blocks.findIndex((b) => b.type === "disclaimer");
    if (discIdx >= 0) {
      blocks[discIdx] = {
        ...blocks[discIdx],
        props: { ...blocks[discIdx].props, text: disclaimer },
      };
    } else {
      const footerIdx = blocks.findIndex((b) => b.type === "footer");
      const block = createBlock("disclaimer", { text: disclaimer });
      if (footerIdx >= 0) blocks.splice(footerIdx, 0, block);
      else blocks.push(block);
    }
  }

  return { ...doc, blocks };
}
