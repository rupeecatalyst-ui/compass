/**
 * Banker structures — TWO independent models:
 *
 * 1) Organizational Location (roleProfiles.lender_employee):
 *    Institution → Region → City → Branch
 *
 * 2) Reporting Hierarchy (generic Contact Relationships, type `reports_to`):
 *    Contact → Reporting Manager → … → top
 *
 * Hierarchy levels are NEVER hardcoded — they emerge from reports_to links.
 * Missing intermediate titles (e.g. no Area Manager) simply shorten the chain.
 */

import type { EcmContact } from "@/types/enterprise-contact-master";
import { getEcmMasterLabel } from "@/constants/enterprise-contact-master/masters";
import {
  buildEcmRelationshipChain,
  clearEcmContactRelationship,
  ECM_RELATIONSHIP_TYPES,
  getEcmRelatedContactId,
  listEcmRelationshipsTo,
  upsertEcmContactRelationship,
} from "./contact-relationships";
import { getEcmContactAssignedRoles, listEcmContacts, updateEcmContact } from "./contact-registry";

/** Organizational Location keys on roleProfiles.lender_employee (Structure 1) */
export const ECM_BANKER_ORG_KEYS = {
  institution: "institution",
  region: "region",
  city: "city",
  branch: "branch",
  designation: "designation",
  officialMobile: "officialMobile",
  officialEmail: "officialEmail",
} as const;

/**
 * Denormalized UI cache only — source of truth for reporting is Contact Relationships.
 * Kept in sync when setBankerReportingManager runs.
 */
export const ECM_BANKER_REPORTING_CACHE_KEYS = {
  reportingManagerContactId: "reportingManagerContactId",
  reportingManagerName: "reportingManagerName",
} as const;

/** @deprecated Prefer ECM_BANKER_ORG_KEYS + relationship store */
export const ECM_BANKER_PROFILE_KEYS = {
  ...ECM_BANKER_ORG_KEYS,
  ...ECM_BANKER_REPORTING_CACHE_KEYS,
} as const;

export interface EcmBankerOrgPlacement {
  institutionId?: string;
  regionId?: string;
  cityId?: string;
  branchId?: string;
}

export interface EcmBankerReportingNode {
  contactId: string;
  name: string;
  designation?: string;
  reportingManagerContactId?: string;
}

export function getEcmBankerProfile(contact: EcmContact): Record<string, string> {
  return contact.roleProfiles?.lender_employee ?? {};
}

/** Structure 1 — Organizational Location (independent of reporting). */
export function getEcmBankerOrgPlacement(contact: EcmContact): EcmBankerOrgPlacement {
  const p = getEcmBankerProfile(contact);
  return {
    institutionId: p.institution || undefined,
    regionId: p.region || undefined,
    cityId: p.city || undefined,
    branchId: p.branch || undefined,
  };
}

export function formatEcmBankerOrgPath(placement: EcmBankerOrgPlacement): string {
  const parts = [
    placement.institutionId
      ? getEcmMasterLabel("lender", placement.institutionId)
      : undefined,
    placement.regionId ? getEcmMasterLabel("region", placement.regionId) : undefined,
    placement.cityId ? getEcmMasterLabel("city", placement.cityId) : undefined,
    placement.branchId ? getEcmMasterLabel("branch", placement.branchId) : undefined,
  ].filter(Boolean);
  return parts.length ? parts.join(" → ") : "—";
}

/** Resolve Reporting Manager Contact ID from generic relationship store (with cache fallback). */
export function getEcmBankerReportingManagerId(contactId: string): string | undefined {
  const fromRel = getEcmRelatedContactId(contactId, ECM_RELATIONSHIP_TYPES.REPORTS_TO);
  if (fromRel) return fromRel;
  const contact = listEcmContacts().find((c) => c.id === contactId);
  return contact ? getEcmBankerProfile(contact).reportingManagerContactId || undefined : undefined;
}

/**
 * Structure 2 — Reporting Hierarchy derived from `reports_to` relationships.
 * Walks dynamically; skipped levels never break the chain.
 */
