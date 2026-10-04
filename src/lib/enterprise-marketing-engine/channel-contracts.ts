/**
 * CO-MARKETING-REDESIGN-018 — Channel contract helpers.
 * Email remains operational. Non-email providers cannot execute.
 */

import {
  MARKETING_CHANNEL_CONTRACTS,
  MARKETING_CHANNEL_NOT_CONFIGURED_LABEL,
  MARKETING_OPERATIONAL_CHANNEL_KIND,
  MARKETING_SMS_SEGMENT_LIMITS,
  MARKETING_WHATSAPP_OPT_IN_REQUIRED,
} from "@/constants/enterprise-marketing-engine/channel-contracts";
import { EnterpriseMarketingSafetyError } from "@/lib/enterprise-marketing-engine/safety";
import type {
  MarketingCampaignChannelKind,
  MarketingChannelProductSurface,
  MarketingChannelSpecificContent,
  MarketingSmsChannelContent,
  MarketingWhatsAppChannelContent,
} from "@/types/enterprise-marketing-channel-contract";

const GSM7_EXTRA = new Set("^{}\\[~]|€");

export function marketingChannelContract(kind: MarketingCampaignChannelKind) {
  return MARKETING_CHANNEL_CONTRACTS[kind];
}

export function marketingChannelProductSurface(
  kind: MarketingCampaignChannelKind,
): MarketingChannelProductSurface {
  return MARKETING_CHANNEL_CONTRACTS[kind].productSurface;
}

export function marketingChannelIsOperational(kind: MarketingCampaignChannelKind): boolean {
  return kind === MARKETING_OPERATIONAL_CHANNEL_KIND;
}

export function marketingChannelLiveProviderCanExecute(
  kind: MarketingCampaignChannelKind,
): false {
  void kind;
  return false;
}

/** Campaign execution product: Email only. WhatsApp dry-run infrastructure is not a live product. */
export function marketingChannelCanExecuteAsProduct(kind: MarketingCampaignChannelKind): boolean {
  return kind === "EMAIL";
}

export function marketingPersistedChannelKind(
  channel: "EMAIL" | "WHATSAPP" | "DIGITAL",
): MarketingCampaignChannelKind {
  if (channel === "DIGITAL") return "DIGITAL_ADS";
  return channel;
}

export function emptyMarketingChannelContent(
  kind: MarketingCampaignChannelKind,
): MarketingChannelSpecificContent {
  switch (kind) {
    case "EMAIL":
      return { kind: "EMAIL", subject: "", preheader: "", htmlDocument: null };
    case "WHATSAPP":
      return {
        kind: "WHATSAPP",
        templateId: "",
        templateName: "",
        category: "MARKETING",
        approvalState: "DRAFT",
        language: "en",
        variables: {},
        optInRequired: true,
      };
    case "SMS":
      return { kind: "SMS", body: "", templateRef: null, complianceRef: null, encoding: "gsm7" };
    case "MESSENGER":
      return { kind: "MESSENGER", templateRef: null, body: "" };
    case "DIGITAL_ADS":
      return { kind: "DIGITAL_ADS", audienceSyncRef: null, network: null };
    case "LANDING_PAGE":
      return { kind: "LANDING_PAGE", pagePath: null, formRef: null };
  }
}

export function marketingChannelContentHasSubject(content: MarketingChannelSpecificContent): boolean {
  return content.kind === "EMAIL" && "subject" in content;
}

export function marketingChannelContentHasPreheader(content: MarketingChannelSpecificContent): boolean {
  return content.kind === "EMAIL" && "preheader" in content;
}

export function marketingSmsUsesUnicode(body: string): boolean {
  for (const char of body) {
    const code = char.codePointAt(0) ?? 0;
    if (code > 127 && !GSM7_EXTRA.has(char)) return true;
  }
  return false;
}

export function estimateMarketingSmsSegments(body: string): {
  characters: number;
  encoding: MarketingSmsChannelContent["encoding"];
  segments: number;
  limitPerSegment: number;
} {
  const unicode = marketingSmsUsesUnicode(body);
  const encoding = unicode ? "unicode" : "gsm7";
  const single = unicode ? MARKETING_SMS_SEGMENT_LIMITS.unicodeSingle : MARKETING_SMS_SEGMENT_LIMITS.gsm7Single;
  const concat = unicode
    ? MARKETING_SMS_SEGMENT_LIMITS.unicodeConcatenated
    : MARKETING_SMS_SEGMENT_LIMITS.gsm7Concatenated;
  const characters = body.length;
  if (characters === 0) {
    return { characters: 0, encoding, segments: 0, limitPerSegment: single };
  }
  if (characters <= single) {
    return { characters, encoding, segments: 1, limitPerSegment: single };
  }
  const segments = Math.min(
    MARKETING_SMS_SEGMENT_LIMITS.maxSegments,
    Math.ceil(characters / concat),
  );
  return { characters, encoding, segments, limitPerSegment: concat };
}

export function marketingWhatsAppTemplateReadyForSend(
  content: Pick<MarketingWhatsAppChannelContent, "approvalState" | "optInRequired" | "category">,
): boolean {
  if (content.optInRequired !== MARKETING_WHATSAPP_OPT_IN_REQUIRED) return false;
  if (content.approvalState !== "APPROVED") return false;
  return content.category === "MARKETING" || content.category === "UTILITY";
}

export function previewMarketingChannelContent(content: MarketingChannelSpecificContent): {
  mode: string;
  label: string;
  detail: string;
} {
  const contract = MARKETING_CHANNEL_CONTRACTS[content.kind];
  if (contract.productSurface !== "operational") {
    return {
      mode: "not_configured",
      label: MARKETING_CHANNEL_NOT_CONFIGURED_LABEL,
      detail: `${contract.label} is not a functioning product.`,
    };
  }
  if (content.kind === "EMAIL") {
    return {
      mode: "email_html",
      label: content.subject.trim() || "Untitled email",
      detail: content.preheader,
    };
  }
  return {
    mode: "not_configured",
    label: MARKETING_CHANNEL_NOT_CONFIGURED_LABEL,
    detail: `${contract.label} is not a functioning product.`,
  };
}

export function assertMarketingNonEmailProviderExecute(
  kind: MarketingCampaignChannelKind,
  operation = "channel.provider.execute",
): void {
  if (kind === "EMAIL") return;
  throw new EnterpriseMarketingSafetyError(`${operation}:${kind.toLowerCase()}`);
}

export function assertSmsDeliveryAllowed(operation = "sms.deliver"): never {
  throw new EnterpriseMarketingSafetyError(`${operation}:not_configured`);
}

export function assertMessengerDeliveryAllowed(operation = "messenger.deliver"): never {
  throw new EnterpriseMarketingSafetyError(`${operation}:not_configured`);
}

export function assertLandingPageExecuteAllowed(operation = "landing_page.execute"): never {
  throw new EnterpriseMarketingSafetyError(`${operation}:not_configured`);
}

export function assertDigitalAdsExecuteAllowed(operation = "digital_ads.execute"): never {
  throw new EnterpriseMarketingSafetyError(`${operation}:not_configured`);
}
