/**
 * Compact CHANAKYA workspace identity from the current Opportunity.
 * Presentation only. Does not read an assessment snapshot.
 */
import { resolveOpportunityBorrowerIdentity } from "@/lib/enterprise-borrower-identity/resolve-borrower-identity";
import { formatINR } from "@/lib/format-currency";

const UNSPECIFIED = "Not Specified";

export type ChanakyaOpportunityContextSource = {
  primaryBorrowerKind?: "individual" | "company" | null;
  primaryContactId?: string | null;
  primaryContactName?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  opportunityNumber?: string | null;
  productLabel?: string | null;
  productCode?: string | null;
  requestedAmount?: number | null;
};

export type ChanakyaOpportunityContextIdentity = {
  borrowerName: string | null;
  opportunityNumber: string | null;
  productLabel: string | null;
  productCode: string | null;
  requestedAmount: number | null;
};

export function chanakyaContextIdentityFromOpportunity(
  source: ChanakyaOpportunityContextSource,
): ChanakyaOpportunityContextIdentity {
  const borrowerName = resolveOpportunityBorrowerIdentity(source).displayName.trim();
  return {
    borrowerName: borrowerName || null,
    opportunityNumber: source.opportunityNumber?.trim() || null,
    productLabel: source.productLabel?.trim() || null,
    productCode: source.productCode?.trim() || null,
    requestedAmount:
      source.requestedAmount == null || !Number.isFinite(source.requestedAmount)
        ? null
        : source.requestedAmount,
  };
}

export function formatChanakyaOpportunityContextLine(
  identity: ChanakyaOpportunityContextIdentity,
): string {
  const borrower = identity.borrowerName?.trim() || UNSPECIFIED;
  const opportunityNumber = identity.opportunityNumber?.trim() || UNSPECIFIED;
  const product = identity.productLabel?.trim() || identity.productCode?.trim() || UNSPECIFIED;
  const amount =
    identity.requestedAmount == null ? UNSPECIFIED : formatINR(identity.requestedAmount, false);
  return [borrower, opportunityNumber, product, amount].join(" · ");
}
