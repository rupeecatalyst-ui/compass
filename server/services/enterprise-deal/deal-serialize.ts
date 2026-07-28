/**
 * CO-ARCH-002-W2 — Serialize Prisma Deal aggregates for API responses.
 */
import type {
  EnterpriseDeal,
  EnterpriseDealActivity,
  EnterpriseDealCounterpartyAssignment,
  EnterpriseDealDocumentLink,
  EnterpriseDealSnapshot,
  EnterpriseDealTask,
  EnterpriseDealTimelineEvent,
  Prisma,
} from "@prisma/client";

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

function iso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

/** CO-DOM-001A — borrower stamps from working snapshot when columns are absent. */
function borrowerMetaFromSnapshot(snapshot: unknown): {
  companyName: string | null;
  primaryBorrowerKind: "individual" | "company" | null;
} {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { companyName: null, primaryBorrowerKind: null };
  }
  const s = snapshot as Record<string, unknown>;
  const kindRaw =
    typeof s.primaryBorrowerKind === "string"
      ? s.primaryBorrowerKind.trim().toLowerCase()
      : "";
  const company =
    s.company && typeof s.company === "object" && !Array.isArray(s.company)
      ? (s.company as Record<string, unknown>)
      : null;
  const companyName =
    (typeof s.companyName === "string" && s.companyName.trim()) ||
    (typeof company?.name === "string" && company.name.trim()) ||
    null;
  return {
    companyName,
    primaryBorrowerKind:
      kindRaw === "company" || kindRaw === "individual"
        ? kindRaw
        : null,
  };
}

export function serializeDeal(deal: EnterpriseDeal) {
  const snapBorrower = borrowerMetaFromSnapshot(deal.snapshot);
  return {
    id: deal.id,
    organizationId: deal.organizationId,
    dealNumber: deal.dealNumber,
    opportunityId: deal.opportunityId,
    lenderId: deal.lenderId,
    lenderProgramId: deal.lenderProgramId,
    legacyLoanFileId: deal.legacyLoanFileId,
    fileNumber: deal.fileNumber,
    externalRefs: deal.externalRefs,
    productId: deal.productId,
    productCode: deal.productCode,
    productLabel: deal.productLabel,
    productCategoryId: deal.productCategoryId,
    productGroupId: deal.productGroupId,
    productFamily: deal.productFamily,
    transactionType: deal.transactionType,
    lifecyclePhase: deal.lifecyclePhase,
    grossStage: deal.grossStage,
    subStage: deal.subStage,
    lifecycleStatus: deal.lifecycleStatus,
    operationalStatus: deal.operationalStatus,
    progressPercent: deal.progressPercent,
    daysInStage: deal.daysInStage,
    stageEnteredAt: iso(deal.stageEnteredAt),
    closedAt: iso(deal.closedAt),
    archived: deal.archived,
    archivedAt: iso(deal.archivedAt),
    archivedBy: deal.archivedBy,
    primaryOwnerUserId: deal.primaryOwnerUserId,
    relationshipManagerUserId: deal.relationshipManagerUserId,
    relationshipManagerName: deal.relationshipManagerName,
    sourceOwnerUserId: deal.sourceOwnerUserId,
    creditOwnerUserId: deal.creditOwnerUserId,
    teamId: deal.teamId,
    branchId: deal.branchId,
    assignmentMode: deal.assignmentMode,
    primaryContactId: deal.primaryContactId,
    primaryContactName: deal.primaryContactName,
    primaryContactMobile: deal.primaryContactMobile,
    primaryContactEmail: deal.primaryContactEmail,
    companyId: deal.companyId,
    companyName: snapBorrower.companyName,
    primaryBorrowerKind:
      snapBorrower.primaryBorrowerKind ??
      (deal.companyId ? "company" : "individual"),
    employmentTypeCode: deal.employmentTypeCode,
    cityCode: deal.cityCode,
    stateCode: deal.stateCode,
    cityLabel: deal.cityLabel,
    stateLabel: deal.stateLabel,
    currencyCode: deal.currencyCode,
    requestedAmount: decimalToNumber(deal.requestedAmount),
    approvedAmount: decimalToNumber(deal.approvedAmount),
    fulfilledAmount: decimalToNumber(deal.fulfilledAmount),
    commercialTerms: deal.commercialTerms,
    lendingExtension: deal.lendingExtension,
    snapshot: deal.snapshot,
    primaryCounterpartyType: deal.primaryCounterpartyType,
    primaryCounterpartyId: deal.primaryCounterpartyId,
    primaryCounterpartyName: deal.primaryCounterpartyName,
    primaryCounterpartyProgramId: deal.primaryCounterpartyProgramId,
    invoicePartyType: deal.invoicePartyType,
    invoicePartySpecify: deal.invoicePartySpecify,
    invoicePartyContactId: deal.invoicePartyContactId,
    invoicePartyId: deal.invoicePartyId,
    /** @deprecated aliases */
    commissionPayeeType: deal.invoicePartyType,
    commissionPayeeSpecify: deal.invoicePartySpecify,
    commissionPayeeContactId: deal.invoicePartyContactId,
    commissionAccountingPayeeId: deal.invoicePartyId,
    expectedRevenue: decimalToNumber(deal.expectedRevenue) ?? 0,
    revenuePercent: decimalToNumber(deal.revenuePercent),
    revenueReceived: decimalToNumber(deal.revenueReceived) ?? 0,
    payoutConfigured: deal.payoutConfigured,
    settlementCompleted: deal.settlementCompleted,
    priority: deal.priority,
    isUrgent: deal.isUrgent,
    isDelayed: deal.isDelayed,
    riskBand: deal.riskBand,
    sourceCode: deal.sourceCode,
    sourceContactId: deal.sourceContactId,
    healthScore: deal.healthScore,
    healthBand: deal.healthBand,
    healthComputedAt: iso(deal.healthComputedAt),
    healthPayload: deal.healthPayload,
    importBatchId: deal.importBatchId,
    versionNumber: deal.versionNumber,
    rowVersion: deal.rowVersion,
    createdBy: deal.createdBy,
    updatedBy: deal.updatedBy,
    createdAt: iso(deal.createdAt),
    updatedAt: iso(deal.updatedAt),
    isDeleted: deal.isDeleted,
    deletedAt: iso(deal.deletedAt),
    deletedBy: deal.deletedBy,
    deletionReason: deal.deletionReason,
  };
}

