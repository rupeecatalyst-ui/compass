/**
 * CO-ARCH-002-W5 — Map Enterprise Deal API → LoanFile-compatible stub for workspace consumers.
 * Prefers local LoanFile for fields Deal API does not yet fully project (docs/tasks).
 * FS-01 blocker fix: project Lender Pipeline cases from Deal snapshot / primary counterparty
 * when local lenders were wiped by a stale DAL hydrate.
 *
 * CAD-2026-001 Priority 1 — structure translation ONLY.
 * Must NOT manufacture business semantics (no secured / fresh / amount invent).
 * Unavailable Deal fields → empty / 0 / omit — never fabricate.
 * Opportunity Workspace must not use this stub as business SSOT.
 */
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import { resolveDealStageProjection } from "@/lib/enterprise-deal/deal-stage-projection";
import { grossStageToLenderCaseStage } from "@/lib/enterprise-deal/deal-lender-stage-map";
import { resolveDealBorrowerIdentity } from "@/lib/enterprise-borrower-identity";
import {
  coalesceAssignedUsers,
  readAssignedUserIdsFromExtension,
  readHierarchyVisibilityUserIdsFromExtension,
} from "@/lib/assigned-users";
import {
  mapEnterpriseDealActivityTimelineToLoanFileEvents,
  mergeLoanFileTimelines,
  type EnterpriseDealActivityTimelineEvent,
} from "@/lib/enterprise-deal/enterprise-deal-activity-timeline";
import type {
  LendingType,
  LoanFile,
  LoanFilePriority,
  LoanFileStatus,
  LoanLenderExecution,
  TransactionType,
} from "@/types/catalyst-one";

function asPriority(value?: string): LoanFilePriority {
  if (value === "urgent" || value === "high" || value === "medium" || value === "low") {
    return value;
  }
  // Operational metadata fallback for Deal workspace shape — not Opportunity business SSOT.
  return "medium";
}

function asStatus(value?: string): LoanFileStatus {
  if (
    value === "on_track" ||
    value === "at_risk" ||
    value === "delayed" ||
    value === "completed"
  ) {
    return value;
  }
  // Operational metadata fallback for Deal workspace shape — not Opportunity business SSOT.
  return "on_track";
}

/** Prefer Deal/local captured value; never invent secured. */
function asLendingType(local?: LendingType): LendingType | "" {
  if (local === "secured" || local === "unsecured" || local === "hybrid") return local;
  return "";
}

/** Prefer Deal/local captured value; never invent fresh. */
function asTransactionType(local?: TransactionType): TransactionType | "" {
  if (local === "fresh" || local === "balance_transfer") return local;
  return "";
}

