/**
 * CO-MARKETING-REDESIGN-007 — Approved standard email templates.
 * Structured documents only. No downloaded brand assets.
 */

import { MARKETING_UNSUBSCRIBE_BLOCK_TYPE } from "@/constants/enterprise-marketing-engine/content";
import type { MarketingContentTemplate } from "@/types/enterprise-marketing-campaign";

const STAMP = "2026-09-05T00:00:00.000Z";

function unsubscribeBlock(id: string) {
  return {
    id,
    type: MARKETING_UNSUBSCRIBE_BLOCK_TYPE,
    props: {
      required: true,
      label: "Unsubscribe",
      href: "{{unsubscribeUrl}}",
      align: "center",
      padding: "16",
    },
  };
}

export const MARKETING_STANDARD_EMAIL_TEMPLATES: MarketingContentTemplate[] = [
  {
    id: "mkt-tpl-standard-welcome",
    organizationId: "standard",
    name: "Professional welcome",
    description: "Approved standard introduction for a first professional outreach.",
    channel: "EMAIL",
    subject: "{{firstName}}, an introduction from {{senderName}}",
    previewText: "A concise note for professionals in {{city}}.",
    content: {
      version: 1,
      blocks: [
        {
          id: "std-welcome-header",
          type: "header",
          props: { title: "A note from Rupee Catalyst", subtitle: "", align: "left", padding: "16", color: "#0f172a" },
        },
        {
          id: "std-welcome-text",
          type: "text",
          props: {
            html: "Hello {{firstName}},\n\nWe help professionals in {{city}} evaluate lending options with clarity. If useful, we can walk through {{product}} with you.",
            align: "left",
            padding: "8",
          },
        },
        {
          id: "std-welcome-cta",
          type: "cta",
          props: { label: "Learn more", url: "https://rupeecatalyst.com", align: "center", padding: "16" },
        },
        unsubscribeBlock("std-welcome-unsub"),
        {
          id: "std-welcome-footer",
          type: "footer",
          props: { text: "© Rupee Catalyst", align: "center", padding: "16" },
        },
      ],
    },
    disclaimer: null,
    category: "standard",
    status: "APPROVED",
    origin: "standard",
    versionNumber: 1,
    parentTemplateId: null,
    immutable: true,
    lastUsedAt: null,
    createdAt: STAMP,
    updatedAt: STAMP,
  },
  {
    id: "mkt-tpl-standard-nurture",
    organizationId: "standard",
    name: "Product nurture",
    description: "Approved standard follow-up with two-column context and social links.",
    channel: "EMAIL",
    subject: "{{product}} update for {{firstName}}",
    previewText: "A short follow-up on {{product}}.",
    content: {
      version: 1,
      blocks: [
        {
          id: "std-nurture-header",
          type: "header",
          props: { title: "{{product}}", subtitle: "A concise follow-up", align: "left", padding: "16", color: "#0f172a" },
        },
        {
          id: "std-nurture-text",
          type: "text",
          props: {
            html: "Hello {{firstName}},\n\nSharing a brief update on {{product}} for professionals in {{city}}.",
            align: "left",
            padding: "8",
          },
        },
        {
          id: "std-nurture-cols",
          type: "columns",
          props: {
            left: "What we cover\nEligibility, documents, and lender fit — explained in plain language.",
            right: "How we work\nOne conversation. No pressure. You decide the next step.",
            align: "left",
            padding: "8",
          },
        },
        {
          id: "std-nurture-cta",
          type: "cta",
          props: { label: "Continue the conversation", url: "https://rupeecatalyst.com", align: "center", padding: "16" },
        },
        {
          id: "std-nurture-social",
          type: "social",
          props: {
            linkedin: "https://www.linkedin.com/company/rupeecatalyst",
            website: "https://rupeecatalyst.com",
            align: "center",
            padding: "8",
          },
        },
        unsubscribeBlock("std-nurture-unsub"),
        {
          id: "std-nurture-footer",
          type: "footer",
          props: { text: "© Rupee Catalyst", align: "center", padding: "16" },
        },
      ],
    },
    disclaimer: null,
    category: "standard",
    status: "APPROVED",
    origin: "standard",
    versionNumber: 1,
    parentTemplateId: null,
    immutable: true,
    lastUsedAt: null,
    createdAt: STAMP,
    updatedAt: STAMP,
  },
];

export function getMarketingStandardEmailTemplate(id: string): MarketingContentTemplate | null {
  return MARKETING_STANDARD_EMAIL_TEMPLATES.find((row) => row.id === id) ?? null;
}
