"use client";

/**
 * CO-HOTFIX-006 — Enterprise Registry hooks (platform SSOT for all pickers).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useEcmContactRegistryVersion } from "@/hooks/use-ecm-contact-registry-version";
import {
  listOperationalCompanies,
  searchOperationalCompanies,
  type EnterpriseCompanyOption,
} from "@/lib/enterprise-registry/companies";
import {
  listOperationalContacts,
  searchOperationalContacts,
  findOperationalContactById,
  type EnterpriseContactOption,
} from "@/lib/enterprise-registry/contacts";
import {
  buildParticipantEntityOptions,
  searchEnterpriseEntities,
  type EnterpriseEntityKind,
} from "@/lib/enterprise-registry/entity-search";
import { ensureEnterpriseRegistryHydrated } from "@/lib/enterprise-registry/hydrate";
import { isEnterprisePersistencePrisma } from "@/lib/enterprise-persistence";
import type { EcmContactRole } from "@/types/enterprise-contact-master";
import type { ParticipantEntityOption } from "@/types/loan-participant";

export interface UseEnterpriseRegistryOptions {
  hydrateOnMount?: boolean;
  refreshOnOpen?: boolean;
  open?: boolean;
}

/** Base hook — hydrates registry and exposes live version + refresh. */
export function useEnterpriseRegistry(options?: UseEnterpriseRegistryOptions) {
  const registryVersion = useEcmContactRegistryVersion();
  const [hydrated, setHydrated] = useState(!isEnterprisePersistencePrisma());
  const [hydrating, setHydrating] = useState(false);
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  const refresh = useCallback(async (force = true) => {
    if (!isEnterprisePersistencePrisma()) {
      setHydrated(true);
      return;
    }
    setHydrating(true);
    setHydrateError(null);
    try {
      await ensureEnterpriseRegistryHydrated(force);
      setHydrated(true);
    } catch (err) {
      setHydrateError(err instanceof Error ? err.message : "Failed to load registry");
    } finally {
      setHydrating(false);
    }
  }, []);

  useEffect(() => {
    if (options?.hydrateOnMount === false) return;
    void refresh(false);
  }, [options?.hydrateOnMount, refresh]);

  useEffect(() => {
    if (!options?.refreshOnOpen || !options.open) return;
    void refresh(true);
    if (isEnterprisePersistencePrisma()) {
      void import("@/lib/enterprise-registry/live-search").then((m) => m.warmPickerCachesFromApi());
    }
  }, [options?.refreshOnOpen, options?.open, refresh]);

  return { registryVersion, hydrated, hydrating, hydrateError, refresh };
}

/** Operational contacts for pickers — auto-updates on create/edit/delete/restore. */
export function useEnterpriseContacts(opts?: UseEnterpriseRegistryOptions) {
  const base = useEnterpriseRegistry(opts);
  const contacts = useMemo(() => {
    void base.registryVersion;
    return listOperationalContacts();
  }, [base.registryVersion]);

  return { ...base, contacts };
}

/** Operational companies for pickers — auto-updates on create/edit/delete/restore. */
export function useEnterpriseCompanies(opts?: UseEnterpriseRegistryOptions) {
  const base = useEnterpriseRegistry(opts);
  const companies = useMemo(() => {
    void base.registryVersion;
    return listOperationalCompanies();
  }, [base.registryVersion]);

  return { ...base, companies };
}

/** Participant entities (contacts + companies) for loan/co-applicant pickers. */
export function useEnterpriseParticipantEntities(opts?: UseEnterpriseRegistryOptions) {
  const base = useEnterpriseRegistry(opts);
  const entities = useMemo((): ParticipantEntityOption[] => {
    void base.registryVersion;
    return buildParticipantEntityOptions();
  }, [base.registryVersion]);

  return { ...base, entities };
}

/** Unified search — identical behaviour in every module. */
export function useEnterpriseEntitySearch(
  query: string,
  opts?: UseEnterpriseRegistryOptions & {
    kind?: EnterpriseEntityKind;
    contactRoles?: EcmContactRole[];
    limit?: number;
  },
) {
  const base = useEnterpriseRegistry(opts);
  const results = useMemo(() => {
    void base.registryVersion;
    return searchEnterpriseEntities(query, {
      kind: opts?.kind,
      contactRoles: opts?.contactRoles,
      limit: opts?.limit,
    });
  }, [base.registryVersion, query, opts?.kind, opts?.contactRoles, opts?.limit]);

  return { ...base, ...results };
}

/** Search contacts only (convenience). */
export function useEnterpriseContactSearch(
  query: string,
  opts?: UseEnterpriseRegistryOptions & { roles?: EcmContactRole[] },
) {
  const base = useEnterpriseRegistry(opts);
  const results = useMemo((): EnterpriseContactOption[] => {
    void base.registryVersion;
    return searchOperationalContacts(query, { roles: opts?.roles });
  }, [base.registryVersion, query, opts?.roles]);

  return { ...base, results };
}

/** Search companies only (convenience). */
export function useEnterpriseCompanySearch(query: string, opts?: UseEnterpriseRegistryOptions) {
  const base = useEnterpriseRegistry(opts);
  const results = useMemo((): EnterpriseCompanyOption[] => {
    void base.registryVersion;
    return searchOperationalCompanies(query);
  }, [base.registryVersion, query]);

  return { ...base, results };
}

export { findOperationalContactById as useEnterpriseContactLookup };
