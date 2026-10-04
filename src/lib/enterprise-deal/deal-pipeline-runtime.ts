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
import { notifyLoanFilesUpdated } from "@/lib/loan-data-sync";
import type { LoanLenderExecution, LenderCaseStage } from "@/types/catalyst-one";
import type {
  DealPipelineContext,
  DealPipelineRuntime,
  DealSnapshotLender,
} from "@/types/deal-pipeline-runtime";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import type { LoanCommercialPayeeType } from "@/constants/loan-commercial-payee";
import { resolveDealBorrowerIdentity } from "@/lib/enterprise-borrower-identity";
import { resolveKanbanDealHealthScore } from "@/lib/enterprise-metrics-engine/deal-health-proxy";

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
export function dealToLenderExecution(
  deal: EnterpriseDealApiRecord,
  options?: { now?: Date },
): LoanLenderExecution {
  const now = deal.updatedAt || deal.createdAt || new Date().toISOString();
  const derived = readDerivedSingleLender(deal);
  // P1 — Deal Registry grossStage is SSOT. Never prefer snapshot.caseStage over Registry.
  const caseStage = grossStageToLenderCaseStage(deal.grossStage);
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
    caseSubStage: derived?.caseSubStage ?? deal.subStage ?? undefined,
    isPrimary: Boolean(derived?.isPrimary),
    lenderRegistryId: deal.lenderId ?? derived?.lenderRegistryId ?? undefined,
    lenderRef: deal.lenderId ? `lender:${deal.lenderId}` : derived?.lenderRef || undefined,
    lenderProgramId: deal.lenderProgramId ?? undefined,
    opportunityId: deal.opportunityId ?? derived?.opportunityId ?? undefined,
    expectedLoanAmount:
      deal.requestedAmount ?? derived?.expectedLoanAmount ?? undefined,
    product: derived?.product || deal.productLabel || undefined,
    // CO-LR-013 — Sales contact link from derived snapshot
    lenderSalesContactId: derived?.lenderSalesContactId ?? undefined,
    lenderSalesContactName: derived?.lenderSalesContactName ?? undefined,
    lenderSalesContactMobile: derived?.lenderSalesContactMobile ?? undefined,
    lenderSalesContactDesignationId: derived?.lenderSalesContactDesignationId ?? undefined,
    lenderSalesContactDesignationLabel: derived?.lenderSalesContactDesignationLabel ?? undefined,
    lenderSalesContactOfficialEmail: derived?.lenderSalesContactOfficialEmail ?? undefined,
    lenderSalesContactInstitutionId: derived?.lenderSalesContactInstitutionId ?? undefined,
    lenderSalesContactInstitutionLabel:
      derived?.lenderSalesContactInstitutionLabel ?? undefined,
    // CO-UX-017
    loginDate: derived?.loginDate ?? undefined,
    disbursementDate: derived?.disbursementDate ?? undefined,
    probability: (derived?.probability as LoanLenderExecution["probability"]) ?? undefined,
    relationshipManager: deal.relationshipManagerName || derived?.relationshipManager || undefined,
    dealPriority: deal.priority ?? undefined,
    dealHealthScore: resolveKanbanDealHealthScore(
      {
        stageEnteredAt: deal.stageEnteredAt,
        healthScore: deal.healthScore,
      },
      options?.now,
    ),
    identifiedAt: now,
    createdAt: deal.createdAt || now,
    updatedAt: deal.updatedAt || now,
    disbursedAt: deal.disbursedAt ?? null,
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
        caseSubStage: lender.caseSubStage ?? null,
        lenderRegistryId: lender.lenderRegistryId ?? deal.lenderId ?? null,
        lenderRef: lender.lenderRef ?? null,
        isPrimary: Boolean(lender.isPrimary),
        opportunityId: lender.opportunityId ?? deal.opportunityId ?? null,
        expectedLoanAmount:
          lender.expectedLoanAmount ?? deal.requestedAmount ?? null,
        product: lender.product,
        enterpriseDealId: deal.id,
        // CO-LR-013
        lenderSalesContactId: lender.lenderSalesContactId ?? null,
        lenderSalesContactName: lender.lenderSalesContactName ?? null,
        lenderSalesContactMobile: lender.lenderSalesContactMobile ?? null,
        lenderSalesContactDesignationId: lender.lenderSalesContactDesignationId ?? null,
        lenderSalesContactDesignationLabel: lender.lenderSalesContactDesignationLabel ?? null,
        lenderSalesContactOfficialEmail: lender.lenderSalesContactOfficialEmail ?? null,
        lenderSalesContactInstitutionId: lender.lenderSalesContactInstitutionId ?? null,
        lenderSalesContactInstitutionLabel:
          lender.lenderSalesContactInstitutionLabel ?? null,
        // CO-UX-017 — operational control panel fields (derived snapshot only)
        loginDate: lender.loginDate ?? null,
        disbursementDate: lender.disbursementDate ?? null,
        probability: lender.probability ?? null,
        relationshipManager: lender.relationshipManager ?? null,
      },
    ],
  };
}

