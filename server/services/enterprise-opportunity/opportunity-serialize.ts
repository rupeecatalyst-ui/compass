/**
 * CO-ARCH-003 Phase 2A — Serialize Opportunity for API responses.
 */
import type { EnterpriseOpportunity, Prisma } from "@prisma/client";
import { hasRequirementCaptureFields } from "@/constants/opportunity-lifecycle";
import type { TransactionContactIdentityFields } from "@server/services/ecm/contact-ssot-propagate";
import { hydrateTransactionContactIdentity } from "@server/services/ecm/contact-ssot-propagate";

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

function iso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

export function serializeOpportunity(row: EnterpriseOpportunity) {
  const requestedAmount = decimalToNumber(row.requestedAmount);
  return buildSerializedOpportunity(row, requestedAmount);
}

function buildSerializedOpportunity(
  row: EnterpriseOpportunity,
  requestedAmount: number | null,
  identity?: TransactionContactIdentityFields,
) {
  const contactIdentity = identity ?? {
    primaryContactName: row.primaryContactName,
    primaryContactMobile: row.primaryContactMobile,
    primaryContactEmail: row.primaryContactEmail,
    cityLabel: row.cityLabel,
    stateLabel: row.stateLabel,
  };
  return {
    id: row.id,
    organizationId: row.organizationId,
    opportunityNumber: row.opportunityNumber,
    legacyLoanFileId: row.legacyLoanFileId,
    externalRefs: row.externalRefs,
    productId: row.productId,
    productCode: row.productCode,
    productLabel: row.productLabel,
    productUniquenessKey: row.productUniquenessKey,
    productFamily: row.productFamily,
    transactionType: row.transactionType,
    requirementStage: row.requirementStage,
    requirementSubStage: row.requirementSubStage,
    lifecycleStatus: row.lifecycleStatus,
    fulfilmentMode: row.fulfilmentMode,
    fulfilmentStatus: row.fulfilmentStatus,
    fulfilledAmount: decimalToNumber(row.fulfilledAmount),
    stageEnteredAt: iso(row.stageEnteredAt),
    closedAt: iso(row.closedAt),
    archived: row.archived,
    archivedAt: iso(row.archivedAt),
    archivedBy: row.archivedBy,
    primaryOwnerUserId: row.primaryOwnerUserId,
    relationshipManagerUserId: row.relationshipManagerUserId,
    relationshipManagerName: row.relationshipManagerName,
    teamId: row.teamId,
    branchId: row.branchId,
    primaryContactId: row.primaryContactId,
    primaryContactName: contactIdentity.primaryContactName,
    primaryContactMobile: contactIdentity.primaryContactMobile,
    primaryContactEmail: contactIdentity.primaryContactEmail,
    primaryBorrowerKind: row.primaryBorrowerKind,
    companyId: row.companyId,
    companyName: row.companyName,
    employmentTypeCode: row.employmentTypeCode,
    cityLabel: contactIdentity.cityLabel,
    stateLabel: contactIdentity.stateLabel,
    currencyCode: row.currencyCode,
    requestedAmount,
    /** ADR-018 — Product + Required Amount gate (field-based). */
    requirementCaptured: hasRequirementCaptureFields({
      productId: row.productId,
      productCode: row.productCode,
      productLabel: row.productLabel,
      productUniquenessKey: row.productUniquenessKey,
      requestedAmount,
    }),
    priority: row.priority,
    sourceCode: row.sourceCode,
    sourceContactId: row.sourceContactId,
    sourceContactName: row.sourceContactName,
    sourceWealthPartnerId: row.sourceWealthPartnerId,
    participationRole: row.participationRole,
    commercialRevenueSharePercent: row.commercialRevenueSharePercent,
    sourceCampaignLabel: row.sourceCampaignLabel,
    snapshot: row.snapshot,
    lendingExtension: row.lendingExtension,
    versionNumber: row.versionNumber,
    rowVersion: row.rowVersion,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    isDeleted: row.isDeleted,
  };
}

export async function serializeOpportunityWithContactSsot(row: EnterpriseOpportunity) {
  const requestedAmount = decimalToNumber(row.requestedAmount);
  const identity = await hydrateTransactionContactIdentity({
    organizationId: row.organizationId,
    primaryContactId: row.primaryContactId,
    denorm: {
      primaryContactName: row.primaryContactName,
      primaryContactMobile: row.primaryContactMobile,
      primaryContactEmail: row.primaryContactEmail,
      cityLabel: row.cityLabel,
      stateLabel: row.stateLabel,
    },
  });
  return buildSerializedOpportunity(row, requestedAmount, identity);
}
