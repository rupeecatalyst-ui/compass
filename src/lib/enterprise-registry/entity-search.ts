/**
 * CO-HOTFIX-006 — Unified entity search across Enterprise Registry.
 */

import { CUSTOMER_SEED } from "@/data/catalyst-one/customer-seed";
import { ORGANIZATION_REGISTRY } from "@/data/catalyst-one/organization-registry-seed";
import { isDemoSeedEnabled } from "@/lib/demo-seed";
import { isEnterprisePersistencePrisma } from "@/lib/enterprise-persistence";
import type { EcmContactRole } from "@/types/enterprise-contact-master";
import type { ParticipantEntityOption } from "@/types/loan-participant";
import {
  listOperationalContacts,
  searchOperationalContacts,
  type EnterpriseContactOption,
} from "./contacts";
import {
  listOperationalCompanies,
  searchOperationalCompanies,
  type EnterpriseCompanyOption,
} from "./companies";

export type EnterpriseEntityKind = "contact" | "company" | "all";

export interface EnterpriseEntitySearchResult {
  contacts: EnterpriseContactOption[];
  companies: EnterpriseCompanyOption[];
}

export function searchEnterpriseEntities(
  query: string,
  opts?: { kind?: EnterpriseEntityKind; contactRoles?: EcmContactRole[]; limit?: number },
): EnterpriseEntitySearchResult {
  const kind = opts?.kind ?? "all";
  const limit = opts?.limit ?? 20;

  const contacts =
    kind === "company"
      ? []
      : searchOperationalContacts(query, { roles: opts?.contactRoles }).slice(0, limit);

  const companies =
    kind === "contact" ? [] : searchOperationalCompanies(query).slice(0, limit);

  return { contacts, companies };
}

/** Participant picker options — ECM only in production prisma mode. */
export function buildParticipantEntityOptions(): ParticipantEntityOption[] {
  const individuals: ParticipantEntityOption[] = listOperationalContacts().map((c) => ({
    id: c.id,
    name: c.label,
    mobile: c.mobile || undefined,
    email: c.email || undefined,
    entityType: "individual" as const,
  }));

  const companies: ParticipantEntityOption[] = listOperationalCompanies().map((c) => ({
    id: c.id,
    name: c.label,
    entityType: "company" as const,
    constitution: c.constitution,
  }));

  if (!isDemoSeedEnabled() || isEnterprisePersistencePrisma()) {
    return [...individuals, ...companies];
  }

  const seedIndividuals: ParticipantEntityOption[] = CUSTOMER_SEED.map((c) => ({
    id: c.id,
    name: c.name,
    mobile: c.mobile,
    email: c.email,
    entityType: "individual" as const,
  }));

  const seedCompanies: ParticipantEntityOption[] = ORGANIZATION_REGISTRY.map((o) => ({
    id: o.id,
    name: o.name,
    entityType: "company" as const,
    constitution: o.type.toUpperCase(),
  }));

  const byKey = new Map<string, ParticipantEntityOption>();
  for (const row of [...individuals, ...companies, ...seedIndividuals, ...seedCompanies]) {
    byKey.set(`${row.entityType}:${row.id}`, row);
  }
  return [...byKey.values()];
}
