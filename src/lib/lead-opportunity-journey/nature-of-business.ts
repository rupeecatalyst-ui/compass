/**
 * CO-UX-009 — Nature of Business SSOT resolution.
 * Customer / Company Profile owns the value; Loan / Opportunity desks consume it.
 */

import { getEcmMasterLabel } from "@/constants/enterprise-contact-master";
import {
  findEcmCompanyByName,
  getEcmCompany,
  listContactCompanyLinks,
} from "@/lib/enterprise-company-master";
import { listEcmContacts } from "@/lib/enterprise-contact-master";
import type { LoanFile } from "@/types/catalyst-one";

export const NATURE_OF_BUSINESS_NOT_AVAILABLE = "Not Available";

export type NatureOfBusinessResolution = {
  /** Master id or free-text legacy value */
  code: string | null;
  /** Display label for UI */
  label: string;
  source: "company" | "contact" | "none";
};

function displayNatureLabel(raw?: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  return getEcmMasterLabel("nature_of_business", value) || value;
}

/**
 * Resolve Nature of Business from Customer / Company Profile only.
 * Never invent from constitution or other loan-file fields.
 */
export function resolveNatureOfBusinessFromProfile(
  file: LoanFile,
): NatureOfBusinessResolution {
  const contact = listEcmContacts().find((c) => c.id === file.customerId);
  const customer = contact?.roleProfiles?.customer ?? {};

  const links = contact ? listContactCompanyLinks(contact.id) : [];
  for (const link of links) {
    const company = getEcmCompany(link.companyId);
    const code = company?.natureOfBusiness?.trim() || "";
    const label = displayNatureLabel(code);
    if (code && label) {
      return { code, label, source: "company" };
    }
  }

  const companyName = file.businessDetails?.companyName?.trim();
  if (companyName) {
    const byName = findEcmCompanyByName(companyName);
    const code = byName?.natureOfBusiness?.trim() || "";
    const label = displayNatureLabel(code);
    if (code && label) {
      return { code, label, source: "company" };
    }
  }

  const code = customer.natureOfBusiness?.trim() || "";
  const fromContact = displayNatureLabel(code);
  if (code && fromContact) {
    return { code, label: fromContact, source: "contact" };
  }

  return {
    code: null,
    label: NATURE_OF_BUSINESS_NOT_AVAILABLE,
    source: "none",
  };
}

export function natureOfBusinessDisplayLabel(file: LoanFile): string {
  return resolveNatureOfBusinessFromProfile(file).label;
}
