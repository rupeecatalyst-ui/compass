/**
 * CO-ARCH-005 — Move Opportunity Execution Queue → Enterprise Deal(s).
 * No LoanFile, loadLoanFiles, saveLoanFiles, projection cache, or dual-write.
 */
import { getAccessToken } from "@/lib/api-client";
import { createDealFromOpportunity } from "@/lib/enterprise-deal/deal-create-from-opportunity";
import { putSessionDeal, bindSessionDeal } from "@/lib/enterprise-session";
import {
  getStrategicShortlist,
  normalizeLenderKey,
  upsertStrategicAnalysis,
} from "@/lib/strategic-lender-pipeline/sync";
import {
  buildCanonicalLenderRef,
  listCanonicalEnterpriseLenderOptionsAsync,
  resolvePersistedLenderForDeal,
} from "@/lib/enterprise-lender-registry/published-directory";
import { invalidatePublishedLendersSession } from "@/lib/enterprise-session/published-lenders-session";
import { rememberOpportunityRegistryContext } from "@/lib/lead-opportunity-journey/opportunity-context";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { buildDealWorkspaceHref } from "@/lib/loan-journey/adr-018-routing";
import type { OpportunityLoanContactHint } from "@/lib/opportunity-loan-continuity";
import type { LoanLenderExecution } from "@/types/catalyst-one";

export type MoveToDealInput = {
  opportunityId: string;
  opportunity?: import("@/lib/enterprise-opportunity/opportunity-api-client").EnterpriseOpportunityApiRecord | null;
  contact?: OpportunityLoanContactHint | null;
  customerName?: string;
  customerMobile?: string;
  customerId?: string;
  loanProduct?: string;
  loanAmount?: number;
  relationshipManager?: string;
};

export type MoveToDealResult = {
  /** @deprecated Prefer primaryDealId — LoanFile identity retired. */
  fileId: string;
  opportunityId: string;
  primaryDealId: string;
  deals: Array<{ dealId: string; dealNumber: string; lenderId: string; lenderName: string }>;
  dealWorkspaceHref: string;
};

function assertSessionForMoveToDeal(): void {
  if (!getAccessToken()?.trim()) {
    throw Object.assign(
      new Error(
        "Missing: Session. Reason: not signed in (or token cleared). Action: sign in, reopen LIFE, then Move to Deal.",
      ),
      { status: 401, code: "SESSION_EXPIRED" },
    );
  }
}

function buildIdentifiedCases(
  opportunityId: string,
  items: Array<{
    lenderId: string;
    lenderName: string;
    lenderRef?: string;
    product?: string;
  }>,
  amount: number | undefined,
  product: string,
  actor: string,
): LoanLenderExecution[] {
  const now = new Date().toISOString();
  return items.map((item, index) => ({
    id: `deal-${item.lenderId}-${Date.now()}-${index}`,
    lender: item.lenderName,
    status: "active" as const,
    caseStage: "identified" as const,
    isPrimary: index === 0,
    lenderRegistryId: item.lenderId,
    lenderRef: item.lenderRef || `lender:${item.lenderId}`,
    fromStrategic: true,
    opportunityId,
    expectedLoanAmount: amount,
    product,
    createdBy: actor,
    createdAt: now,
    updatedAt: now,
    identifiedAt: now,
  }));
}

/**
 * Move Opportunity Execution Queue → Enterprise Deal(s) → Deal Workspace.
 */
