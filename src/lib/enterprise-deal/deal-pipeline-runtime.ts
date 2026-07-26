/**
 * CO-ARCH-007 — Deal Pipeline Runtime (Opportunity execution desk).
 * EnterpriseDeal is the ONLY SSOT for lender negotiations.
 * snapshot.lenders is a single-lender derived projection only — never multi-lender SSOT.
 */
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { createDealFromOpportunity } from "@/lib/enterprise-deal/deal-create-from-opportunity";
import {
  grossStageToLenderCaseStage,
  lenderCaseStageToGrossStage,
} from "@/lib/enterprise-deal/deal-lender-stage-map";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { putSessionDeal, bindSessionDeal } from "@/lib/enterprise-session";
import type { LoanLenderExecution, LenderCaseStage } from "@/types/catalyst-one";
import type {
  DealPipelineContext,
  DealPipelineRuntime,
  DealSnapshotLender,
} from "@/types/deal-pipeline-runtime";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import type { LoanCommercialPayeeType } from "@/constants/loan-commercial-payee";

function readDerivedSingleLender(
  deal: EnterpriseDealApiRecord,
): DealSnapshotLender | null {
  const snap = deal.snapshot as { lenders?: DealSnapshotLender[] } | null | undefined;
  if (!Array.isArray(snap?.lenders) || snap.lenders.length === 0) return null;
  const byId = deal.lenderId
    ? snap.lenders.find((l) => l.lenderRegistryId === deal.lenderId)
    : undefined;
  return byId ?? snap.lenders[0] ?? null;
}

/** Project one EnterpriseDeal → one Pipeline card (CO-ARCH-007). */
export function dealToLenderExecution(deal: EnterpriseDealApiRecord): LoanLenderExecution {
  const now = deal.updatedAt || deal.createdAt || new Date().toISOString();
  const derived = readDerivedSingleLender(deal);
  const caseStage =
    (derived?.caseStage as LenderCaseStage | undefined) ||
    grossStageToLenderCaseStage(deal.grossStage);
  const name =
    derived?.name ||
    deal.primaryCounterpartyName ||
    "Lender";

  return {
    id: deal.id,
    enterpriseDealId: deal.id,
    enterpriseDealRowVersion: deal.rowVersion,
    lender: name,
    status: (derived?.status as LoanLenderExecution["status"]) || "active",
    caseStage,
    isPrimary: Boolean(derived?.isPrimary),
    lenderRegistryId: deal.lenderId ?? derived?.lenderRegistryId ?? undefined,
    lenderRef: deal.lenderId ? `lender:${deal.lenderId}` : derived?.lenderRef || undefined,
    lenderProgramId: deal.lenderProgramId ?? undefined,
    opportunityId: deal.opportunityId ?? derived?.opportunityId ?? undefined,
    expectedLoanAmount: derived?.expectedLoanAmount ?? deal.requestedAmount ?? undefined,
    product: derived?.product || deal.productLabel || undefined,
    identifiedAt: now,
    createdAt: deal.createdAt || now,
    updatedAt: deal.updatedAt || now,
  };
}

/** Build single-lender derived snapshot from Deal + case (never multi-lender SSOT). */
export function buildDerivedSingleLenderSnapshot(
  deal: EnterpriseDealApiRecord,
  lender: LoanLenderExecution,
): Record<string, unknown> {
  const prev =
    deal.snapshot && typeof deal.snapshot === "object"
      ? (deal.snapshot as Record<string, unknown>)
      : {};
  return {
    ...prev,
    source: "enterprise_deal_derived",
    opportunityId: deal.opportunityId,
    lenders: [
      {
        id: lender.id || deal.id,
        name: lender.lender,
        status: lender.status,
        caseStage: lender.caseStage,
        lenderRegistryId: lender.lenderRegistryId ?? deal.lenderId ?? null,
        lenderRef: lender.lenderRef ?? null,
        isPrimary: Boolean(lender.isPrimary),
        opportunityId: lender.opportunityId ?? deal.opportunityId ?? null,
        expectedLoanAmount: lender.expectedLoanAmount,
        product: lender.product,
        enterpriseDealId: deal.id,
      },
    ],
  };
}