export function buildEcmBankerReportingChain(
  contactId: string,
  options?: { maxDepth?: number },
): EcmBankerReportingNode[] {
  const byId = new Map(listEcmContacts().map((c) => [c.id, c]));
  const generic = buildEcmRelationshipChain(
    contactId,
    ECM_RELATIONSHIP_TYPES.REPORTS_TO,
    options,
  );

  // Prefer relationship store; if empty chain length 1 and legacy cache exists, walk cache once
  if (generic.length <= 1) {
    const legacyManager = byId.get(contactId)
      ? getEcmBankerProfile(byId.get(contactId)!).reportingManagerContactId
      : undefined;
    if (legacyManager && !generic[0]?.relatedToContactId) {
      return walkLegacyReportingCache(contactId, options?.maxDepth ?? 20);
    }
  }

  return generic.map((node) => {
    const contact = byId.get(node.contactId);
    const designation = contact
      ? getEcmBankerProfile(contact).designation
      : undefined;
    return {
      contactId: node.contactId,
      name: node.name,
      designation: designation
        ? getEcmMasterLabel("designation", designation) || designation
        : undefined,
      reportingManagerContactId: node.relatedToContactId,
    };
  });
}

function walkLegacyReportingCache(contactId: string, maxDepth: number): EcmBankerReportingNode[] {
  const byId = new Map(listEcmContacts().map((c) => [c.id, c]));
  const chain: EcmBankerReportingNode[] = [];
  const seen = new Set<string>();
  let currentId: string | undefined = contactId;
  while (currentId && !seen.has(currentId) && chain.length < maxDepth) {
    seen.add(currentId);
    const contact = byId.get(currentId);
    if (!contact) break;
    const profile = getEcmBankerProfile(contact);
    const next = profile.reportingManagerContactId || undefined;
    chain.push({
      contactId: contact.id,
      name: contact.name,
      designation: profile.designation
        ? getEcmMasterLabel("designation", profile.designation) || profile.designation
        : undefined,
      reportingManagerContactId: next,
    });
    currentId = next;
  }
  return chain;
}

/** Direct reports via generic relationships (incoming reports_to). */
export function listEcmBankerDirectReports(managerContactId: string): EcmContact[] {
  const fromRels = new Set(
    listEcmRelationshipsTo(managerContactId, ECM_RELATIONSHIP_TYPES.REPORTS_TO).map(
      (r) => r.fromContactId,
    ),
  );
  return listEcmContacts().filter((c) => {
    if (fromRels.has(c.id)) return true;
    // Legacy fallback
    return (
      getEcmContactAssignedRoles(c).includes("lender_employee") &&
      getEcmBankerProfile(c).reportingManagerContactId === managerContactId
    );
  });
}

/**
 * Set/clear Banker Reporting Manager:
 * - Persists generic `reports_to` relationship (SSOT)
 * - Syncs denormalized cache on banker role profile for UI/MIR display
 */
export function setBankerReportingManager(input: {
  bankerContactId: string;
  manager: EcmContact | null;
  actorId: string;
}): EcmContact {
  if (input.manager) {
    upsertEcmContactRelationship({
      fromContactId: input.bankerContactId,
      toContactId: input.manager.id,
      relationshipType: ECM_RELATIONSHIP_TYPES.REPORTS_TO,
      contextRole: "lender_employee",
      meta: { uiLabel: "Reporting Manager" },
      actorId: input.actorId,
    });
  } else {
    clearEcmContactRelationship({
      fromContactId: input.bankerContactId,
      relationshipType: ECM_RELATIONSHIP_TYPES.REPORTS_TO,
      actorId: input.actorId,
    });
  }

  const existing = listEcmContacts().find((c) => c.id === input.bankerContactId);
  if (!existing) throw new Error(`ECM contact not found: ${input.bankerContactId}`);

  const profile = { ...(existing.roleProfiles?.lender_employee ?? {}) };
  if (input.manager) {
    profile.reportingManagerContactId = input.manager.id;
    profile.reportingManagerName = input.manager.name;
  } else {
    delete profile.reportingManagerContactId;
    delete profile.reportingManagerName;
  }

  return updateEcmContact(
    input.bankerContactId,
    {
      roleProfiles: {
        ...existing.roleProfiles,
        lender_employee: profile,
      },
    },
    input.actorId,
  );
}

export function searchEcmContactsForReportingManager(
  query: string,
  excludeContactId?: string,
): EcmContact[] {
  const q = query.trim().toLowerCase();
  return listEcmContacts()
    .filter((c) => c.id !== excludeContactId && c.status !== "archived")
    .filter((c) => {
      if (!q) return getEcmContactAssignedRoles(c).includes("lender_employee");
      return (
        c.name.toLowerCase().includes(q) ||
        c.mobilePrimary.includes(q) ||
        (c.personalEmail?.toLowerCase().includes(q) ?? false) ||
        (c.officialEmail?.toLowerCase().includes(q) ?? false)
      );
    })
    .slice(0, 12);
}
