/**
 * Legacy loan-journey exports — delegate to enterprise-registry SSOT.
 */

import { getEcmMasterLabel, getEcmRoleLabel } from "@/constants/enterprise-contact-master";
import { getSourceContactFilterRoles } from "@/constants/loan-journey-sources";
import { getEcmContactAssignedRoles } from "@/lib/enterprise-contact-master";
import type { EntityMasterOption } from "@/components/catalyst-one/shared/entity-master-search";
import {
  findOperationalContactById,
  listOperationalContacts,
  toContactPickerOption,
  type EnterpriseContactOption,
} from "./contacts";
import {
  listOperationalCompanies,
  toCompanyPickerOption,
  type EnterpriseCompanyOption,
} from "./companies";
import { buildParticipantEntityOptions } from "./entity-search";

export type LoanJourneyContactOption = EnterpriseContactOption;
export type LoanJourneyCompanyOption = EnterpriseCompanyOption;

export const buildLoanJourneyContactOptions = listOperationalContacts;
export const buildLoanJourneyCompanyOptions = listOperationalCompanies;
export const buildLoanJourneyParticipantEntityOptions = buildParticipantEntityOptions;
export const findLoanJourneyContactById = findOperationalContactById;

export interface LoanJourneySourceContactOption extends EnterpriseContactOption {
  roleLabel?: string;
  organisation?: string;
}

function mapSourceContactRow(c: ReturnType<typeof findOperationalContactById>): LoanJourneySourceContactOption | null {
  if (!c) return null;
  const roles = getEcmContactAssignedRoles(c);
  const roleLabel = roles.map((r) => getEcmRoleLabel(r)).join(", ");
  const base = toContactPickerOption(c);
  return {
    ...base,
    sublabel: c.mobilePrimary,
    mobile: c.mobilePrimary,
    city: getEcmMasterLabel("city", c.city) || c.city || undefined,
    roleLabel: roleLabel || undefined,
    organisation:
      c.roleProfiles?.partner?.organisationName ||
      c.roleProfiles?.builder?.organisationName ||
      c.roleProfiles?.customer?.employerName ||
      c.roleProfiles?.customer?.businessName ||
      undefined,
  };
}

export function listLoanJourneySourceContacts(source: string): LoanJourneySourceContactOption[] {
  const filter = getSourceContactFilterRoles(source);
  if (filter === "hide") return [];

  const contacts = listOperationalContacts();
  if (filter === "all") {
    return contacts.map((c) => {
      const full = findOperationalContactById(c.id);
      return mapSourceContactRow(full) ?? c;
    });
  }

  return listOperationalContacts()
    .filter((c) => c.roles?.some((r) => filter.includes(r)))
    .map((c) => mapSourceContactRow(findOperationalContactById(c.id)) ?? c);
}

export type { EntityMasterOption };
