/**
 * Prompt 019 — Resolve Source Contact options from Directory / ECM by Source type.
 * Presentation filtering only — no registry mutation.
 */

import { listEcmContacts, getEcmContactAssignedRoles } from "@/lib/enterprise-contact-master";
import { getEcmMasterLabel, getEcmRoleLabel } from "@/constants/enterprise-contact-master";
import { CUSTOMER_SEED } from "@/data/catalyst-one/customer-seed";
import {
  getSourceContactFilterRoles,
  type LoanJourneySource,
} from "@/constants/loan-journey-sources";
import type { EcmContact } from "@/types/enterprise-contact-master";
import type { EntityMasterOption } from "@/components/catalyst-one/shared/entity-master-search";

export interface SourceContactOption extends EntityMasterOption {
  mobile?: string;
  email?: string;
  city?: string;
  roleLabel?: string;
  organisation?: string;
}

function mapEcmToOption(c: EcmContact): SourceContactOption {
  const roles = getEcmContactAssignedRoles(c);
  const roleLabel = roles
    .map((r) => getEcmRoleLabel(r))
    .join(", ");
  return {
    id: c.id,
    label: c.name,
    sublabel: c.mobilePrimary,
    mobile: c.mobilePrimary,
    email: c.personalEmail || c.officialEmail || undefined,
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

function mapSeedToOption(c: (typeof CUSTOMER_SEED)[number]): SourceContactOption {
  return {
    id: c.id,
    label: c.name,
    sublabel: c.mobile,
    mobile: c.mobile,
    email: c.email,
    city: c.city,
    roleLabel: c.employmentType,
    organisation: /pvt|ltd|llp|industries|traders|exports|logistics|pharma|construction/i.test(c.name)
      ? c.name
      : c.city
        ? `${c.city} Region`
        : undefined,
  };
}

/**
 * Contacts eligible for the Source Contact picker for a given Source.
 * Prefers ECM Directory; falls back to CUSTOMER_SEED when ECM has no matches for "all".
 */
export function listSourceContactOptions(source: string): SourceContactOption[] {
  const filter = getSourceContactFilterRoles(source);
  if (filter === "hide") return [];

  const ecm = listEcmContacts();
  if (filter === "all") {
    if (ecm.length > 0) return ecm.map(mapEcmToOption);
    return CUSTOMER_SEED.map(mapSeedToOption);
  }

  const filtered = ecm.filter((c) =>
    getEcmContactAssignedRoles(c).some((r) => filter.includes(r)),
  );
  return filtered.map(mapEcmToOption);
}

export function findSourceContactOption(
  source: string,
  contactId: string | undefined,
): SourceContactOption | undefined {
  if (!contactId) return undefined;
  return listSourceContactOptions(source).find((o) => o.id === contactId);
}

export function normalizeLoanJourneySource(source: string): LoanJourneySource | string {
  if (source === "Builder Tie-up") return "Builder";
  return source;
}