/**
 * CO-PERF-002 — Phase 1 My Deals / list projection.
 * Omits heavy JSON (full snapshot, commercialTerms, healthPayload) while keeping card fields.
 */
export function serializeDealSummary(deal: EnterpriseDeal) {
  const full = serializeDeal(deal);
  const snapBorrower = borrowerMetaFromSnapshot(deal.snapshot);
  const leanSnapshot =
    snapBorrower.companyName || snapBorrower.primaryBorrowerKind
      ? {
          companyName: snapBorrower.companyName,
          primaryBorrowerKind: snapBorrower.primaryBorrowerKind,
        }
      : null;
  return {
    ...full,
    commercialTerms: null,
    healthPayload: null,
    externalRefs: null,
    snapshot: leanSnapshot,
    /** Marker for progressive enrichment */
    _projection: "summary" as const,
  };
}

export function serializeTimelineEvent(row: EnterpriseDealTimelineEvent) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    dealId: row.dealId,
    eventType: row.eventType,
    occurredAt: iso(row.occurredAt),
    actorUserId: row.actorUserId,
    summary: row.summary,
    payload: row.payload,
    createdAt: iso(row.createdAt),
  };
}

export function serializeSnapshot(row: EnterpriseDealSnapshot) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    dealId: row.dealId,
    versionNumber: row.versionNumber,
    reason: row.reason,
    snapshot: row.snapshot,
    createdBy: row.createdBy,
    createdAt: iso(row.createdAt),
  };
}

export function serializeCounterparty(row: EnterpriseDealCounterpartyAssignment) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    dealId: row.dealId,
    counterpartyType: row.counterpartyType,
    counterpartyRegistryId: row.counterpartyRegistryId,
    programId: row.programId,
    isPrimary: row.isPrimary,
    pipelineStage: row.pipelineStage,
    pipelineSubStage: row.pipelineSubStage,
    applicationRef: row.applicationRef,
    decision: row.decision,
    decisionAt: iso(row.decisionAt),
    extension: row.extension,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    isDeleted: row.isDeleted,
  };
}

export function serializeDocumentLink(row: EnterpriseDealDocumentLink) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    dealId: row.dealId,
    documentDefinitionId: row.documentDefinitionId,
    documentTypeId: row.documentTypeId,
    participantId: row.participantId,
    status: row.status,
    storageKey: row.storageKey,
    uploadedAt: iso(row.uploadedAt),
    verifiedAt: iso(row.verifiedAt),
    extension: row.extension,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    isDeleted: row.isDeleted,
  };
}

export function serializeTask(row: EnterpriseDealTask) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    dealId: row.dealId,
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueAt: iso(row.dueAt),
    assigneeUserId: row.assigneeUserId,
    slaPolicyId: row.slaPolicyId,
    completedAt: iso(row.completedAt),
    payload: row.payload,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    isDeleted: row.isDeleted,
  };
}

export function serializeActivity(row: EnterpriseDealActivity) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    dealId: row.dealId,
    title: row.title,
    status: row.status,
    activityType: row.activityType,
    dueAt: iso(row.dueAt),
    assigneeUserId: row.assigneeUserId,
    completedAt: iso(row.completedAt),
    payload: row.payload,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    isDeleted: row.isDeleted,
  };
}
