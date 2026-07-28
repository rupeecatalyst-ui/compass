/**
 * Ensure Loan Workspace attachment for an Opportunity (LIFE → Deal Execution).
 *
 * CAD-2026-001 Priority 1 — Deal / Loan Workspace responsibilities ONLY.
 * - Creates / links a Deal (LoanFile-shaped) attachment for lender execution.
 * - NEVER writes Opportunity Registry business fields.
 * - NEVER invents amount / lendingType / transactionType for Opportunity display.
 * - Prefer caller-supplied values (typically copied from Opportunity Registry).
 * - Async path enriches missing seed fields from Opportunity Registry when present.
 *
 * Opportunity Workspace / Opportunity runtime projection must not consume this
 * module's output as business SSOT (FS-01 / CAD-2026-001).
 */

import { createDealAsync } from "@/lib/enterprise-deal/deal-data-access";
import {
  enterpriseOpportunityApiClient,
  type EnterpriseOpportunityApiRecord,
} from "@/lib/enterprise-opportunity/opportunity-api-client";
import { peekSessionOpportunity } from "@/lib/enterprise-session";
import { resolveOpportunityBorrowerIdentity } from "@/lib/enterprise-borrower-identity";
import {
  rememberOpportunityActiveLoan,
  resolveLoansForOpportunity,
  type OpportunityLoanContactHint,
} from "@/lib/opportunity-loan-continuity";
import type { CreateLoanFileInput, LendingType, LoanFile, TransactionType } from "@/types/catalyst-one";

export type EnsureLoanWorkspaceInput = {
  opportunityId: string;
  /** CO-ARCH-002 — Prefer session/provider Opportunity; avoids Registry re-GET. */
  opportunity?: EnterpriseOpportunityApiRecord | null;
  contact?: OpportunityLoanContactHint | null;
  customerName?: string;
  customerMobile?: string;
  customerEmail?: string;
  customerId?: string;
  city?: string;
  state?: string;
  employmentType?: string;
  loanProduct?: string;
  /** Only when known from Opportunity / caller — never invent 5_000_000. */
  loanAmount?: number;
  relationshipManager?: string;
  /** Deal seed only when known — never invent "secured". */
  lendingType?: LendingType;
  /** Deal seed only when known — never invent "fresh". */
  transactionType?: TransactionType;
};

/**
 * Build CreateLoanFileInput for Deal attachment.
 * CAD-2026-001: no fabricated requiredAmount / lendingType / transactionType.
 */
function buildCreateInput(input: EnsureLoanWorkspaceInput): CreateLoanFileInput {
  const now = new Date().toISOString().slice(0, 10);
  const amountCaptured =
    typeof input.loanAmount === "number" &&
    Number.isFinite(input.loanAmount) &&
    !Number.isNaN(input.loanAmount);
  const amount = amountCaptured ? (input.loanAmount as number) : 0;

  const payload: CreateLoanFileInput = {
    customerId: input.customerId ?? input.contact?.id,
    customerName: input.customerName || input.contact?.name || "Customer",
    customerMobile:
      input.customerMobile ||
      input.contact?.mobilePrimary ||
      input.contact?.mobile ||
      "0000000000",
    customerEmail: input.customerEmail || "pending@example.com",
    city: input.city || "Pune",
    state: input.state || "Maharashtra",
    employmentType: input.employmentType || "salaried",
    // Do not hardcode "secured". Empty when unknown.
    // Residual: createLoanFileFromInput may still infer from product (Priority 2).
    lendingType: (input.lendingType ?? "") as LendingType,
    loanProduct: input.loanProduct?.trim() || "",
    loanAmount: amount,
    requiredAmount: amount,
    lender: "TBD",
    relationshipManager: input.relationshipManager || "RM",
    priority: "medium",
    loginDate: now,
    expectedLoginDate: now,
    internalNotes: `Linked from LIFE Execution Queue · ${input.opportunityId}`,
    approxCibilScore: "not_known",
  };

  if (input.transactionType) {
    payload.transactionType = input.transactionType;
  }
  // CAD: do not set transactionType when unknown — omit (do not force "fresh").

  return payload;
}

/**
 * Enrich Deal seed from Opportunity Registry (authoritative) when caller omitted fields.
 * Does not write back to Opportunity.
 */
async function enrichSeedFromOpportunityRegistry(
  input: EnsureLoanWorkspaceInput,
): Promise<EnsureLoanWorkspaceInput> {
  if (!input.opportunityId?.trim()) return input;
  try {
    const opp =
      input.opportunity ||
      peekSessionOpportunity(input.opportunityId) ||
      (await enterpriseOpportunityApiClient.getOpportunity(input.opportunityId));
    const oppTxn = opp.transactionType?.trim();
    const txn =
      input.transactionType ||
      (oppTxn === "fresh" || oppTxn === "balance_transfer"
        ? (oppTxn as TransactionType)
        : undefined);

    const borrower = resolveOpportunityBorrowerIdentity(opp);
    return {
      ...input,
      opportunity: opp,
      customerName: input.customerName || borrower.displayName || undefined,
      customerMobile:
        input.customerMobile ||
        borrower.primaryContactMobile ||
        opp.primaryContactMobile ||
        undefined,
      customerEmail:
        input.customerEmail ||
        borrower.primaryContactEmail ||
        opp.primaryContactEmail ||
        undefined,
      customerId: input.customerId || borrower.partyEntityId || undefined,
      loanProduct:
        input.loanProduct ||
        opp.productLabel?.trim() ||
        opp.productCode?.trim() ||
        undefined,
      loanAmount:
        input.loanAmount ??
        (typeof opp.requestedAmount === "number" && !Number.isNaN(opp.requestedAmount)
          ? opp.requestedAmount
          : undefined),
      relationshipManager:
        input.relationshipManager || opp.relationshipManagerName || undefined,
      transactionType: txn,
    };
  } catch {
    return input;
  }
}

/**
 * Async path — preferred when Deal Registry primary write is enabled.
 * Sync ensureLoanWorkspaceForOpportunity removed (CO-ARCH-006 — zero callers).
 */
export async function ensureLoanWorkspaceForOpportunityAsync(
  input: EnsureLoanWorkspaceInput,
): Promise<LoanFile | null> {
  if (!input.opportunityId) return null;

  const existing = resolveLoansForOpportunity(input.opportunityId, input.contact);
  if (existing[0]) {
    rememberOpportunityActiveLoan(input.opportunityId, existing[0].id);
    return existing[0];
  }

  const seeded = await enrichSeedFromOpportunityRegistry(input);
  const result = await createDealAsync(
    buildCreateInput(seeded),
    "opportunity_workspace",
    undefined,
    {
      existingOpportunityId: input.opportunityId,
      opportunity: seeded.opportunity ?? null,
    },
  );
  rememberOpportunityActiveLoan(input.opportunityId, result.file.id);
  return result.file;
}