function projectLendersFromDeal(
  deal: EnterpriseDealApiRecord & { snapshot?: unknown },
  local?: LoanFile | null,
): LoanLenderExecution[] | undefined {
  const snap = deal.snapshot as
    | {
        lenders?: Array<{
          id?: string;
          name?: string;
          status?: string;
          caseStage?: string;
          lenderRegistryId?: string | null;
          lenderRef?: string | null;
          isPrimary?: boolean;
          opportunityId?: string | null;
        }>;
      }
    | null
    | undefined;
  const now = deal.updatedAt || deal.createdAt || new Date().toISOString();

  // CO-ARCH-004 — Registry snapshot is pipeline authority (never prefer stale local LoanFile).
  // Deal.grossStage is canonical LenderCaseStage — sync onto projected cases (never prefer stale snapshot.caseStage).
  const canonicalCaseStage = grossStageToLenderCaseStage(deal.grossStage);
  if (Array.isArray(snap?.lenders) && snap!.lenders!.length > 0) {
    return snap!.lenders!.map((l, index) => ({
      id: l.id || `snap-lender-${deal.id}-${index}`,
      lender: l.name || deal.primaryCounterpartyName || "Lender",
      status: (l.status as LoanLenderExecution["status"]) || "active",
      caseStage: canonicalCaseStage,
      isPrimary: l.isPrimary ?? index === 0,
      lenderRegistryId:
        l.lenderRegistryId ||
        (index === 0 ? deal.lenderId ?? undefined : undefined) ||
        undefined,
      lenderRef:
        l.lenderRef ||
        (deal.lenderId ? `lender:${deal.lenderId}` : undefined),
      opportunityId: l.opportunityId || deal.opportunityId || undefined,
      identifiedAt: now,
      createdAt: now,
      updatedAt: now,
    }));
  }

  if (deal.lenderId || deal.primaryCounterpartyName) {
    return [
      {
        id: `deal-lender-${deal.id}`,
        lender: deal.primaryCounterpartyName || "Lender",
        status: "active",
        caseStage: canonicalCaseStage,
        isPrimary: true,
        lenderRegistryId: deal.lenderId ?? undefined,
        lenderRef: deal.lenderId ? `lender:${deal.lenderId}` : undefined,
        opportunityId: deal.opportunityId ?? undefined,
        identifiedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  // Projection fallback only when Registry has no lender cases yet.
  if (local?.lenders && local.lenders.length > 0) {
    return local.lenders;
  }

  return undefined;
}

export function mapEnterpriseDealToLoanFileStub(
  deal: EnterpriseDealApiRecord & { snapshot?: unknown },
  local?: LoanFile | null,
  /** CO-RADAR-003 — Enterprise Deal Timeline events (SSOT). Never leave Radar on timeline:[]. */
  enterpriseTimelineEvents?: EnterpriseDealActivityTimelineEvent[] | null,
): LoanFile {
  const id = deal.legacyLoanFileId || local?.id || deal.id;
  // Amount from Deal Registry or local capture only — never invent 5_000_000.
  const amount = deal.requestedAmount ?? local?.requiredAmount ?? local?.loanAmount ?? 0;
  // CO-PERF-001 — Deal Registry grossStage is the only stage authority for projections.
  // May carry terminal LenderCaseStage ids (PDC / lost) for Radar eligibility filters.
  const stage = (resolveDealStageProjection(deal) || "") as LoanFile["stage"];
  const now = deal.updatedAt || deal.createdAt || local?.createdAt || new Date().toISOString();
  const lenders = projectLendersFromDeal(deal, local);
  const lendingType = asLendingType(local?.lendingType) as LoanFile["lendingType"];
  const transactionType = asTransactionType(local?.transactionType) as LoanFile["transactionType"];
  const borrower = resolveDealBorrowerIdentity(deal);
  const fallbackPartyId =
    borrower.partyEntityId || `deal-party-${deal.id}`;

  const enterpriseTimeline = mapEnterpriseDealActivityTimelineToLoanFileEvents(
    enterpriseTimelineEvents ?? [],
  );
  const timeline = mergeLoanFileTimelines(enterpriseTimeline, local?.timeline);

  const base: LoanFile = local
    ? { ...local }
    : {
        id,
        fileNumber: deal.fileNumber || deal.dealNumber,
        customerId: fallbackPartyId,
        customerName: borrower.displayName || "",
        customerMobile: borrower.primaryContactMobile || deal.primaryContactMobile || "",
        customerEmail: borrower.primaryContactEmail || "",
        city: "",
        state: "",
        employmentType: "",
        // CAD-2026-001 P1: no fabricated secured / fresh
        lendingType,
        transactionType,
        loanProduct: deal.productLabel || "",
        loanAmount: amount,
        requiredAmount: amount,
        lender: "",
        stage,
        relationshipManager: deal.relationshipManagerName || "",
        priority: asPriority(deal.priority),
        daysInStage: 0,
        expectedRevenue: 0,
        revenuePercent: 0,
        revenueReceived: 0,
        expectedDisbursement: now,
        loginDate: now,
        expectedLoginDate: now,
        sanctionAmount: deal.approvedAmount ?? 0,
        disbursementAmount: deal.fulfilledAmount ?? 0,
        interestRate: 0,
        tenure: 0,
        status: asStatus(deal.operationalStatus),
        progress: 0,
        createdAt: deal.createdAt || now,
        documents: [],
        tasks: [],
        timeline: [],
        internalNotes: "",
        isUrgent: deal.priority === "urgent",
        isDelayed: deal.operationalStatus === "delayed",
        archived: deal.archived,
      };

  return {
    ...base,
    id,
    enterpriseDealId: deal.id,
    dealNumber: deal.dealNumber,
    enterpriseOpportunityId: deal.opportunityId ?? local?.enterpriseOpportunityId,
    opportunityNumber:
      deal.opportunityNumber?.trim() ||
      local?.opportunityNumber ||
      base.opportunityNumber,
    fileNumber: deal.fileNumber || deal.dealNumber || base.fileNumber,
    customerId: borrower.partyEntityId || (local?.customerId ?? base.customerId),
    customerName: borrower.displayName || base.customerName,
    customerMobile:
      borrower.primaryContactMobile ||
      deal.primaryContactMobile ||
      base.customerMobile,
    loanProduct: deal.productLabel || base.loanProduct,
    loanAmount: amount || base.loanAmount,
    requiredAmount: amount || base.requiredAmount,
    // Preserve local lending/transaction when Deal API has no columns; never invent.
    lendingType: asLendingType(local?.lendingType || base.lendingType) as LoanFile["lendingType"],
    transactionType: asTransactionType(
      local?.transactionType || base.transactionType,
    ) as LoanFile["transactionType"],
    stage,
    stageSubStatus: deal.subStage ?? base.stageSubStatus,
    relationshipManager: deal.relationshipManagerName || base.relationshipManager,
    primaryOwnerUserId: deal.primaryOwnerUserId ?? undefined,
    relationshipManagerUserId: deal.relationshipManagerUserId ?? undefined,
    assignedUserIds: (() => {
      const ids = readAssignedUserIdsFromExtension(deal.lendingExtension);
      if (ids.length > 0) return ids;
      return coalesceAssignedUsers({
        lendingExtension: deal.lendingExtension,
        primaryOwnerUserId: deal.primaryOwnerUserId,
        relationshipManagerUserId: deal.relationshipManagerUserId,
        relationshipManagerName: deal.relationshipManagerName,
      }).map((u) => u.id);
    })(),
    hierarchyVisibilityUserIds: readHierarchyVisibilityUserIdsFromExtension(
      deal.lendingExtension,
    ),
    lendingExtension: deal.lendingExtension ?? undefined,
    priority: asPriority(deal.priority) || base.priority,
    status: asStatus(deal.operationalStatus) || base.status,
    sanctionAmount: deal.approvedAmount ?? base.sanctionAmount,
    disbursementAmount: deal.fulfilledAmount ?? base.disbursementAmount,
    archived: deal.archived,
    isUrgent: deal.priority === "urgent" || base.isUrgent,
    isDelayed: deal.operationalStatus === "delayed" || base.isDelayed,
    /** CO-RADAR-003 — Enterprise Deal Timeline Registry is operational activity SSOT */
    timeline,
    lender: deal.primaryCounterpartyName || base.lender,
    ...(lenders ? { lenders } : {}),
    commercialPayee:
      (deal.invoicePartyType as LoanFile["commercialPayee"]) ||
      base.commercialPayee,
    commercialPayeeSpecify:
      deal.invoicePartySpecify ?? base.commercialPayeeSpecify,
    invoicePartyContactId:
      deal.invoicePartyContactId ?? base.invoicePartyContactId,
    invoicePartyId: deal.invoicePartyId ?? base.invoicePartyId,
    invoicePartyLabel:
      deal.invoicePartySpecify ?? base.invoicePartyLabel ?? base.commissionAccountingPayeeLabel,
    commissionAccountingPayeeId: deal.invoicePartyId ?? base.commissionAccountingPayeeId,
    commissionAccountingPayeeLabel:
      deal.invoicePartySpecify ?? base.commissionAccountingPayeeLabel,
    commissionPayeeContactId:
      deal.invoicePartyContactId ?? base.commissionPayeeContactId,
  };
}
