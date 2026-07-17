/**
 * Contact Registry filters — Enterprise Party Registry.
 * Future roles: add to ECM Role Master; they appear here automatically.
 */

import { ECM_ROLE_MASTER, getEcmRoleLabel } from "@/constants/enterprise-contact-master";
import type { EcmContactRole } from "@/types/enterprise-contact-master";

export type ContactRegistryFilterKind = "all" | "individuals" | "companies" | "role";

export interface ContactRegistryFilterDef {
  id: string;
  label: string;
  kind: ContactRegistryFilterKind;
  /** When kind === "role" */
  role?: EcmContactRole;
}

const ROLE_FILTER_PLURAL: Partial<Record<EcmContactRole, string>> = {
  customer: "Borrowers",
  employee: "Employees",
  lender_employee: "Lender Contacts",
  partner: "Partners",
  investor: "Investors",
  builder: "Builders",
  chartered_accountant: "Chartered Accountants",
};

/** Stable filter strip for Contacts — All / Individuals / Companies / roles. */
export function listContactRegistryFilters(): ContactRegistryFilterDef[] {
  const roleFilters: ContactRegistryFilterDef[] = [...ECM_ROLE_MASTER]
    .filter((r) => r.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => ({
      id: r.code,
      label: ROLE_FILTER_PLURAL[r.code] ?? `${getEcmRoleLabel(r.code)}s`,
      kind: "role" as const,
      role: r.code,
    }));

  return [
    { id: "all", label: "All", kind: "all" },
    { id: "individuals", label: "Individuals", kind: "individuals" },
    { id: "companies", label: "Companies", kind: "companies" },
    ...roleFilters,
  ];
}
