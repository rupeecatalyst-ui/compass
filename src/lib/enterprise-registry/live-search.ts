/**
 * CO-BLOCKER-001 — Live ECM search for pickers (PostgreSQL via REST).
 * Bypasses stale in-memory cache; syncs results back into session cache.
 *
 * P0 Stabilization Phase 1 — Read/hydrate must NOT notify the registry change
 * bus. Notifies are reserved for create/update/archive. Emitting on search
 * caused LiveEntityMasterSearch warm effects to re-fire in a request storm.
 */

import { getEcmPorts } from "@/lib/enterprise-contact-master/composition";
import { upsertEcmCompanyLocal } from "@/lib/enterprise-company-master";
import { ecmApiClient } from "@/lib/enterprise-persistence/ecm-api-client";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  listOperationalCompanies,
  searchOperationalCompanies,
  toCompanyPickerOption,
  type EnterpriseCompanyOption,
} from "./companies";
import {
  listOperationalContacts,
  searchOperationalContacts,
  toContactPickerOption,
  type EnterpriseContactOption,
} from "./contacts";
import type { EcmCompany } from "@/types/enterprise-company-master";

/** Session cache only — no registryVersion bump (read/hydrate path). */
function syncContactsToCache(contacts: Parameters<typeof toContactPickerOption>[0][]): void {
  for (const c of contacts) {
    getEcmPorts().contacts.save(c);
  }
}

/** Session cache only — silent upsert, no registryVersion bump. */
function syncCompaniesToCache(companies: EcmCompany[]): void {
  for (const c of companies) {
    upsertEcmCompanyLocal(c, { silent: true });
  }
}

/** Search contacts — API in prisma mode, memory SSOT otherwise. */
export async function liveSearchOperationalContacts(
  query: string,
  opts?: { pageSize?: number; roles?: import("@/types/enterprise-contact-master").EcmContactRole[] },
): Promise<EnterpriseContactOption[]> {
  const q = query.trim();
  const pageSize = opts?.pageSize ?? 25;
  const roles = opts?.roles;

  if (!isEnterprisePersistencePrisma()) {
    const rows = searchOperationalContacts(q);
    const filtered = roles?.length
      ? rows.filter((c) => c.roles?.some((r) => roles.includes(r)))
      : rows;
    return filtered.slice(0, pageSize);
  }

  const result = await ecmApiClient.queryContacts({
    search: q || undefined,
    page: 1,
    pageSize,
    status: "all",
    sortBy: "modifiedOn",
    sortDir: "desc",
    ...(roles?.length ? { roles } : {}),
  });

  syncContactsToCache(result.items);
  return result.items
    .filter((c) => c.enabled !== false && c.status !== "archived")
    .map(toContactPickerOption);
}

/** Search companies — API in prisma mode, memory SSOT otherwise. */
export async function liveSearchOperationalCompanies(
  query: string,
  opts?: { pageSize?: number },
): Promise<EnterpriseCompanyOption[]> {
  const q = query.trim();
  const pageSize = opts?.pageSize ?? 25;

  if (!isEnterprisePersistencePrisma()) {
    return searchOperationalCompanies(q).slice(0, pageSize);
  }

  const result = await ecmApiClient.queryCompanies({
    search: q || undefined,
    page: 1,
    pageSize,
    status: "all",
  });

  syncCompaniesToCache(result.items);
  return result.items
    .filter((c) => c.enabled !== false && c.status !== "archived")
    .map(toCompanyPickerOption);
}

/** Warm picker caches from PostgreSQL (called when Loan Journey opens). */
export async function warmPickerCachesFromApi(): Promise<{ contacts: number; companies: number }> {
  if (!isEnterprisePersistencePrisma()) {
    return {
      contacts: listOperationalContacts().length,
      companies: listOperationalCompanies().length,
    };
  }

  const [contacts, companies] = await Promise.all([
    liveSearchOperationalContacts("", { pageSize: 500 }),
    liveSearchOperationalCompanies("", { pageSize: 500 }),
  ]);

  return { contacts: contacts.length, companies: companies.length };
}