export function toDealPipelineContext(deal: EnterpriseDealApiRecord): DealPipelineContext {
  return {
    dealId: deal.id,
    dealNumber: deal.dealNumber,
    opportunityId: deal.opportunityId,
    opportunityNumber: deal.opportunityNumber,
    requiredAmount: deal.requestedAmount ?? 0,
    loanProduct: deal.productLabel || "",
    productCode: undefined,
    relationshipManager: deal.relationshipManagerName || "",
    customerName: deal.primaryContactName || "",
    customerId: deal.primaryContactId,
    invoicePartyId: deal.invoicePartyId,
    commissionAccountingPayeeId: deal.invoicePartyId,
    commercialPayee: (deal.invoicePartyType as LoanCommercialPayeeType) || undefined,
    commercialPayeeSpecify: deal.invoicePartySpecify,
    rowVersion: deal.rowVersion,
  };
}

function toRuntime(
  anchor: EnterpriseDealApiRecord,
  siblingDeals: EnterpriseDealApiRecord[],
): DealPipelineRuntime {
  const deals =
    siblingDeals.length > 0
      ? siblingDeals
      : [anchor];
  return {
    deal: deals.find((d) => d.id === anchor.id) ?? anchor,
    context: toDealPipelineContext(anchor),
    lenders: deals.map(dealToLenderExecution),
    siblingDeals: deals,
  };
}

/**
 * Load Opportunity execution desk: all Enterprise Deals for the Opportunity.
 * Anchor dealId opens the route; lenders come from listDealsByOpportunity.
 */
export async function loadDealPipelineRuntime(dealId: string): Promise<DealPipelineRuntime> {
  const id = dealId.trim();
  if (!id) throw new Error("Missing Enterprise Deal id.");

  let anchor: EnterpriseDealApiRecord;
  try {
    // Prefer network; fall back to session row right after Move to Deal create
    // so navigation is never blocked by a transient GET miss (CO-BUG-009).
    anchor = await enterpriseDealApiClient.getDeal(id, { forceRefresh: true });
  } catch (err) {
    const { peekSessionDeal } = await import(
      "@/lib/enterprise-session/deal-runtime-cache"
    );
    const warm = peekSessionDeal(id);
    if (!warm?.id) throw err;
    anchor = warm as EnterpriseDealApiRecord;
  }
  putSessionDeal(anchor);
  bindSessionDeal(anchor);

  const opportunityId = anchor.opportunityId?.trim();
  if (!opportunityId) {
    return toRuntime(anchor, [anchor]);
  }

  let siblings: EnterpriseDealApiRecord[] = [anchor];
  try {
    const { items } = await enterpriseDealApiClient.listDealsByOpportunity(opportunityId);
    siblings = items.length > 0 ? items : [anchor];
  } catch {
    siblings = [anchor];
  }

  // CO-UX-017 QA — stamp human OPP number when Deal GET omits the Opportunity join.
  const needsOppNumber = siblings.some((d) => {
    const n = d.opportunityNumber?.trim();
    return !n || /^deal[-_]/i.test(n);
  });
  if (needsOppNumber) {
    try {
      const opportunity =
        await enterpriseOpportunityApiClient.getOpportunity(opportunityId);
      const oppNumber = opportunity.opportunityNumber?.trim();
      if (oppNumber && !/^deal[-_]/i.test(oppNumber)) {
        siblings = siblings.map((d) => ({
          ...d,
          opportunityNumber: d.opportunityNumber?.trim() || oppNumber,
        }));
        anchor = {
          ...anchor,
          opportunityNumber: anchor.opportunityNumber?.trim() || oppNumber,
        };
      }
    } catch {
      /* keep Deal-only labels */
    }
  }

  for (const d of siblings) putSessionDeal(d);
  putSessionDeal(anchor);
  return toRuntime(anchor, siblings);
}

/**
 * CO-ARCH-007 — Identify Additional Lender creates/upserts EnterpriseDeal
 * uniqueness: (opportunityId + lenderId).
 */
