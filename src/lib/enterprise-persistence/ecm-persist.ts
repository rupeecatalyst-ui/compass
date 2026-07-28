/**
 * CO-SPRINT-118 — Browser persistence facade for ECM.
 * Prisma mode: REST → PostgreSQL is SSOT; memory is session cache only.
 * Memory mode: existing in-memory registries (local/dev).
 */

import { notifyEcmContactRegistryChanged } from "@/lib/enterprise-contact-master/contact-change-bus";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  linkCompanyContact as linkCompanyContactMemory,
  registerEcmCompany as registerEcmCompanyMemory,
  replaceAllCompanyLinks,
  replaceAllEcmCompanies,
  updateEcmCompany as updateEcmCompanyMemory,
  upsertCompanyLinkLocal,
  upsertEcmCompanyLocal,
} from "@/lib/enterprise-company-master";
import {
  getEcmPorts,
  registerEcmContact as registerEcmContactMemory,
  updateEcmContact as updateEcmContactMemory,
} from "@/lib/enterprise-contact-master";
import { ecmApiClient } from "@/lib/enterprise-persistence/ecm-api-client";
import type {
  EcmCompany,
  EcmCompanyContactLink,
  EcmCompanyRegisterInput,
  EcmCompanyRelationRole,
} from "@/types/enterprise-company-master";
import type {
  EcmContact,
} from "@/types/enterprise-contact-master";
import type { EcmContactRegisterInput } from "@/lib/enterprise-contact-master/contact-registry";

export async function hydrateEcmFromPrisma(): Promise<{
  contacts: number;
  companies: number;
  links: number;
}> {
  if (!isEnterprisePersistencePrisma()) {
    return { contacts: 0, companies: 0, links: 0 };
  }

  const [contactsResult, companiesResult] = await Promise.all([
    ecmApiClient.queryContacts({
      page: 1,
      pageSize: 5000,
      status: "all",
      sortBy: "modifiedOn",
      sortDir: "desc",
    }),
    ecmApiClient.queryCompanies({ page: 1, pageSize: 5000, status: "all" }),
  ]);

  getEcmPorts().contacts.replaceAll(contactsResult.items);
  replaceAllEcmCompanies(companiesResult.items);

  // CO-PERF-002 — Do not fan-out N× listCompanyLinks on every Contacts/Dashboard hydrate.
  // Links load on demand via hydrateCompanyLinksFromPrisma when a Company workspace opens.
  // Memory starts empty for links (Prisma remains SSOT).
  replaceAllCompanyLinks([]);

  return {
    contacts: contactsResult.items.length,
    companies: companiesResult.items.length,
    links: 0,
  };
}

/**
 * CO-PERF-002 — Lazy company↔contact links for one company (Company Workspace open).
 */
export async function hydrateCompanyLinksFromPrisma(
  companyId: string,
): Promise<number> {
  if (!isEnterprisePersistencePrisma()) return 0;
  const id = companyId.trim();
  if (!id) return 0;
  const links = await ecmApiClient.listCompanyLinks(id).catch(() => []);
  for (const link of links) {
    upsertCompanyLinkLocal(link);
  }
  return links.length;
}

export async function persistRegisterEcmContact(
  input: EcmContactRegisterInput,
): Promise<EcmContact> {
  if (!isEnterprisePersistencePrisma()) {
    return registerEcmContactMemory(input);
  }
  const created = await ecmApiClient.createContact({
    name: input.name,
    mobilePrimary: input.mobilePrimary,
    mobileSecondary: input.mobileSecondary,
    personalEmail: input.personalEmail,
    officialEmail: input.officialEmail,
    city: input.city,
    state: input.state,
    roles: input.roles,
    primaryRole: input.primaryRole,
    status: input.status,
    ownerName: input.ownerName,
    ownerId: input.ownerId,
    employmentType: input.employmentType,
  });
  getEcmPorts().contacts.save(created);
  notifyEcmContactRegistryChanged();
  return created;
}

export async function persistUpdateEcmContact(
  id: string,
  patch: Record<string, unknown>,
  actorId: string,
): Promise<EcmContact> {
  if (!isEnterprisePersistencePrisma()) {
    return updateEcmContactMemory(id, patch as Parameters<typeof updateEcmContactMemory>[1], actorId);
  }
  const updated = await ecmApiClient.updateContact(id, patch);
  getEcmPorts().contacts.save(updated);
  notifyEcmContactRegistryChanged();
  return updated;
}

export async function persistRegisterEcmCompany(
  input: EcmCompanyRegisterInput,
): Promise<EcmCompany> {
  if (!isEnterprisePersistencePrisma()) {
    return registerEcmCompanyMemory(input);
  }
  const created = await ecmApiClient.createCompany(input);
  upsertEcmCompanyLocal(created);
  notifyEcmContactRegistryChanged();
  return created;
}

export async function persistUpdateEcmCompany(
  id: string,
  patch: Partial<EcmCompanyRegisterInput>,
  actorId: string,
): Promise<EcmCompany> {
  if (!isEnterprisePersistencePrisma()) {
    return updateEcmCompanyMemory(id, patch, actorId);
  }
  const updated = await ecmApiClient.updateCompany(id, { ...patch });
  upsertEcmCompanyLocal(updated);
  notifyEcmContactRegistryChanged();
  return updated;
}

export async function persistLinkCompanyContact(input: {
  companyId: string;
  contactId: string;
  relationRole: EcmCompanyRelationRole;
  designation?: string | null;
  department?: string | null;
  createdBy: string;
}): Promise<EcmCompanyContactLink> {
  if (!isEnterprisePersistencePrisma()) {
    return linkCompanyContactMemory(input);
  }
  const link = await ecmApiClient.linkCompanyContact({
    companyId: input.companyId,
    contactId: input.contactId,
    relationRole: input.relationRole,
    designation: input.designation,
    department: input.department,
  });
  upsertCompanyLinkLocal(link);
  return link;
}
