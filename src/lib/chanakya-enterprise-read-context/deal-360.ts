/**
 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 — Deal 360 foundation (read access only).
 */

import "server-only";

import { enterpriseDealRepository } from "@server/repositories/enterprise-deal/enterprise-deal.repository";
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import {
  CHANAKYA_FIELD_AVAILABILITY,
  type ChanakyaDeal360Context,
  type ChanakyaDomainContextSlice,
  type ChanakyaEnterpriseReadDomain,
} from "@/types/chanakya-enterprise-read-context";
import { redactCustomerContactPiiForAiContext } from "./redact-pii";
import { assembleChanakyaOpportunity360 } from "./opportunity-360";

function sliceBase(
  domain: ChanakyaEnterpriseReadDomain,
  organizationId: string | null,
  entityId: string,
  summary: string,
  payload: Record<string, unknown>,
  limitations: string[] = [],
  status: ChanakyaDomainContextSlice["status"] = CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
): ChanakyaDomainContextSlice {
  return {
    domain,
    status,
    organizationId,
    compiledAt: new Date().toISOString(),
    entityRefs: [{ entityKind: "deal", entityId }],
    summary,
    payload: redactCustomerContactPiiForAiContext(payload),
    limitations,
  };
}

export async function assembleChanakyaDeal360(input: {
  organizationId: string;
  dealRef: string;
  includeDocumentExcerpts?: boolean;
}): Promise<ChanakyaDeal360Context | null> {
  const ref = input.dealRef.trim();
  if (!ref || !isDatabaseAvailable()) return null;

  let deal = await prisma.enterpriseDeal.findFirst({
    where: { organizationId: input.organizationId, id: ref, isDeleted: false },
  });
  if (!deal) {
    deal = await enterpriseDealRepository.findByDealNumber(input.organizationId, ref);
  }
  if (!deal) return null;

  const limitations: string[] = [
    "Deal 360 is read-access foundation — no lender recommendation or credit analysis in this sprint.",
    "Customer mobile and email are omitted.",
  ];

  const slices: ChanakyaDeal360Context["slices"] = {};

  slices.execution = sliceBase(
    "execution",
    input.organizationId,
    deal.id,
    `Deal ${deal.dealNumber} execution context`,
    {
      deal: {
        id: deal.id,
        dealNumber: deal.dealNumber,
        opportunityId: deal.opportunityId,
        lenderId: deal.lenderId,
        lenderName: deal.primaryCounterpartyName,
        productLabel: deal.productLabel,
        productCode: deal.productCode,
        grossStage: deal.grossStage,
        subStage: deal.subStage,
        requestedAmount:
          deal.requestedAmount != null ? Number(deal.requestedAmount) : null,
        approvedAmount: deal.approvedAmount != null ? Number(deal.approvedAmount) : null,
        fulfilledAmount:
          deal.fulfilledAmount != null ? Number(deal.fulfilledAmount) : null,
        disbursedAt: deal.disbursedAt,
        stageEnteredAt: deal.stageEnteredAt,
        updatedAt: deal.updatedAt,
        primaryContactName: deal.primaryContactName,
      },
      provenance: "enterprise_deal_registry",
    },
  );

  slices.productLender = sliceBase(
    "productLender",
    input.organizationId,
    deal.id,
    "Product / lender assignment on this Deal",
    {
      lenderId: deal.lenderId,
      lenderName: deal.primaryCounterpartyName,
      productCode: deal.productCode,
      productLabel: deal.productLabel,
      lenderProductMatrixDeepParams: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      note: "Matrix program parameter deep-read is deferred — assignment fields only.",
      provenance: "enterprise_deal_registry",
    },
  );

  slices.relationships = sliceBase(
    "relationships",
    input.organizationId,
    deal.id,
    "Deal relationship identity (contact channels redacted)",
    {
      primaryContactName: deal.primaryContactName,
      contactChannels: {
        mobile: CHANAKYA_FIELD_AVAILABILITY.REDACTED,
        email: CHANAKYA_FIELD_AVAILABILITY.REDACTED,
      },
      provenance: "enterprise_deal_registry",
    },
  );

  if (deal.opportunityId) {
    const opp360 = await assembleChanakyaOpportunity360({
      organizationId: input.organizationId,
      opportunityRef: deal.opportunityId,
      includeDocumentExcerpts: input.includeDocumentExcerpts,
    });
    if (opp360) {
      for (const key of [
        "transactions",
        "credit",
        "documents",
        "commercial",
        "executive",
      ] as const) {
        const slice = opp360.slices[key];
        if (slice) slices[key] = slice;
      }
      limitations.push(...opp360.limitations);
    } else {
      limitations.push("Parent Opportunity 360 NOT AVAILABLE for linked opportunityId.");
    }
  } else {
    limitations.push("Deal has no opportunityId — parent Opportunity context NOT APPLICABLE.");
  }

  return {
    dealId: deal.id,
    dealNumber: deal.dealNumber,
    opportunityId: deal.opportunityId,
    organizationId: input.organizationId,
    compiledAt: new Date().toISOString(),
    slices,
    limitations,
  };
}
