/**
 * CO-DOM-001 — Company representative helpers (communication contacts only).
 */
import {
  ECM_COMPANY_REPRESENTATIVE_ROLES,
  type EcmCompanyRepresentativeRole,
} from "@/constants/enterprise-company-master";
import type { EcmCompanyContactLink } from "@/types/enterprise-company-master";

export function isCompanyRepresentativeRole(
  role: string,
): role is EcmCompanyRepresentativeRole {
  return (ECM_COMPANY_REPRESENTATIVE_ROLES as readonly string[]).includes(role);
}

export function filterCompanyRepresentativeLinks(
  links: EcmCompanyContactLink[],
): EcmCompanyContactLink[] {
  return links.filter(
    (link) => link.status === "active" && isCompanyRepresentativeRole(link.relationRole),
  );
}
