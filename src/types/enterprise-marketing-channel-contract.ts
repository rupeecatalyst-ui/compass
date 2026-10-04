/**
 * CO-MARKETING-REDESIGN-018 — Multichannel campaign contracts.
 * Domain schemas only. Email is the sole operational product. No live non-email send.
 */

export const MARKETING_CAMPAIGN_CHANNEL_KINDS = [
  "EMAIL",
  "WHATSAPP",
  "SMS",
  "MESSENGER",
  "DIGITAL_ADS",
  "LANDING_PAGE",
] as const;

export type MarketingCampaignChannelKind = (typeof MARKETING_CAMPAIGN_CHANNEL_KINDS)[number];

export const MARKETING_CHANNEL_PRODUCT_SURFACES = ["operational", "not_configured", "hidden"] as const;
export type MarketingChannelProductSurface = (typeof MARKETING_CHANNEL_PRODUCT_SURFACES)[number];

export type MarketingEmailChannelContent = {
  kind: "EMAIL";
  subject: string;
  preheader: string;
  htmlDocument: unknown;
};

export type MarketingWhatsAppChannelContent = {
  kind: "WHATSAPP";
  templateId: string;
  templateName: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION" | "SERVICE";
  approvalState: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "DISABLED";
  language: string;
  variables: Record<string, string>;
  optInRequired: true;
};

export type MarketingSmsChannelContent = {
  kind: "SMS";
  body: string;
  templateRef: string | null;
  complianceRef: string | null;
  encoding: "gsm7" | "unicode";
};

export type MarketingMessengerChannelContent = {
  kind: "MESSENGER";
  templateRef: string | null;
  body: string;
};

export type MarketingDigitalAdsChannelContent = {
  kind: "DIGITAL_ADS";
  audienceSyncRef: string | null;
  network: string | null;
};

export type MarketingLandingPageChannelContent = {
  kind: "LANDING_PAGE";
  pagePath: string | null;
  formRef: string | null;
};

export type MarketingChannelSpecificContent =
  | MarketingEmailChannelContent
  | MarketingWhatsAppChannelContent
  | MarketingSmsChannelContent
  | MarketingMessengerChannelContent
  | MarketingDigitalAdsChannelContent
  | MarketingLandingPageChannelContent;

export type MarketingChannelConsentRule = {
  channelKind: MarketingCampaignChannelKind;
  optInRequired: boolean;
  unsubscribeRecognized: boolean;
  notes: string;
};

export type MarketingChannelSenderIdentityContract = {
  channelKind: MarketingCampaignChannelKind;
  fields: string[];
  credentialsForbidden: true;
};

export type MarketingChannelDeliveryContract = {
  channelKind: MarketingCampaignChannelKind;
  portName: string;
  liveProviderExecute: false;
};

export type MarketingChannelLimitContract = {
  channelKind: MarketingCampaignChannelKind;
  rules: Record<string, number | string | boolean>;
};

export type MarketingChannelPreviewContract = {
  channelKind: MarketingCampaignChannelKind;
  mode: "email_html" | "template_body" | "sms_segments" | "not_configured";
};

export type MarketingChannelContract = {
  kind: MarketingCampaignChannelKind;
  label: string;
  productSurface: MarketingChannelProductSurface;
  sharedBasics: true;
  sharedAudience: true;
  sharedApproval: true;
  sharedAudit: true;
  sharedQualification: true;
  sharedAttribution: true;
  content: { omitsEmailSubject: boolean; omitsEmailPreheader: boolean };
  consent: MarketingChannelConsentRule;
  sender: MarketingChannelSenderIdentityContract;
  delivery: MarketingChannelDeliveryContract;
  limits: MarketingChannelLimitContract;
  preview: MarketingChannelPreviewContract;
};