export async function identifyLenderAsEnterpriseDeal(input: {
  runtime: DealPipelineRuntime;
  lenderId: string;
  lenderName: string;
  lenderProgramId?: string | null;
  lenderCode?: string;
  expectedLoanAmount?: number;
  caseSubStage?: string;
  identifiedBy?: string;
}): Promise<DealPipelineRuntime> {
  const opportunityId = input.runtime.context.opportunityId?.trim();
  if (!opportunityId) {
    throw new Error(
      "Missing: Opportunity id. Reason: Deal is not linked to an Opportunity. Action: reopen from My Deals.",
    );
  }
  if (!input.lenderId?.trim()) {
    throw new Error("lenderId is required to create an Enterprise Deal.");
  }

  const opportunity = await enterpriseOpportunityApiClient.getOpportunity(opportunityId);
  const ts = new Date().toISOString();
  const single: LoanLenderExecution = {
    id: `pending-${input.lenderId}`,
    lender: input.lenderName,
    lenderRegistryId: input.lenderId,
    lenderProgramId: input.lenderProgramId ?? undefined,
    lenderCode: input.lenderCode,
    lenderRef: `lender:${input.lenderId}`,
    status: "active",
    caseStage: "identified",
    caseSubStage: input.caseSubStage,
    expectedLoanAmount:
      input.expectedLoanAmount ?? input.runtime.context.requiredAmount,
    product: input.runtime.context.loanProduct,
    isPrimary: input.runtime.lenders.length === 0,
    opportunityId,
    identifiedBy: input.identifiedBy,
    identifiedAt: ts,
    createdAt: ts,
    updatedAt: ts,
  };

  await createDealFromOpportunity({
    opportunity,
    lenderId: input.lenderId,
    lenderName: input.lenderName,
    lenderProgramId: input.lenderProgramId,
    lenders: [single],
    customerName: input.runtime.context.customerName,
    customerId: input.runtime.context.customerId ?? undefined,
    loanProduct: input.runtime.context.loanProduct,
    loanAmount: input.runtime.context.requiredAmount,
    relationshipManager: input.runtime.context.relationshipManager,
  });

  return loadDealPipelineRuntime(input.runtime.deal.id);
}

/**
 * Persist Pipeline stage/field changes per EnterpriseDeal (not multi-lender snapshot).
 */
export async function persistDealPipelineLenders(
  runtime: DealPipelineRuntime,
  lenders: LoanLenderExecution[],
): Promise<DealPipelineRuntime> {
  const byId = new Map(runtime.siblingDeals.map((d) => [d.id, d]));
  const previousById = new Map(runtime.lenders.map((l) => [l.enterpriseDealId || l.id, l]));

  for (const lender of lenders) {
    const dealId = lender.enterpriseDealId?.trim() || lender.id;
    const deal = byId.get(dealId);
    if (!deal) continue;

    const prev = previousById.get(dealId);
    const stageChanged =
      !prev ||
      prev.caseStage !== lender.caseStage ||
      prev.isPrimary !== lender.isPrimary ||
      prev.expectedLoanAmount !== lender.expectedLoanAmount ||
      prev.status !== lender.status;

    if (!stageChanged) continue;

    const grossStage = lenderCaseStageToGrossStage(lender.caseStage);
    let rowVersion = lender.enterpriseDealRowVersion ?? deal.rowVersion;
    let current = deal;

    if (deal.grossStage !== grossStage) {
      try {
        current = await enterpriseDealApiClient.transitionDeal(dealId, {
          rowVersion,
          toGrossStage: grossStage,
          reason: "deal_pipeline_stage",
          allowSkip: true,
        });
        rowVersion = current.rowVersion;
      } catch {
        // If transition API rejects, still persist derived snapshot on current stage.
        current = deal;
      }
    }

    await enterpriseDealApiClient.updateDeal(dealId, {
      rowVersion,
      snapshot: buildDerivedSingleLenderSnapshot(current, lender),
      primaryCounterpartyName: lender.lender,
      reason: "deal_pipeline_derived_snapshot",
    });
  }

  return loadDealPipelineRuntime(runtime.deal.id);
}

/** @deprecated Legacy name — multi-lender snapshot read. Prefer dealToLenderExecution. */
export function readSnapshotLenders(deal: EnterpriseDealApiRecord): LoanLenderExecution[] {
  return [dealToLenderExecution(deal)];
}

export function toDealPipelineRuntime(deal: EnterpriseDealApiRecord): DealPipelineRuntime {
  return toRuntime(deal, [deal]);
}
