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
import type { EcmContact, EcmContactRole } from "@/types/enterprise-contact-master";
import { findOperationalEcmContactById } from "./contacts";

/** Session cache only — no registryVersion bump (read/hydrate path). */
function syncContactsToCache(contacts: EcmContact[]): void {
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
  opts?: { pageSize?: number; roles?: EcmContactRole[] },
): Promise<EnterpriseContactOption[]> {
  const contacts = await liveSearchOperationalEcmContacts(query, opts);
  return contacts.map(toContactPickerOption);
}

/**
 * Full ECM Contact rows from live registry (SSOT).
 * Prefer this when callers need roleProfiles / institution fields (e.g. Lender Sales Contact).
 */
export async function liveSearchOperationalEcmContacts(
  query: string,
  opts?: { pageSize?: number; roles?: EcmContactRole[] },
): Promise<EcmContact[]> {
  const q = query.trim();
  const pageSize = opts?.pageSize ?? 25;
  const roles = opts?.roles;

  if (!isEnterprisePersistencePrisma()) {
    const rows = searchOperationalContacts(q, roles?.length ? { roles } : undefined);
    return rows
      .slice(0, pageSize)
      .map((o) => findOperationalEcmContactById(o.id))
      .filter((c): c is EcmContact => Boolean(c));
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      ecmApiClient.queryContacts({
        search: q || undefined,
        page: 1,
        pageSize,
        status: "all",
        sortBy: "modifiedOn",
        sortDir: "desc",
        ...(roles?.length ? { roles } : {}),
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "Enterprise Contact Registry request timed out. Retry or check network.",
              ),
            ),
          12_000,
        );
      }),
    ]);

    const items = result.items.filter(
      (c) => c.enabled !== false && c.status !== "archived",
    );
    syncContactsToCache(items);
    return items;
  } finally {
    if (timer) clearTimeout(timer);
  }
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

/**
 * List active contacts for a role (paginated). Prefer institution-scoped
 * `queryContacts({ institutionKeys })` for Lender Sales Contact — full-role
 * pagination is for admin desks only and must stay bounded.
 */
export async function liveListAllEcmContactsByRole(
  role: EcmContactRole,
  opts?: { pageSize?: number; maxPages?: number },
): Promise<EcmContact[]> {
  if (!isEnterprisePersistencePrisma()) {
    throw new Error(
      "Enterprise Contact Registry requires ENTERPRISE_PERSISTENCE_MODE=prisma for live lookup.",
    );
  }

  const pageSize = Math.min(Math.max(opts?.pageSize ?? 100, 25), 200);
  const maxPages = Math.min(opts?.maxPages ?? 3, 5);
  const all: EcmContact[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (page <= maxPages && all.length < total) {
    const result = await ecmApiClient.queryContacts({
      page,
      pageSize,
      status: "all",
      sortBy: "name",
      sortDir: "asc",
      roles: [role],
      skipTotal: page > 1,
    });
    total = typeof result.total === "number" ? result.total : result.items.length;
    const batch = (result.items ?? []).filter(
      (c) => c.enabled !== false && c.status !== "archived",
    );
    all.push(...batch);
    if (batch.length === 0 || batch.length < pageSize) break;
    page += 1;
  }

  syncContactsToCache(all);
  return all;
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
