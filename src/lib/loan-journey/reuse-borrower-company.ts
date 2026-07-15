/**
 * Prompt 019 — Reuse Borrower Profile employer / business in Loan Journey.
 */

import { findEcmCompanyByName } from "@/lib/enterprise-company-master";

export function resolveAssociatedCompanyFromBorrowerProfile(input: {
  employerName?: string;
  businessName?: string;
}): { id: string; name: string; fromProfile: true } | null {
  const name = (input.employerName || input.businessName || "").trim();
  if (!name) return null;

  const match = findEcmCompanyByName(name);
  if (match) {
    return {
      id: match.id,
      name: match.companyName,
      fromProfile: true,
    };
  }

  return {
    id: `profile-company:${name}`,
    name,
    fromProfile: true,
  };
}
