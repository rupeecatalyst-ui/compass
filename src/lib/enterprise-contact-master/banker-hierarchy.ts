/**
 * Banker enterprise hierarchy — reporting chain + organizational placement.
 * Hierarchy levels are NEVER hardcoded; they emerge from Reporting Manager links.
 */

import type { EcmContact } from "@/types/enterprise-contact-master";
import { getEcmContactAssignedRoles, listEcmContacts } from "./contact-registry";
import { getEcmMasterLabel } from "@/constants/enterprise-contact-master/masters";

/** Keys persisted on roleProfiles.lender_employee */
export const ECM_BANKER_PROFILE_KEYS = {
  institution: "institution",
  region: "region",
  city: "city",
  branch: "branch",
  designation: "designation",
  officialMobile: "officialMobile",
  officialEmail: "officialEmail",
  reportingManagerContactId: "reportingManagerContactId",
  reportingManagerName: "reportingManagerName",
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

export function getEcmBankerProfile(
  contact: EcmContact,
): Record<string, string> {
  return contact.roleProfiles?.lender_employee ?? {};
}

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

/**
 * Walk Reporting Manager links upward.
 * Missing middle roles (e.g. no Area Manager) simply shorten the chain — never break.
 */
export function buildEcmBankerReportingChain(
  contactId: string,
  options?: { maxDepth?: number },
): EcmBankerReportingNode[] {
  const maxDepth = options?.maxDepth ?? 20;
  const byId = new Map(listEcmContacts().map((c) => [c.id, c]));
  const chain: EcmBankerReportingNode[] = [];
  const seen = new Set<string>();
  let currentId: string | undefined = contactId;

  while (currentId && !seen.has(currentId) && chain.length < maxDepth) {
    seen.add(currentId);
    const contact = byId.get(currentId);
    if (!contact) break;
    const profile = getEcmBankerProfile(contact);
    chain.push({
      contactId: contact.id,
      name: contact.name,
      designation: profile.designation
        ? getEcmMasterLabel("designation", profile.designation) || profile.designation
        : undefined,
      reportingManagerContactId: profile.reportingManagerContactId || undefined,
    });
    currentId = profile.reportingManagerContactId || undefined;
  }

  return chain;
}

/** Direct reports — contacts whose Reporting Manager points to this contact. */
export function listEcmBankerDirectReports(managerContactId: string): EcmContact[] {
  return listEcmContacts().filter((c) => {
    if (!getEcmContactAssignedRoles(c).includes("lender_employee")) return false;
    return getEcmBankerProfile(c).reportingManagerContactId === managerContactId;
  });
}

export function searchEcmContactsForReportingManager(
  query: string,
  excludeContactId?: string,
): EcmContact[] {
  const q = query.trim().toLowerCase();
  return listEcmContacts()
    .filter((c) => c.id !== excludeContactId && c.status === "active")
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
