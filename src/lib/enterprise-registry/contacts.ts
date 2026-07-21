/**
 * CO-HOTFIX-006 — Operational contact queries (Enterprise Registry SSOT).
 */

import type { EntityMasterOption } from "@/components/catalyst-one/shared/entity-master-search";
import {
  getEcmContactAssignedRoles,
  isEcmContactUsable,
  listEcmContacts,
} from "@/lib/enterprise-contact-master";
import type { EcmContact, EcmContactRole } from "@/types/enterprise-contact-master";

export interface EnterpriseContactOption extends EntityMasterOption {
  mobile?: string;
  email?: string;
  city?: string;
  state?: string;
  employmentType?: string;
  roles?: EcmContactRole[];
}

function isOperationalContact(c: EcmContact): boolean {
  return c.enabled !== false && isEcmContactUsable(c.status);
}

export function toContactPickerOption(c: EcmContact): EnterpriseContactOption {
  return {
    id: c.id,
    label: c.name,
    sublabel: c.mobilePrimary?.startsWith("pending-") ? "Provisional" : c.mobilePrimary,
    mobile: c.mobilePrimary?.startsWith("pending-") ? "" : c.mobilePrimary,
    email: c.personalEmail || c.officialEmail || "",
    city: c.city || "",
    state: c.state || "",
    employmentType: c.employmentType || "Salaried",
    roles: getEcmContactAssignedRoles(c),
  };
}

/** All operational contacts (excludes archived + soft-deleted via enabled/status). */
export function listOperationalContacts(): EnterpriseContactOption[] {
  return listEcmContacts().filter(isOperationalContact).map(toContactPickerOption);
}

/** Full ECM rows for modules that need platformAccess, strategicContact, etc. */
export function listOperationalEcmContacts(): EcmContact[] {
  return listEcmContacts().filter(isOperationalContact);
}

export function findOperationalEcmContactById(id: string): EcmContact | undefined {
  return findOperationalContactById(id);
}

export function findOperationalContactById(id: string): EcmContact | undefined {
  const row = listEcmContacts().find((c) => c.id === id);
  return row && isOperationalContact(row) ? row : undefined;
}

/** Unified name/mobile/email search — same algorithm in every module. */
export function searchOperationalContacts(query: string, opts?: { roles?: EcmContactRole[] }): EnterpriseContactOption[] {
  const q = query.trim().toLowerCase();
  let rows = listEcmContacts().filter(isOperationalContact);

  if (opts?.roles?.length) {
    rows = rows.filter((c) =>
      getEcmContactAssignedRoles(c).some((r) => opts.roles!.includes(r)),
    );
  }

  if (!q) return rows.map(toContactPickerOption);

  return rows
    .filter((c) => {
      const hay = [
        c.name,
        c.mobilePrimary,
        c.mobileSecondary,
        c.personalEmail,
        c.officialEmail,
        c.ownerName,
        ...getEcmContactAssignedRoles(c),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .map(toContactPickerOption);
}
