/**
 * CO-MARKETING — Campaign Builder wizard IA (UX only — does not change engine model).
 */

export const MARKETING_CAMPAIGN_BUILDER_STEPS = [
  {
    id: "basics",
    number: 1,
    title: "Basics",
    shortTitle: "Basics",
    description: "Campaign name, internal description, objective, channel, owner, and tags.",
  },
  {
    id: "audience",
    number: 2,
    title: "Audience",
    shortTitle: "Audience",
    description: "Authorised workbook, tab, mapping, filters, exclusions, eligibility, snapshot.",
  },
  {
    id: "channel_message",
    number: 3,
    title: "Channel & Message",
    shortTitle: "Channel & Message",
    description:
      "Email: sender, subject, preheader, and message editor. Other channels are Not configured.",
  },
  {
    id: "personalisation",
    number: 4,
    title: "Personalisation",
    shortTitle: "Personalisation",
    description: "Mapped variables, fallbacks, sample preview, and unresolved warnings.",
  },
  {
    id: "schedule",
    number: 5,
    title: "Schedule & Delivery",
    shortTitle: "Schedule & Delivery",
    description: "Start, timezone, batch size, interval, window, cap, and completion estimate.",
  },
  {
    id: "review",
    number: 6,
    title: "Review & Launch",
    shortTitle: "Review & Launch",
    description: "Readiness, warnings, blockers, test status, approval, and eligible launch.",
  },
] as const;

export type MarketingCampaignBuilderStepId =
  (typeof MARKETING_CAMPAIGN_BUILDER_STEPS)[number]["id"];

/** Steps 1–5 must never expose send / launch / test-send. */
export const MARKETING_BUILDER_SEND_FORBIDDEN_STEP_NUMBERS = [1, 2, 3, 4, 5] as const;

export const MARKETING_BUILDER_TIMEZONES = ["Asia/Kolkata", "UTC"] as const;

export const MARKETING_BUILDER_UNSAVED_TITLE = "Unsaved changes" as const;
export const MARKETING_BUILDER_UNSAVED_MESSAGE =
  "You have unsaved campaign draft changes. Save Draft, discard, or cancel to stay." as const;

export const MARKETING_BUILDER_DRAFT_SAVE_CONTRACT = {
  apiAction: "save",
  neverPublishes: true,
  neverSends: true,
  forbidsStatusMutation: true,
  distinctFromApproval: true,
  distinctFromLaunch: true,
} as const;

export function marketingCampaignBuilderHref(campaignId: string): string {
  return `/admin/marketing/campaigns/${encodeURIComponent(campaignId)}`;
}

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
