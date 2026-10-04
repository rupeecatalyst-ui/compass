/**
 * CO-MARKETING-MKT-01 — Marketing Command Center IA (shell screens).
 */

import { ROUTES } from "@/constants/routes";

export type MarketingNavSection = {
  id: string;
  title: string;
  description: string;
  href: string;
  foundationOnly: boolean;
};

export const MARKETING_COMMAND_CENTER_SECTIONS: MarketingNavSection[] = [
  {
    id: "home",
    title: "Command Center",
    description: "Acquisition campaign operating overview — MARKETING TEST MODE.",
    href: ROUTES.ADMIN_MARKETING,
    foundationOnly: false,
  },
  {
    id: "registry",
    title: "Campaign Registry",
    description: "Scan and operate campaigns — separate from Campaign Builder.",
    href: ROUTES.ADMIN_MARKETING_REGISTRY,
    foundationOnly: false,
  },
  {
    id: "campaigns",
    title: "Campaign Builder",
    description: "Six-step campaign authoring. Save never publishes. SIMULATED dry-run only.",
    href: ROUTES.ADMIN_MARKETING_CAMPAIGNS,
    foundationOnly: false,
  },
  {
    id: "audiences",
    title: "Audiences",
    description: "Reusable audience definitions — filters over external Sheets (no row mirror).",
    href: ROUTES.ADMIN_MARKETING_AUDIENCES,
    foundationOnly: false,
  },
  {
    id: "data-sources",
    title: "Data Sources",
    description: "Google Sheets / Drive bindings — discover tabs, preview samples (no full import).",
    href: ROUTES.ADMIN_MARKETING_DATA_SOURCES,
    foundationOnly: false,
  },
  {
    id: "content",
    title: "Content & Templates",
    description: "Reusable content templates and blocks for Campaign Builder.",
    href: ROUTES.ADMIN_MARKETING_CONTENT,
    foundationOnly: false,
  },
  {
    id: "assets",
    title: "Asset Library",
    description: "Marketing DAM — separate from Document Registry.",
    href: ROUTES.ADMIN_MARKETING_ASSETS,
    foundationOnly: false,
  },
  {
    id: "consent",
    title: "Consent & Suppression",
    description: "Durable consent, unsubscribe, bounce, and suppression ledger — fixture identities only.",
    href: ROUTES.ADMIN_MARKETING_CONSENT,
    foundationOnly: false,
  },
  {
    id: "engagement",
    title: "Engagement",
    description: "Opens, clicks, and delivery events (execution/engagement records only).",
    href: ROUTES.ADMIN_MARKETING_ENGAGEMENT,
    foundationOnly: false,
  },
  {
    id: "responses",
    title: "Responses",
    description: "Qualified responses and controlled operational handoff (no Lead).",
    href: ROUTES.ADMIN_MARKETING_RESPONSES,
    foundationOnly: false,
  },
  {
    id: "deliverability",
    title: "Deliverability",
    description: "Sender health and Deliverability Guard (dry-run / not connected).",
    href: ROUTES.ADMIN_MARKETING_DELIVERABILITY,
    foundationOnly: false,
  },
  {
    id: "monitoring",
    title: "Campaign Monitoring",
    description: "Recipient-level delivery, engagement, and operational actions from durable records.",
    href: ROUTES.ADMIN_MARKETING_MONITORING,
    foundationOnly: false,
  },
  {
    id: "operational-health",
    title: "Operational Health",
    description: "Worker, lease, retry, and scheduler health — durable or explicitly simulated.",
    href: ROUTES.ADMIN_MARKETING_OPERATIONAL_HEALTH,
    foundationOnly: false,
  },
  {
    id: "attribution",
    title: "Attribution",
    description: "Campaign to Contact, Opportunity, Deal, and Accounting-confirmed revenue.",
    href: ROUTES.ADMIN_MARKETING_ATTRIBUTION,
    foundationOnly: false,
  },
  {
    id: "analytics",
    title: "Reports",
    description: "Durable monitoring, acquisition funnel, engagement, and campaign comparison.",
    href: ROUTES.ADMIN_MARKETING_ANALYTICS,
    foundationOnly: false,
  },
  {
    id: "settings",
    title: "Settings",
    description: "Sender identities, defaults, and module safety status.",
    href: ROUTES.ADMIN_MARKETING_SETTINGS,
    foundationOnly: false,
  },
];
