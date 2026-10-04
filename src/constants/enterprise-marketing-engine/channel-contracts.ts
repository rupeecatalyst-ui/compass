/**
 * CO-MARKETING-REDESIGN-018 — Channel contracts SSOT.
 * Email is the first operational channel. Others are inactive domain contracts.
 */

import type {
  MarketingCampaignChannelKind,
  MarketingChannelContract,
} from "@/types/enterprise-marketing-channel-contract";
import { MARKETING_CAMPAIGN_CHANNEL_KINDS } from "@/types/enterprise-marketing-channel-contract";

export { MARKETING_CAMPAIGN_CHANNEL_KINDS, MARKETING_CHANNEL_PRODUCT_SURFACES } from "@/types/enterprise-marketing-channel-contract";
export type { MarketingCampaignChannelKind, MarketingChannelProductSurface } from "@/types/enterprise-marketing-channel-contract";

export const MARKETING_CHANNEL_NOT_CONFIGURED_LABEL = "Not configured" as const;

export const MARKETING_SMS_SEGMENT_LIMITS = {
  gsm7Single: 160,
  gsm7Concatenated: 153,
  unicodeSingle: 70,
  unicodeConcatenated: 67,
  maxSegments: 6,
} as const;

export const MARKETING_WHATSAPP_OPT_IN_REQUIRED = true as const;

function baseShared(
  kind: MarketingCampaignChannelKind,
  label: string,
  extras: Omit<
    MarketingChannelContract,
    | "kind"
    | "label"
    | "sharedBasics"
    | "sharedAudience"
    | "sharedApproval"
    | "sharedAudit"
    | "sharedQualification"
    | "sharedAttribution"
  >,
): MarketingChannelContract {
  return {
    kind,
    label,
    sharedBasics: true,
    sharedAudience: true,
    sharedApproval: true,
    sharedAudit: true,
    sharedQualification: true,
    sharedAttribution: true,
    ...extras,
  };
}

export const MARKETING_CHANNEL_CONTRACTS: Record<
  MarketingCampaignChannelKind,
  MarketingChannelContract
