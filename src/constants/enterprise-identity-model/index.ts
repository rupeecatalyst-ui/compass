/**
 * CO-ID-001 — Enterprise Identity Model (frozen).
 * Contact Registry is the only identity creation SSOT.
 * Business modules extend Contact with additive roles — never mint duplicate people.
 */

import type { EcmContactRole } from "@/types/enterprise-contact-master";
import type {
  EnterpriseIdentityBusinessRoleId,
  EnterpriseIdentityBusinessRoleDefinition,
} from "@/types/enterprise-identity-model";

export const ENTERPRISE_IDENTITY_MODEL_VERSION = "1.0.0-co-id-001" as const;

export const ENTERPRISE_IDENTITY_PRINCIPLES = [
  "Enterprise Contact Registry is the Single Source of Truth for every Person and Organisation.",
  "No business module may create a Person or Organisation identity independently.",
  "Every business capability extends an existing Contact (or Company) with additive roles.",
  "One Contact may hold many roles; roles never create duplicate identities.",
  "Wealth Partner Registry owns commercial / KYC / commission profile only — not identity.",
] as const;

/**
 * Canonical business roles shown on Contact Profile.
 * Identity-backed roles map to ECM; relationship projections use company links / future modules.
 */
export const ENTERPRISE_IDENTITY_BUSINESS_ROLES: readonly EnterpriseIdentityBusinessRoleDefinition[] =
  [
    {
      id: "customer",
      label: "Customer",
      description: "Borrower / applicant relationship",
      ecmRole: "customer",
      source: "ecm_role",
    },
    {
      id: "wealth_partner",
      label: "Wealth Partner",
      description: "Channel / Wealth Partner commercial relationship",
      ecmRole: "partner",
      source: "ecm_role",
      wealthPartnerLinked: true,
    },
    {
      id: "employee",
      label: "Employee",
      description: "Internal Rupee Catalyst employee",
      ecmRole: "employee",
      source: "ecm_role",
    },
    {
      id: "vendor",
      label: "Vendor",
      description: "Vendor / supplier (future registry extends Contact)",
      ecmRole: null,
      source: "reserved",
    },
    {
      id: "lender_contact",
      label: "Lender Contact",
      description: "Banker / lender institution contact",
      ecmRole: "lender_employee",
      source: "ecm_role",
    },
    {
      id: "guarantor",
      label: "Guarantor",
      description: "Loan guarantor (journey participant — same Contact identity)",
      ecmRole: null,
      source: "projection",
    },
    {
      id: "director",
      label: "Director",
      description: "Company director relationship",
      ecmRole: null,
      source: "company_relation",
      companyRelationRole: "director",
    },
    {
      id: "authorised_signatory",
      label: "Authorised Signatory",
      description: "Company authorised signatory",
      ecmRole: null,
      source: "company_relation",
      companyRelationRole: "authorized_signatory",
    },
  ] as const;

export function ecmRoleForBusinessRole(
  id: EnterpriseIdentityBusinessRoleId,
): EcmContactRole | null {
  const def = ENTERPRISE_IDENTITY_BUSINESS_ROLES.find((r) => r.id === id);
  return def?.ecmRole ?? null;
}

export const WEALTH_PARTNER_ONBOARD_COPY = {
  registryCta: "Onboard Wealth Partner",
  wizardTitle: "Onboard Wealth Partner",
  wizardDescription:
    "Search the Enterprise Contact Registry, select an existing Contact, then create the Wealth Partner commercial profile. Identity always stays in Contact Registry.",
  searchLabel: "Search Enterprise Contact Registry",
  createContactCta: "Create Contact",
  createContactHint:
    "If the Contact does not exist, create it here — you will return automatically to continue onboarding.",
  convertCta: "Create Wealth Partner Profile",
  alreadyRegistered:
    "This Contact is already an active Wealth Partner.",
} as const;