export async function moveOpportunityToDeal(
  input: MoveToDealInput,
): Promise<MoveToDealResult> {
  assertSessionForMoveToDeal();

  if (!input.opportunityId?.trim()) {
    throw new Error(
      "Missing: Opportunity. Reason: no active Opportunity Context. Action: reopen from My Opportunities.",
    );
  }

  const opportunity =
    input.opportunity?.id === input.opportunityId
      ? input.opportunity
      : await enterpriseOpportunityApiClient.getOpportunity(input.opportunityId);
  rememberOpportunityRegistryContext(opportunity);

  const shortlist = getStrategicShortlist(input.opportunityId);
  if (shortlist.length === 0) {
    throw new Error(
      "Missing: Lender selection. Reason: Execution Queue is empty. Action: select at least one lender in Chanakya Recommendations or Manual Selection.",
    );
  }

  // CO-BUG-011 — Resolve against Prisma Enterprise Lender Registry only.
  invalidatePublishedLendersSession();
  const registryOptions = await listCanonicalEnterpriseLenderOptionsAsync();
  if (registryOptions.length === 0) {
    throw new Error(
      "Missing: Enterprise Lender Registry. Reason: no active canonical lenders returned from the server. Action: verify Lender Registry in Administration, then retry Manual Recommendation.",
    );
  }
  const resolved = [];
  for (const item of shortlist) {
    const opt = await resolvePersistedLenderForDeal(item, registryOptions);
    if (!opt) {
      resolved.push({ item, lenderId: null as string | null, opt: null });
      continue;
    }
    resolved.push({
      opt,
      lenderId: opt.id,
      item: {
        ...item,
        enterpriseLenderId: opt.id,
        lenderCode: opt.seedKey || opt.code,
        lenderRef: buildCanonicalLenderRef(opt),
        lenderName: opt.displayName || opt.code || item.lenderName,
      },
    });
  }

  const unresolved = resolved.filter((r) => !r.lenderId);
  if (unresolved.length > 0) {
    const names = unresolved.map((u) => u.item.lenderName || u.item.lenderRef || "Unknown");
    throw new Error(
      `Missing: Valid Enterprise Lender Registry id. Reason: ${names.join(
        ", ",
      )} could not be mapped to a Prisma Lender primary key (Soft Go-Live / provisional ids are not allowed). Action: re-select lenders from Manual Recommendation after the Enterprise Lender Registry loads from the server.`,
    );
  }

  const productLabel =
    input.loanProduct || opportunity.productLabel || "Home Loan";
  const amount = input.loanAmount ?? opportunity.requestedAmount ?? undefined;
  const customerName =
    input.customerName || opportunity.primaryContactName || undefined;
  const customerMobile =
    input.customerMobile || opportunity.primaryContactMobile || undefined;
  const customerId = input.customerId || opportunity.primaryContactId || undefined;
  const relationshipManager =
    input.relationshipManager ||
    opportunity.relationshipManagerName ||
    undefined;

  // Preserve LIFE analysis memory (Opportunity-scoped) without LoanFile sync.
  upsertStrategicAnalysis(
    input.opportunityId,
    resolved.map((r) => r.item),
  );

  const deals: MoveToDealResult["deals"] = [];
  let primaryDealId = "";

  for (const { item, lenderId } of resolved) {
    if (!lenderId) continue;

    const allCases = buildIdentifiedCases(
      input.opportunityId,
      resolved
        .filter((r): r is typeof r & { lenderId: string } => Boolean(r.lenderId))
        .map((r) => ({
          lenderId: r.lenderId!,
          lenderName: r.item.lenderName,
          lenderRef: r.item.lenderRef,
          product: productLabel,
        })),
      amount,
      productLabel,
      "RM",
    ).map((c) => ({
      ...c,
      isPrimary: c.lenderRegistryId === lenderId,
    }));

    // Ensure current lender is present even if shortlist key mismatch.
    const hasCase = allCases.some((c) => c.lenderRegistryId === lenderId);
    const thisCase: LoanLenderExecution = hasCase
      ? {
          ...allCases.find((c) => c.lenderRegistryId === lenderId)!,
          isPrimary: true,
        }
      : {
          id: `deal-${lenderId}-${Date.now()}`,
          lender: item.lenderName,
          status: "active",
          caseStage: "identified",
          isPrimary: true,
          lenderRegistryId: lenderId,
          lenderRef: `lender:${lenderId}`,
          fromStrategic: true,
          opportunityId: input.opportunityId,
          expectedLoanAmount: amount,
          product: productLabel,
          createdBy: "RM",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          identifiedAt: new Date().toISOString(),
        };

    // CO-ARCH-007 — One Deal = one lender; snapshot is derived single-lender only.
    const deal = await createDealFromOpportunity({
      opportunity,
      lenderId,
      lenderName: item.lenderName,
      lenders: [thisCase],
      customerName,
      customerMobile,
      customerId,
      loanProduct: productLabel,
      loanAmount: amount,
      relationshipManager,
    });

    putSessionDeal(deal);
    bindSessionDeal(deal);

    if (!primaryDealId) primaryDealId = deal.id;

    deals.push({
      dealId: deal.id,
      dealNumber: deal.dealNumber,
      lenderId,
      lenderName: item.lenderName,
    });
  }

  if (deals.length === 0 || !primaryDealId) {
    throw new Error(
      "Missing: Deal create. Reason: no lenders resolved to Enterprise Lender Registry ids. Action: select lenders from Manual Selection.",
    );
  }

  try {
    await enterpriseOpportunityApiClient.markConvertedToDeal(input.opportunityId);
  } catch {
    /* conversion mark is best-effort; Deal create already succeeded */
  }

  setActiveOpportunityContext({
    opportunityId: input.opportunityId,
    opportunityReference: opportunity.opportunityNumber,
    contactId: opportunity.primaryContactId,
    customer: opportunity.primaryContactName ?? undefined,
    product: opportunity.productLabel ?? undefined,
    stage: opportunity.requirementStage ?? undefined,
    owner: opportunity.relationshipManagerName ?? undefined,
    fileId: primaryDealId,
    customerName: opportunity.primaryContactName ?? undefined,
    label: opportunity.opportunityNumber,
  });

  const primary = deals[0]!;
  const dealWorkspaceHref = buildDealWorkspaceHref({
    dealId: primary.dealId,
    opportunityId: input.opportunityId,
    tab: "lenders",
    lenderId: primary.lenderId,
  });

  return {
    fileId: primaryDealId,
    opportunityId: input.opportunityId,
    primaryDealId,
    deals,
    dealWorkspaceHref,
  };
}

/** Exported for tests — lender key normalize used in Move to Deal diagnostics. */
export { normalizeLenderKey };