export function toDealPipelineContext(deal: EnterpriseDealApiRecord): DealPipelineContext {
  const borrower = resolveDealBorrowerIdentity(deal);
  return {
    dealId: deal.id,
    dealNumber: deal.dealNumber,
    opportunityId: deal.opportunityId,
    opportunityNumber: deal.opportunityNumber,
    requiredAmount: deal.requestedAmount ?? 0,
    loanProduct: deal.productLabel || "",
    productCode: undefined,
    relationshipManager: deal.relationshipManagerName || "",
    relationshipManagerUserId: deal.relationshipManagerUserId ?? null,
    rcEmployeeAssignmentSource:
      deal.rcEmployeeAssignmentSource === "override" || deal.assignmentMode === "override"
        ? "override"
        : deal.rcEmployeeAssignmentSource === "inherited" || deal.assignmentMode === "inherited"
          ? "inherited"
          : null,
    customerName: borrower.displayName || "",
    customerId: borrower.partyEntityId || deal.primaryContactId,
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
  const resolvedAnchor = deals.find((d) => d.id === anchor.id) ?? anchor;
  return {
    deal: resolvedAnchor,
    context: toDealPipelineContext(resolvedAnchor),
    lenders: deals.map((deal) => dealToLenderExecution(deal)),
    siblingDeals: deals,
  };
}

/**
 * Load Opportunity execution desk: all Enterprise Deals for the Opportunity.
 * Anchor dealId opens the route; lenders come from sibling Deals (CO-ARCH-007).
 *
 * CO-PERF-002 — Prefer single bootstrap GET (?include=siblings) over multi-RTT open.
 * CO-BUG-009 — fall back to session row after Move to Deal create.
 */
export async function loadDealPipelineRuntime(
  dealId: string,
  options?: { forceRefresh?: boolean },
): Promise<DealPipelineRuntime> {
  const id = dealId.trim();
  if (!id) throw new Error("Missing Enterprise Deal id.");

  const { peekSessionDeal } = await import(
    "@/lib/enterprise-session/deal-runtime-cache"
  );
  const warm = peekSessionDeal(id);
  const forceRefresh = options?.forceRefresh === true || !warm?.id;

  let bootstrap: {
    deal: EnterpriseDealApiRecord;
    siblings: EnterpriseDealApiRecord[];
  } | null = null;

  try {
    bootstrap = await enterpriseDealApiClient.bootstrapDealWorkspace(id, {
      forceRefresh,
    });
  } catch (err) {
    if (!warm?.id) {
      // Fallback to legacy parallel path when bootstrap unavailable.
      try {
        const anchorOnly = await enterpriseDealApiClient.getDeal(id, { forceRefresh });
        putSessionDeal(anchorOnly);
        bindSessionDeal(anchorOnly);
        const opportunityId = anchorOnly.opportunityId?.trim();
        if (!opportunityId) return toRuntime(anchorOnly, [anchorOnly]);
        const siblingsResult = await enterpriseDealApiClient
          .listDealsByOpportunity(opportunityId)
          .catch(() => ({ items: [anchorOnly] as EnterpriseDealApiRecord[], total: 1 }));
        const siblings =
          siblingsResult.items.length > 0 ? siblingsResult.items : [anchorOnly];
        for (const d of siblings) putSessionDeal(d);
        return toRuntime(anchorOnly, siblings);
      } catch {
        throw err;
      }
    }
    return toRuntime(warm as EnterpriseDealApiRecord, [warm as EnterpriseDealApiRecord]);
  }

  let anchor = bootstrap.deal;
  let siblings = bootstrap.siblings.length > 0 ? bootstrap.siblings : [anchor];

  const opportunityId = anchor.opportunityId?.trim();
  const needsOppNumber = (() => {
    const n = anchor.opportunityNumber?.trim();
    return !n || /^deal[-_]/i.test(n);
  })();

  if (opportunityId && needsOppNumber) {
    const opportunity = await enterpriseOpportunityApiClient
      .getOpportunity(opportunityId)
      .catch(() => null);
    const oppNumber = opportunity?.opportunityNumber?.trim();
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
  }

  const refreshedAnchor = siblings.find((d) => d.id === anchor.id);
  if (refreshedAnchor) {
    anchor = {
      ...refreshedAnchor,
      opportunityNumber:
        refreshedAnchor.opportunityNumber?.trim() || anchor.opportunityNumber,
    };
  }

  for (const d of siblings) putSessionDeal(d);
  putSessionDeal(anchor);
  bindSessionDeal(anchor);
  return toRuntime(anchor, siblings);
}

/**
 * CO-ARCH-007 — Identify Additional Lender creates/upserts EnterpriseDeal
 * uniqueness: (opportunityId + lenderId).
 * CO-PERF-002 — Prefer warm Opportunity session; merge created Deal into runtime (no full reload).
 *
 * Manual lender selection (CO-ARCH-007) — user intent only:
 * read Lender Registry + store lender ID / create Deal.
 * Does NOT execute Recommendation, Programme, Policy, Eligibility, or AI engines.
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
  /** CO-LR-013 — Mandatory Sales Contact (Banker) link. */
  lenderSalesContact: {
    contactId: string;
    contactName: string;
    mobile?: string;
    designationId?: string;
    designationLabel?: string;
    officialEmail?: string;
    institutionId?: string;
    institutionLabel?: string;
  };
}): Promise<DealPipelineRuntime> {
  const { createManualLenderSelectionIntent } = await import(
    "@/constants/manual-lender-selection"
  );
  // Intent record — advisory audit only; never triggers scoring engines.
  void createManualLenderSelectionIntent({
    opportunityId: input.runtime.context.opportunityId ?? "",
    lenderId: input.lenderId,
    lenderName: input.lenderName,
    selectedBy: "identify",
  });

  const opportunityId = input.runtime.context.opportunityId?.trim();
  if (!opportunityId) {
    throw new Error(
      "Missing: Opportunity id. Reason: Deal is not linked to an Opportunity. Action: reopen from My Deals.",
    );
  }
  if (!input.lenderId?.trim()) {
    throw new Error("lenderId is required to create an Enterprise Deal.");
  }
  if (!input.lenderSalesContact?.contactId?.trim()) {
    throw new Error(
      "Lender Sales Contact is mandatory. Select or create a Sales Contact from the selected lender.",
    );
  }

  const { peekSessionOpportunity } = await import(
    "@/lib/enterprise-session/opportunity-runtime-cache"
  );
  const opportunity =
    peekSessionOpportunity(opportunityId) ??
    (await enterpriseOpportunityApiClient.getOpportunity(opportunityId));

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
    lenderSalesContactId: input.lenderSalesContact?.contactId,
    lenderSalesContactName: input.lenderSalesContact?.contactName,
    lenderSalesContactMobile: input.lenderSalesContact?.mobile,
    lenderSalesContactDesignationId: input.lenderSalesContact?.designationId,
    lenderSalesContactDesignationLabel: input.lenderSalesContact?.designationLabel,
    lenderSalesContactOfficialEmail: input.lenderSalesContact?.officialEmail,
    lenderSalesContactInstitutionId: input.lenderSalesContact?.institutionId,
    lenderSalesContactInstitutionLabel:
      input.lenderSalesContact?.institutionLabel,
  };

  const created = await createDealFromOpportunity({
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

  putSessionDeal(created);

  const siblings = [
    ...input.runtime.siblingDeals.filter(
      (d) => d.id !== created.id && d.lenderId !== created.lenderId,
    ),
    created,
  ];
  const anchor =
    siblings.find((d) => d.id === input.runtime.deal.id) ?? input.runtime.deal;
  return toRuntime(anchor, siblings);
}

/**
 * Resolve the Enterprise Deal UUID for a Pipeline card (CO-ARCH-007).
 * Prefer explicit enterpriseDealId; never invent IDs.
 */
export function resolvePipelineDealId(lender: LoanLenderExecution): string {
  return (lender.enterpriseDealId || lender.id || "").trim();
}

/**
 * Soft-delete Enterprise Deals that were removed from the Kanban card list.
 * CO-QA-002 — Kanban Remove must persist via Deal Registry soft-delete (SSOT).
 * Filtering React state alone is not a delete.
 */
export async function softDeleteRemovedPipelineDeals(
  previous: LoanLenderExecution[],
  next: LoanLenderExecution[],
  options?: {
    /** Only soft-delete IDs known to be sibling Enterprise Deals (preferred). */
    knownDealIds?: ReadonlySet<string> | readonly string[];
    reason?: string;
  },
): Promise<string[]> {
  const nextIds = new Set(
    next.map(resolvePipelineDealId).filter(Boolean),
  );
  const known =
    options?.knownDealIds == null
      ? null
      : options.knownDealIds instanceof Set
        ? options.knownDealIds
        : new Set(options.knownDealIds);
  const reason = options?.reason ?? "kanban_pipeline_remove";
  const candidates: string[] = [];

  for (const prev of previous) {
    const dealId = resolvePipelineDealId(prev);
    if (!dealId || nextIds.has(dealId)) continue;
    // Prefer sibling Deal ids; if unknown, still attempt soft-delete (API 404 if invalid).
    if (known && known.size > 0 && !known.has(dealId)) {
      // Card id may still be a Deal UUID that was optimistic / stale — try delete anyway
      // when it matches a previous enterpriseDealId field.
      if (!prev.enterpriseDealId || prev.enterpriseDealId !== dealId) continue;
    }
    candidates.push(dealId);
  }

  // CO-PERF-002 — Parallel soft-deletes (was sequential N× RTT).
  const removed: string[] = [];
  await Promise.all(
    candidates.map(async (dealId) => {
      try {
        await enterpriseDealApiClient.softDeleteDeal(dealId, reason);
        removed.push(dealId);
      } catch {
        /* keep attempting others; caller may force-refresh inventory */
      }
    }),
  );

  return removed;
}

/**
 * CO-QA-002 re-open — Explicit Kanban Remove for one EnterpriseDeal.
 * Does not rely on persist-diff alone. Verifies soft-delete response before reload.
 */
export async function removeLenderPipelineDeal(
  runtime: DealPipelineRuntime,
  dealIdInput: string,
  options?: { reason?: string },
): Promise<DealPipelineRuntime> {
  const dealId = dealIdInput.trim();
  if (!dealId) {
    throw new Error("Missing Enterprise Deal id for Kanban delete.");
  }

  const { tracePipelineDrag } = await import("@/lib/enterprise-deal/pipeline-drag-trace");
  tracePipelineDrag("delete_initiated", {
    dealId,
    opportunityId: runtime.deal.opportunityId,
    siblingCount: runtime.siblingDeals.length,
  });

  const card = runtime.lenders.find((l) => resolvePipelineDealId(l) === dealId);

  tracePipelineDrag("delete_api_called", { dealId, reason: options?.reason ?? "kanban_pipeline_remove" });
  const deleted = await enterpriseDealApiClient.softDeleteDeal(
    dealId,
    options?.reason ?? "kanban_pipeline_remove",
  );

  if (!deleted.isDeleted) {
    tracePipelineDrag("delete_failed", {
      dealId,
      message: "DELETE returned Deal without isDeleted=true",
    });
    throw new Error(
      "Deal delete did not persist (isDeleted is still false). The card was not removed from the Enterprise Deal Registry.",
    );
  }

  tracePipelineDrag("delete_db_confirmed", {
    dealId,
    dealNumber: deleted.dealNumber,
    isDeleted: deleted.isDeleted,
  });

  // Keep Strategy Execution Queue from re-creating this lender negotiation.
  const opportunityId = runtime.deal.opportunityId?.trim();
  if (opportunityId && typeof window !== "undefined") {
    try {
      const { removeStrategicShortlistItem } = await import(
        "@/lib/strategic-lender-pipeline"
      );
      const lenderRef =
        card?.lenderRef ||
        (deleted.lenderId ? `lender:${deleted.lenderId}` : null) ||
        deleted.primaryCounterpartyName ||
        card?.lender ||
        dealId;
      removeStrategicShortlistItem(opportunityId, lenderRef);
    } catch {
      /* shortlist prune best-effort */
    }
  }

  const remaining = runtime.siblingDeals.filter((d) => d.id !== dealId);
  const reloadId =
    remaining.find((d) => d.id === runtime.deal.id)?.id || remaining[0]?.id || null;

  if (!reloadId) {
    tracePipelineDrag("delete_registry_refreshed", { dealId, dealCount: 0 });
    return {
      ...runtime,
      lenders: [],
      siblingDeals: [],
    };
  }

  // CO-PERF-002 — Optimistic merge after confirmed soft-delete (no full workspace reload).
  const nextAnchor =
    remaining.find((d) => d.id === runtime.deal.id) ?? remaining[0]!;
  const next = toRuntime(nextAnchor, remaining);
  for (const d of remaining) putSessionDeal(d);
  putSessionDeal(nextAnchor);
  bindSessionDeal(nextAnchor);

  tracePipelineDrag("delete_pipeline_refreshed", {
    dealId,
    dealCount: next.siblingDeals.length,
    reloadId: next.deal.id,
  });
  tracePipelineDrag("delete_registry_refreshed", {
    dealId,
    dealCount: next.siblingDeals.length,
    reloadId: next.deal.id,
  });
  return next;
}

function dealAmountNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * Persist Pipeline stage/field changes per EnterpriseDeal (not multi-lender snapshot).
 * CO-QA-002 — Also soft-deletes Enterprise Deals removed from the Kanban (ghost-card fix).
 * CO-PERF-001 — After stage updates, rebuild runtime from PATCH responses (no full Registry reload).
 * Full reload only when Deals were soft-deleted (list must exclude them).
 */
export async function persistDealPipelineLenders(
  runtime: DealPipelineRuntime,
  lenders: LoanLenderExecution[],
): Promise<DealPipelineRuntime> {
  const byId = new Map(runtime.siblingDeals.map((d) => [d.id, d]));
  const previousById = new Map(
    runtime.lenders.map((l) => [resolvePipelineDealId(l), l]),
  );
  const knownDealIds = new Set(runtime.siblingDeals.map((d) => d.id));

  // 1) Persist removals first — Enterprise Deal Registry soft-delete (SSOT).
  const deletedIds = await softDeleteRemovedPipelineDeals(runtime.lenders, lenders, {
    knownDealIds,
    reason: "kanban_pipeline_remove",
  });
  const deletedSet = new Set(deletedIds);

  // 2) Persist stage / field changes for remaining cards.
  const patchedById = new Map<string, EnterpriseDealApiRecord>();

  for (const lender of lenders) {
    const dealId = resolvePipelineDealId(lender);
    if (!dealId || deletedSet.has(dealId)) continue;
    const deal = byId.get(dealId);
    if (!deal) continue;

    const prev = previousById.get(dealId);
    const stageChanged =
      !prev ||
      prev.caseStage !== lender.caseStage ||
      prev.caseSubStage !== lender.caseSubStage ||
      prev.isPrimary !== lender.isPrimary ||
      prev.expectedLoanAmount !== lender.expectedLoanAmount ||
      prev.status !== lender.status ||
      // CO-UX-017 — Deal Control Panel operational fields
      prev.product !== lender.product ||
      prev.loginDate !== lender.loginDate ||
      prev.disbursementDate !== lender.disbursementDate ||
      prev.probability !== lender.probability ||
      prev.relationshipManager !== lender.relationshipManager ||
      prev.lenderSalesContactId !== lender.lenderSalesContactId ||
      prev.lenderSalesContactName !== lender.lenderSalesContactName ||
      prev.lenderSalesContactMobile !== lender.lenderSalesContactMobile ||
      prev.lenderSalesContactOfficialEmail !== lender.lenderSalesContactOfficialEmail ||
      prev.lenderSalesContactInstitutionId !== lender.lenderSalesContactInstitutionId ||
      prev.lenderSalesContactInstitutionLabel !==
        lender.lenderSalesContactInstitutionLabel;

    if (!stageChanged) continue;

    const grossStage = lenderCaseStageToGrossStage(lender.caseStage);
    let rowVersion = lender.enterpriseDealRowVersion ?? deal.rowVersion;
    let current = deal;

    if (deal.grossStage !== grossStage || (lender.caseSubStage && deal.subStage !== lender.caseSubStage)) {
      // Deal Registry transition is mandatory for stage changes.
      // Never advance snapshot.caseStage when transition fails (P1 sync).
      current = await enterpriseDealApiClient.transitionDeal(dealId, {
        rowVersion,
        toGrossStage: grossStage,
        toSubStage: lender.caseSubStage ?? null,
        reason: "deal_pipeline_stage",
        allowSkip: true,
      });
      rowVersion = current.rowVersion;
      patchedById.set(dealId, current);
    }

    // Derived snapshot must mirror Registry stage — never invent an independent stage.
    const lenderAligned: LoanLenderExecution = {
      ...lender,
      caseStage: grossStageToLenderCaseStage(current.grossStage),
      expectedLoanAmount:
        dealAmountNumber(lender.expectedLoanAmount) ??
        dealAmountNumber(current.requestedAmount) ??
        lender.expectedLoanAmount,
    };

    const nextRequestedAmount = dealAmountNumber(lender.expectedLoanAmount);

    const updated = await enterpriseDealApiClient.updateDeal(dealId, {
      rowVersion,
      snapshot: buildDerivedSingleLenderSnapshot(current, lenderAligned),
      primaryCounterpartyName: lender.lender,
      ...(nextRequestedAmount != null && nextRequestedAmount > 0
        ? { requestedAmount: nextRequestedAmount }
        : {}),
      reason: "deal_pipeline_derived_snapshot",
    });
    patchedById.set(dealId, updated);
  }

  // 3) Rebuild runtime.
  const remainingIds = lenders
    .map(resolvePipelineDealId)
    .filter((id): id is string => Boolean(id) && !deletedSet.has(id));
  const reloadId =
    remainingIds.find((id) => id === runtime.deal.id) || remainingIds[0] || null;

  if (!reloadId) {
    return {
      ...runtime,
      lenders: [],
      siblingDeals: [],
    };
  }

  // Soft-delete changed inventory — merge locally from DELETE successes (skip 3-GET reload).
  // Explicit Kanban Remove still verifies via removeLenderPipelineDeal.
  if (deletedSet.size > 0) {
    const mergedAfterDelete = runtime.siblingDeals
      .filter((d) => !deletedSet.has(d.id))
      .map((d) => patchedById.get(d.id) ?? d);
    const byMergedDelete = new Map(mergedAfterDelete.map((d) => [d.id, d]));
    for (const [id, row] of patchedById) {
      if (!byMergedDelete.has(id) && !deletedSet.has(id)) {
        mergedAfterDelete.push(row);
        byMergedDelete.set(id, row);
      }
    }
    const orderedDelete = remainingIds
      .map((id) => byMergedDelete.get(id))
      .filter((d): d is EnterpriseDealApiRecord => Boolean(d));
    const anchorDelete =
      orderedDelete.find((d) => d.id === reloadId) ||
      byMergedDelete.get(reloadId) ||
      orderedDelete[0] ||
      runtime.deal;
    for (const d of orderedDelete) putSessionDeal(d);
    putSessionDeal(anchorDelete);
    queueMicrotask(() => notifyLoanFilesUpdated());
    return toRuntime(
      anchorDelete,
      orderedDelete.length > 0 ? orderedDelete : [anchorDelete],
    );
  }

  // CO-PERF-001 — No delete: merge PATCH responses into sibling set; skip 3-GET reload.
  const mergedSiblings = runtime.siblingDeals
    .filter((d) => !deletedSet.has(d.id))
    .map((d) => patchedById.get(d.id) ?? d);

  const byMerged = new Map(mergedSiblings.map((d) => [d.id, d]));
  for (const [id, row] of patchedById) {
    if (!byMerged.has(id)) {
      mergedSiblings.push(row);
      byMerged.set(id, row);
    }
  }

  const ordered = remainingIds
    .map((id) => byMerged.get(id))
    .filter((d): d is EnterpriseDealApiRecord => Boolean(d));

  const anchor =
    ordered.find((d) => d.id === reloadId) ||
    byMerged.get(reloadId) ||
    ordered[0] ||
    runtime.deal;

  for (const d of ordered) putSessionDeal(d);
  putSessionDeal(anchor);
  // P1 — notify My Deals / Registry consumers after successful Pipeline persist.
  queueMicrotask(() => notifyLoanFilesUpdated());
  return toRuntime(anchor, ordered.length > 0 ? ordered : [anchor]);
}

/** @deprecated Legacy name — multi-lender snapshot read. Prefer dealToLenderExecution. */
export function readSnapshotLenders(deal: EnterpriseDealApiRecord): LoanLenderExecution[] {
  return [dealToLenderExecution(deal)];
}

export function toDealPipelineRuntime(deal: EnterpriseDealApiRecord): DealPipelineRuntime {
  return toRuntime(deal, [deal]);
}
