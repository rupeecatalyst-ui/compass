/**
 * CO-MARKETING-REDESIGN-008 — Focused preview inspection (desktop/mobile, links, images, unsubscribe).
 */

import {
  MARKETING_PREVIEW_DESKTOP_MAX_WIDTH,
  MARKETING_PREVIEW_MOBILE_MAX_WIDTH,
} from "@/constants/enterprise-marketing-engine/personalisation";
import { hasMarketingUnsubscribeBlock } from "@/lib/enterprise-marketing-engine/visual-editor";
import { isUnsafeMarketingHref } from "@/lib/enterprise-marketing-engine/html-sanitize";
import type { MarketingContentDocument } from "@/types/enterprise-marketing-campaign";
import type { MarketingPersonalizationToken } from "@/constants/enterprise-marketing-engine/content";
import type { MarketingPersonalisationSampleRecipient } from "@/lib/enterprise-marketing-engine/personalisation-catalogue";

export type MarketingPreviewLink = {
  href: string;
  kind: "cta" | "social" | "unsubscribe" | "other";
};

export type MarketingPreviewInspection = {
  desktopMaxWidth: number;
  mobileMaxWidth: number;
  linkInventory: MarketingPreviewLink[];
  missingImageWarnings: string[];
  unsubscribeVerified: boolean;
  unsubscribeInHtml: boolean;
};

export function inspectMarketingPreviewWorkspace(input: {
  content: MarketingContentDocument;
  htmlDesktop: string;
  htmlMobile: string;
}): MarketingPreviewInspection {
  const linkInventory: MarketingPreviewLink[] = [];
  for (const block of input.content.blocks) {
    if (block.type === "cta" && typeof block.props.url === "string" && block.props.url.trim()) {
      linkInventory.push({ href: String(block.props.url), kind: "cta" });
    }
    if (block.type === "social") {
      for (const key of ["linkedin", "website"] as const) {
        const href = block.props[key];
        if (typeof href === "string" && href.trim()) linkInventory.push({ href, kind: "social" });
      }
    }
    if (block.type === "unsubscribe") {
      linkInventory.push({
        href: typeof block.props.href === "string" ? String(block.props.href) : "{{unsubscribeUrl}}",
        kind: "unsubscribe",
      });
    }
  }

  const missingImageWarnings: string[] = [];
  for (const block of input.content.blocks) {
    if (block.type !== "image" && block.type !== "hero_image" && block.type !== "logo") continue;
    const url = typeof block.props.url === "string" ? block.props.url.trim() : "";
    if (!url) missingImageWarnings.push(`${block.type} is missing an image URL`);
    else if (isUnsafeMarketingHref(url)) missingImageWarnings.push(`${block.type} has an unsafe image URL`);
  }

  const unsubscribeInHtml = input.htmlDesktop.includes('data-marketing-unsubscribe="true"');
  return {
    desktopMaxWidth: MARKETING_PREVIEW_DESKTOP_MAX_WIDTH,
    mobileMaxWidth: MARKETING_PREVIEW_MOBILE_MAX_WIDTH,
    linkInventory,
    missingImageWarnings,
    unsubscribeVerified: hasMarketingUnsubscribeBlock(input.content) && unsubscribeInHtml,
    unsubscribeInHtml,
  };
}

export function assertMarketingDesktopMobileRender(htmlDesktop: string, htmlMobile: string): void {
  if (!htmlDesktop.includes(`max-width:${MARKETING_PREVIEW_DESKTOP_MAX_WIDTH}px`)) {
    throw new Error("Desktop preview must render at 600px max width");
  }
  if (!htmlMobile.includes(`max-width:${MARKETING_PREVIEW_MOBILE_MAX_WIDTH}px`)) {
    throw new Error("Mobile preview must render at 360px max width");
  }
}

export function pickAudiencePreviewSample(
  samples: MarketingPersonalisationSampleRecipient[],
  selectedId?: string | null,
): MarketingPersonalisationSampleRecipient | null {
  if (!samples.length) return null;
  return samples.find((row) => row.id === selectedId) ?? samples[0] ?? null;
}

export function describeMarketingPreviewSample(input: {
  sample: MarketingPersonalisationSampleRecipient | null;
  senderName: string;
}): {
  available: boolean;
  source: "audience_preview" | "unavailable";
  label: string | null;
  values: Partial<Record<MarketingPersonalizationToken, string>>;
  notice: string;
} {
  if (!input.sample) {
    return {
      available: false,
      source: "unavailable",
      label: null,
      values: { senderName: input.senderName },
      notice:
        "Sample recipient unavailable. Run an audience eligibility preview with at least one eligible row. Invented fixture names are not used as the only sample.",
    };
  }
  return {
    available: true,
    source: "audience_preview",
    label: input.sample.label,
    values: { ...input.sample.values, senderName: input.senderName },
    notice: `Resolved from audience preview: ${input.sample.label}`,
  };
}
