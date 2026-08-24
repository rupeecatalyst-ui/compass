/**
 * CO-MARKETING — Campaign Builder wizard IA (UX only — does not change engine model).
 */

export const MARKETING_CAMPAIGN_BUILDER_STEPS = [
  {
    id: "basics",
    number: 1,
    title: "Campaign Basics",
    shortTitle: "Basics",
    description: "Name, objective, product, and description.",
  },
  {
    id: "audience",
    number: 2,
    title: "Audience",
    shortTitle: "Audience",
    description: "Who should receive this campaign.",
  },
  {
    id: "channel_message",
    number: 3,
    title: "Channel & Message",
    shortTitle: "Message",
    description: "Channel, content, and live customer-facing preview.",
  },
  {
    id: "personalisation",
    number: 4,
    title: "Personalisation",
    shortTitle: "Personalise",
    description: "Variables and sample values for preview.",
  },
  {
    id: "schedule",
    number: 5,
    title: "Schedule & Delivery",
    shortTitle: "Schedule",
    description: "When to send, pacing, and test send.",
  },
  {
    id: "review",
    number: 6,
    title: "Review & Launch",
    shortTitle: "Review",
    description: "Confirm everything before launch.",
  },
] as const;

export type MarketingCampaignBuilderStepId =
  (typeof MARKETING_CAMPAIGN_BUILDER_STEPS)[number]["id"];

/** Common campaign objectives — presentation labels only. */
export const MARKETING_CAMPAIGN_OBJECTIVE_OPTIONS = [
  "Lead Generation",
  "Product Awareness",
  "Cross-sell / Upsell",
  "Re-engagement",
  "Partner Activation",
  "Event / Webinar",
  "Other",
] as const;

/**
 * Conceptual audience categories for RM/marketing users.
 * Selection still binds a saved Marketing Audience definition (engine SSOT).
 */
export const MARKETING_AUDIENCE_CATEGORY_OPTIONS = [
  {
    id: "existing_customers",
    label: "Existing Customers",
    hint: "Active or past customers in your Sheets audience.",
  },
  {
    id: "prospects",
    label: "Prospects",
    hint: "Leads and prospects not yet converted.",
  },
  {
    id: "wealth_partners",
    label: "Wealth Partners",
    hint: "Partner / distributor audiences.",
  },
  {
    id: "lender_network",
    label: "Lender Network",
    hint: "Lender contact lists.",
  },
  {
    id: "imported",
    label: "Imported Audience",
    hint: "Imported via Data Sources / Sheets.",
  },
  {
    id: "saved",
    label: "Saved Audience",
    hint: "Any reusable audience already defined.",
  },
] as const;