> = {
  EMAIL: baseShared("EMAIL", "Email", {
    productSurface: "operational",
    content: { omitsEmailSubject: false, omitsEmailPreheader: false },
    consent: {
      channelKind: "EMAIL",
      optInRequired: false,
      unsubscribeRecognized: true,
      notes: "Unsubscribe, hard bounce, and spam complaint always block later email.",
    },
    sender: {
      channelKind: "EMAIL",
      fields: ["fromName", "fromAddress", "replyTo"],
      credentialsForbidden: true,
    },
    delivery: { channelKind: "EMAIL", portName: "MarketingEmailDeliveryPort", liveProviderExecute: false },
    limits: { channelKind: "EMAIL", rules: { dryRunOnly: true } },
    preview: { channelKind: "EMAIL", mode: "email_html" },
  }),
  WHATSAPP: baseShared("WHATSAPP", "WhatsApp", {
    productSurface: "not_configured",
    content: { omitsEmailSubject: true, omitsEmailPreheader: true },
    consent: {
      channelKind: "WHATSAPP",
      optInRequired: true,
      unsubscribeRecognized: true,
      notes: "WhatsApp marketing requires opt-in. Utility vs marketing templates are distinct. Template must be APPROVED.",
    },
    sender: {
      channelKind: "WHATSAPP",
      fields: ["businessDisplayName", "phoneNumberId"],
      credentialsForbidden: true,
    },
    delivery: { channelKind: "WHATSAPP", portName: "MarketingWhatsAppDeliveryPort", liveProviderExecute: false },
    limits: {
      channelKind: "WHATSAPP",
      rules: { requiresApprovedTemplate: true, forbidFreeFormBulk: true, optInRequired: true },
    },
    preview: { channelKind: "WHATSAPP", mode: "template_body" },
  }),
  SMS: baseShared("SMS", "SMS", {
    productSurface: "not_configured",
    content: { omitsEmailSubject: true, omitsEmailPreheader: true },
    consent: {
      channelKind: "SMS",
      optInRequired: true,
      unsubscribeRecognized: true,
      notes: "Future SMS uses template/compliance references and opt-in. Not a live product.",
    },
    sender: {
      channelKind: "SMS",
      fields: ["senderId", "entityId"],
      credentialsForbidden: true,
    },
    delivery: { channelKind: "SMS", portName: "MarketingSmsDeliveryPort", liveProviderExecute: false },
    limits: {
      channelKind: "SMS",
      rules: { ...MARKETING_SMS_SEGMENT_LIMITS, requiresTemplateOrComplianceRef: true },
    },
    preview: { channelKind: "SMS", mode: "sms_segments" },
  }),
  MESSENGER: baseShared("MESSENGER", "Messenger", {
    productSurface: "not_configured",
    content: { omitsEmailSubject: true, omitsEmailPreheader: true },
    consent: {
      channelKind: "MESSENGER",
      optInRequired: true,
      unsubscribeRecognized: true,
      notes: "Messenger is a future channel. Not configured.",
    },
    sender: {
      channelKind: "MESSENGER",
      fields: ["pageId"],
      credentialsForbidden: true,
    },
    delivery: { channelKind: "MESSENGER", portName: "MarketingMessengerDeliveryPort", liveProviderExecute: false },
    limits: { channelKind: "MESSENGER", rules: { liveProviderExecute: false } },
    preview: { channelKind: "MESSENGER", mode: "not_configured" },
  }),
  DIGITAL_ADS: baseShared("DIGITAL_ADS", "Digital advertising audience", {
    productSurface: "not_configured",
    content: { omitsEmailSubject: true, omitsEmailPreheader: true },
    consent: {
      channelKind: "DIGITAL_ADS",
      optInRequired: true,
      unsubscribeRecognized: false,
      notes: "Advertising audience sync is not a live product.",
    },
    sender: {
      channelKind: "DIGITAL_ADS",
      fields: ["externalAccountRef"],
      credentialsForbidden: true,
    },
    delivery: { channelKind: "DIGITAL_ADS", portName: "MarketingDigitalChannelPort", liveProviderExecute: false },
    limits: { channelKind: "DIGITAL_ADS", rules: { liveProviderExecute: false } },
    preview: { channelKind: "DIGITAL_ADS", mode: "not_configured" },
  }),
  LANDING_PAGE: baseShared("LANDING_PAGE", "Landing-page campaign", {
    productSurface: "not_configured",
    content: { omitsEmailSubject: true, omitsEmailPreheader: true },
    consent: {
      channelKind: "LANDING_PAGE",
      optInRequired: true,
      unsubscribeRecognized: false,
      notes: "Landing-page campaigns stay inactive until authorised.",
    },
    sender: {
      channelKind: "LANDING_PAGE",
      fields: ["pageHost"],
      credentialsForbidden: true,
    },
    delivery: { channelKind: "LANDING_PAGE", portName: "MarketingLandingPagePort", liveProviderExecute: false },
    limits: { channelKind: "LANDING_PAGE", rules: { liveProviderExecute: false } },
    preview: { channelKind: "LANDING_PAGE", mode: "not_configured" },
  }),
};

export const MARKETING_OPERATIONAL_CHANNEL_KIND = "EMAIL" as const;

export const MARKETING_INACTIVE_CHANNEL_KINDS = MARKETING_CAMPAIGN_CHANNEL_KINDS.filter(
  (kind) => kind !== "EMAIL",
);

/**
 * Builder picker values. EMAIL is the only selectable product.
 * DIGITAL maps to the DIGITAL_ADS contract. Extra kinds are display-only.
 */
export const MARKETING_BUILDER_CHANNEL_PICKER_OPTIONS = [
  { persistedValue: "EMAIL", kind: "EMAIL", selectable: true },
  { persistedValue: "WHATSAPP", kind: "WHATSAPP", selectable: false },
  { persistedValue: "DIGITAL", kind: "DIGITAL_ADS", selectable: false },
  { persistedValue: "SMS", kind: "SMS", selectable: false },
  { persistedValue: "MESSENGER", kind: "MESSENGER", selectable: false },
  { persistedValue: "LANDING_PAGE", kind: "LANDING_PAGE", selectable: false },
] as const;
