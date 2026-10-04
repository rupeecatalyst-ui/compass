/**
 * Controlled internal screens for custom-field placement.
 * Identifiers only. This module does not render a workspace section.
 */
import { DESIGN_NEW_FIELD_DOMAINS, type DesignNewFieldDomain } from "./custom-field-design";

export const CUSTOM_FIELD_LAUNCH_DOMAINS = DESIGN_NEW_FIELD_DOMAINS;

export const DEAL_WORKSPACE_CUSTOM_FIELDS = {
  screenId: "deal_workspace",
  screenLabel: "Deal Workspace",
  sectionId: "custom_fields",
  sectionLabel: "Custom Fields",
  owningDomain: "deal",
} as const;

export const CUSTOM_FIELD_PLACEMENT_SCREENS = [
  {
    screenId: "contact_workspace",
    screenLabel: "Contact Workspace",
    sectionId: "custom_fields",
    sectionLabel: "Custom Fields",
    owningDomain: "contact",
  },
  {
    screenId: "company_workspace",
    screenLabel: "Company Workspace",
    sectionId: "custom_fields",
    sectionLabel: "Custom Fields",
    owningDomain: "company",
  },
  {
    screenId: "opportunity_workspace",
    screenLabel: "Opportunity Workspace",
    sectionId: "custom_fields",
    sectionLabel: "Custom Fields",
    owningDomain: "opportunity",
  },
  DEAL_WORKSPACE_CUSTOM_FIELDS,
  {
    screenId: "accounting_workspace",
    screenLabel: "Accounting Workspace",
    sectionId: "custom_fields",
    sectionLabel: "Custom Fields",
    owningDomain: "accounting",
  },
] as const;

export type CustomFieldPlacementScreen = (typeof CUSTOM_FIELD_PLACEMENT_SCREENS)[number];

const SCREEN_KEY = new Map<string, CustomFieldPlacementScreen>(
  CUSTOM_FIELD_PLACEMENT_SCREENS.map((screen) => [`${screen.screenId}\n${screen.sectionId}`, screen]),
);

export function resolvePlacementScreen(screenId: string, sectionId: string): CustomFieldPlacementScreen | null {
  return SCREEN_KEY.get(`${screenId}\n${sectionId}`) ?? null;
}

export function isLaunchDomain(value: string): value is DesignNewFieldDomain {
  return (CUSTOM_FIELD_LAUNCH_DOMAINS as readonly string[]).includes(value);
}
