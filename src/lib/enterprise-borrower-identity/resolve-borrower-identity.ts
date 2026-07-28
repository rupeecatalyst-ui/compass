/**
 * CO-DOM-001A — Canonical borrower identity projection.
 *
 * Individual → Contact · Company → Company (representatives → Contacts).
 * Never assume Primary Borrower === Contact.
 */
import {
  assertOpportunityPrimaryBorrowerKind,
  isCompanyPrimaryBorrower,
  type OpportunityPrimaryBorrowerKind,
} from "@/constants/opportunity-primary-borrower";

export type BorrowerIdentitySource = {
  primaryBorrowerKind?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  primaryContactId?: string | null;
  primaryContactName?: string | null;
  primaryContactMobile?: string | null;
  primaryContactEmail?: string | null;
};

export type EnterpriseBorrowerIdentity = {
  kind: OpportunityPrimaryBorrowerKind;
  /** Display name — empty when uncaptured (CAD-2026-001). */
  displayName: string;
  companyId?: string;
  companyName?: string;
  /** Contact id when Individual borrower, or optional rep contact for Company. */
  primaryContactId?: string;
  primaryContactName?: string;
  primaryContactMobile?: string;
  primaryContactEmail?: string;
  /**
   * Party key for maps / session / participants:
   * `company:<id>` | `contact:<id>` | "" when unknown.
   */
  partyId: string;
  /**
   * LoanFile / Deal projection customerId:
   * companyId for company borrowers, primaryContactId for individuals.
   */
  partyEntityId: string;
};

function trimOrEmpty(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Resolve Opportunity / Deal borrower identity from Registry stamps.
 * Does not invent names or ids.
 */
export function resolveBorrowerIdentity(
  source: BorrowerIdentitySource | null | undefined,
): EnterpriseBorrowerIdentity {
  const kind = assertOpportunityPrimaryBorrowerKind(
    source?.primaryBorrowerKind,
  );
  const companyId = trimOrEmpty(source?.companyId) || undefined;
  const companyName = trimOrEmpty(source?.companyName) || undefined;
  const primaryContactId = trimOrEmpty(source?.primaryContactId) || undefined;
  const primaryContactName =
    trimOrEmpty(source?.primaryContactName) || undefined;
  const primaryContactMobile =
    trimOrEmpty(source?.primaryContactMobile) || undefined;
  const primaryContactEmail =
    trimOrEmpty(source?.primaryContactEmail) || undefined;

  if (kind === "company" || (isCompanyPrimaryBorrower({ primaryBorrowerKind: kind }) && companyId)) {
    const displayName =
      companyName || primaryContactName || "";
    return {
      kind: "company",
      displayName,
      companyId,
      companyName: companyName || displayName || undefined,
      primaryContactId,
      primaryContactName,
      primaryContactMobile,
      primaryContactEmail,
      partyId: companyId ? `company:${companyId}` : "",
      partyEntityId: companyId || "",
    };
  }

  return {
    kind: "individual",
    displayName: primaryContactName || "",
    primaryContactId,
    primaryContactName,
    primaryContactMobile,
    primaryContactEmail,
    partyId: primaryContactId ? `contact:${primaryContactId}` : "",
    partyEntityId: primaryContactId || "",
  };
}

/** Alias for Opportunity Registry rows / API records. */
export function resolveOpportunityBorrowerIdentity(
  opportunity: BorrowerIdentitySource | null | undefined,
): EnterpriseBorrowerIdentity {
  return resolveBorrowerIdentity(opportunity);
}

/**
 * Deal rows may omit primaryBorrowerKind — companyId means Company borrower
 * (Contact stamps are optional representatives, not the primary party).
 */
export function resolveDealBorrowerIdentity(
  deal: BorrowerIdentitySource | null | undefined,
): EnterpriseBorrowerIdentity {
  if (!deal) return resolveBorrowerIdentity(deal);
  if (deal.primaryBorrowerKind) {
    return resolveBorrowerIdentity(deal);
  }
  const companyId = trimOrEmpty(deal.companyId);
  if (companyId) {
    return resolveBorrowerIdentity({
      ...deal,
      primaryBorrowerKind: "company",
    });
  }
  return resolveBorrowerIdentity({
    ...deal,
    primaryBorrowerKind: "individual",
  });
}

/** True when a Contact is required as the primary borrower entity. */
export function borrowerRequiresPrimaryContact(
  source: BorrowerIdentitySource | null | undefined,
): boolean {
  return resolveBorrowerIdentity(source).kind === "individual";
}

/** Display label for registries — "—" when uncaptured. */
export function borrowerDisplayNameOrDash(
  source: BorrowerIdentitySource | null | undefined,
): string {
  const name = resolveBorrowerIdentity(source).displayName;
  return name || "—";
}
