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
    description: "Acquisition campaign operating overview (foundation shell).",
    href: ROUTES.ADMIN_MARKETING,
    foundationOnly: true,
  },
  {
    id: "campaigns",
    title: "Campaigns",
    description: "Campaign registry and block-document Campaign Builder (preview only — no send).",
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
    description: "Sender health and Deliverability Guard.",
    href: ROUTES.ADMIN_MARKETING_DELIVERABILITY,
    foundationOnly: true,
  },
  {
    id: "analytics",
    title: "Analytics",
    description: "Acquisition funnel and campaign comparison.",
    href: ROUTES.ADMIN_MARKETING_ANALYTICS,
    foundationOnly: false,
  },
  {
    id: "settings",
    title: "Settings",
    description: "Sender identities, defaults, and module safety status.",
    href: ROUTES.ADMIN_MARKETING_SETTINGS,
    foundationOnly: true,
  },
];
