/**
 * CO-ARCH-005 — Create Enterprise Deal from Opportunity + lenders (no LoanFile).
 * CO-DOM-001A — Borrower may be Contact (individual) or Company.
 */
import { assertPrimaryWriteEnvironment, DealCreatePersistenceError } from "@/lib/enterprise-deal/primary-write";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import type { DealCreateBody } from "@/lib/enterprise-deal/map-loan-file-to-deal";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { resolveOpportunityBorrowerIdentity } from "@/lib/enterprise-borrower-identity";
import type { LoanLenderExecution } from "@/types/catalyst-one";

export type CreateDealFromOpportunityInput = {
  opportunity: EnterpriseOpportunityApiRecord;
  lenderId: string;
  lenderName: string;
  lenderProgramId?: string | null;
  lenders: LoanLenderExecution[];
  customerName?: string;
  customerMobile?: string;
  customerId?: string;
  loanProduct?: string;
  loanAmount?: number;
  relationshipManager?: string;
};

function buildSnapshot(
  opportunity: EnterpriseOpportunityApiRecord,
  lenders: LoanLenderExecution[],
  productLabel: string,
  amount: number | null,
  ownerLenderId: string,
): Record<string, unknown> {
  // CO-ARCH-007 — Derived single-lender projection only (never multi-lender SSOT).
  const owned =
    lenders.find((l) => l.lenderRegistryId === ownerLenderId) ??
    lenders.find((l) => l.isPrimary) ??
    lenders[0];
  const single = owned
    ? [
        {
          id: owned.id,
          name: owned.lender,
          status: owned.status,
          caseStage: owned.caseStage,
          lenderRegistryId: owned.lenderRegistryId ?? ownerLenderId,
          lenderRef: owned.lenderRef ?? null,
          isPrimary: true,
          opportunityId: owned.opportunityId ?? opportunity.id,
          expectedLoanAmount: owned.expectedLoanAmount,
          product: owned.product,
        },
      ]
    : [];
  return {
    source: "enterprise_deal_derived",
    opportunityId: opportunity.id,
    opportunityNumber: opportunity.opportunityNumber,
    primaryBorrowerKind: opportunity.primaryBorrowerKind ?? "individual",
    companyId: opportunity.companyId ?? null,
    companyName: opportunity.companyName ?? null,
    primaryContact: {
      id: opportunity.primaryContactId,
      name: opportunity.primaryContactName,
      mobile: opportunity.primaryContactMobile,
    },
    product: { label: productLabel },
    stage: { grossStage: "login", subStage: null },
    amounts: { requiredAmount: amount, loanAmount: amount },
    lenders: single,
  };
}

export function buildDealCreateBodyFromOpportunity(
  input: CreateDealFromOpportunityInput,
): DealCreateBody {
  const { opportunity, lenderId, lenderName, lenders } = input;
  if (!opportunity?.id?.trim()) {
    throw new DealCreatePersistenceError("opportunityId is required (BI-2)", "VALIDATION", 400);
  }
  if (!lenderId?.trim()) {
    throw new DealCreatePersistenceError("lenderId is required (BI-3)", "VALIDATION", 400);
  }

  const productLabel =
    input.loanProduct?.trim() ||
    opportunity.productLabel?.trim() ||
    "Home Loan";
  const amount =
    input.loanAmount ??
    opportunity.requestedAmount ??
    null;
  const primary =
    lenders.find((l) => l.lenderRegistryId === lenderId) ??
    lenders.find((l) => l.isPrimary);
  const borrower = resolveOpportunityBorrowerIdentity(opportunity);
  const displayName =
    input.customerName?.trim() || borrower.displayName || null;
  const partyId =
    input.customerId?.trim() || borrower.partyEntityId || null;

  return {
    productFamily: "lending",
    grossStage: "login",
    opportunityId: opportunity.id,
    lenderId,
    lenderProgramId: input.lenderProgramId ?? null,
    legacyLoanFileId: null,
    fileNumber: null,
    productLabel,
    productCode: productLabel.toUpperCase().replace(/\s+/g, "_"),
    transactionType: opportunity.transactionType ?? null,
    primaryBorrowerKind: borrower.kind,
    companyId: borrower.companyId ?? opportunity.companyId ?? null,
    companyName: borrower.companyName ?? opportunity.companyName ?? null,
    primaryContactId:
      borrower.kind === "individual"
        ? partyId || opportunity.primaryContactId || null
        : opportunity.primaryContactId ?? null,
    // Denormalized borrower display (Contact name or Company name) for registry scan.
    primaryContactName: displayName,
    primaryContactMobile:
      input.customerMobile || opportunity.primaryContactMobile || null,
    primaryContactEmail: opportunity.primaryContactEmail ?? null,
    relationshipManagerName:
      input.relationshipManager ||
      opportunity.relationshipManagerName ||
      null,
    priority: "medium",
    requestedAmount: amount,
    currencyCode: "INR",
    snapshot: buildSnapshot(opportunity, lenders, productLabel, amount, lenderId),
    primaryCounterpartyName: primary?.lender || lenderName || null,
  };
}

export async function createDealFromOpportunity(
  input: CreateDealFromOpportunityInput,
): Promise<EnterpriseDealApiRecord> {
  assertPrimaryWriteEnvironment();
  if (typeof window === "undefined") {
    throw new DealCreatePersistenceError(
      "Deal create must run in the browser session (authenticated API client).",
      "CLIENT_ONLY",
    );
  }
  try {
    return await enterpriseDealApiClient.createDeal(
      buildDealCreateBodyFromOpportunity(input),
    );
  } catch (err) {
    const e = err as Error & { status?: number; code?: string };
    throw new DealCreatePersistenceError(
      e.message || "Enterprise Deal create failed",
      e.code || "DEAL_API_ERROR",
      e.status,
    );
  }
}
