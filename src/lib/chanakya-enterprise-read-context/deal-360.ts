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
import {
  projectDialogueEvidence,
  projectEarEvidence,
  projectPhaseReadinessEvidence,
  projectPostDisbursementConfirmationEvidence,
} from "./evidence-projections";
import { projectCommercialAccountingContext } from "./commercial-projections";
import { projectProductLenderIntelligence } from "./product-lender-intelligence";

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

  let parentOpportunity: {
    opportunityNumber: string | null;
    companyName: string | null;
    sourceCode: string | null;
    sourceContactName: string | null;
    sourceCampaignLabel: string | null;
    sourceWealthPartnerId: string | null;
  } | null = null;
  let wealthPartnerName: string | null = null;
  if (deal.opportunityId && isDatabaseAvailable()) {
    parentOpportunity = await prisma.enterpriseOpportunity.findFirst({
      where: {
        organizationId: input.organizationId,
        id: deal.opportunityId,
        isDeleted: false,
      },
      select: {
        opportunityNumber: true,
        companyName: true,
        sourceCode: true,
        sourceContactName: true,
        sourceCampaignLabel: true,
        sourceWealthPartnerId: true,
      },
    });
    if (parentOpportunity?.sourceWealthPartnerId) {
      const wp = await prisma.enterpriseWealthPartner.findFirst({
        where: {
          organizationId: input.organizationId,
          id: parentOpportunity.sourceWealthPartnerId,
          isDeleted: false,
        },
        select: { displayName: true, code: true },
      });
      wealthPartnerName = wp?.displayName?.trim() || wp?.code?.trim() || null;
    }
  }

  const limitations: string[] = [
    "Deal 360 is read-access foundation — no lender recommendation or credit analysis in this sprint.",
    "Customer mobile and email are omitted.",
    "CO-CHANAKYA-003A: EAR, Dialogue, phase readiness, and post-disbursement confirmation are evidence projections from existing SSOTs.",
  ];

  const slices: ChanakyaDeal360Context["slices"] = {};

  const [earEvidence, postDisbursement] = await Promise.all([
    projectEarEvidence({
      organizationId: input.organizationId,
      opportunityId: deal.opportunityId,
      dealId: deal.id,
    }),
    projectPostDisbursementConfirmationEvidence({
      organizationId: input.organizationId,
      dealId: deal.id,
      grossStage: deal.grossStage,
      subStage: deal.subStage,
      disbursedAt: deal.disbursedAt,
    }),
  ]);
  const dialogueEvidence = projectDialogueEvidence({
    opportunityId: deal.opportunityId,
    dealId: deal.id,
  });
  const phaseReadiness = projectPhaseReadinessEvidence({
    hasContact: Boolean(deal.primaryContactName),
    hasOpportunity: Boolean(deal.opportunityId),
    customerName: deal.primaryContactName,
    productLabel: deal.productLabel,
    lifeFinalized: false,
  });

  slices.execution = sliceBase(
    "execution",
    input.organizationId,
    deal.id,
    `Deal ${deal.dealNumber} execution + activity evidence`,
    {
      deal: {
        id: deal.id,
        dealNumber: deal.dealNumber,
        opportunityId: deal.opportunityId,
        opportunityNumber: parentOpportunity?.opportunityNumber ?? null,
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
        customerName: deal.primaryContactName,
        companyName: parentOpportunity?.companyName ?? null,
        businessSource: parentOpportunity
          ? {
              sourceCode: parentOpportunity.sourceCode,
              sourceContactName: parentOpportunity.sourceContactName,
              sourceCampaignLabel: parentOpportunity.sourceCampaignLabel,
            }
          : null,
        wealthPartner: parentOpportunity?.sourceWealthPartnerId
          ? {
              id: parentOpportunity.sourceWealthPartnerId,
              name: wealthPartnerName,
            }
          : null,
      },
      activityRegistry: earEvidence,
      dialogue: dialogueEvidence,
      postDisbursementConfirmation: postDisbursement,
      provenance:
        "enterprise_deal_registry + EAR + EDC + post-disbursement-confirmation service",
    },
  );

  slices.executive = sliceBase(
    "executive",
    input.organizationId,
    deal.id,
    "Deal-scoped advisory phase readiness",
    {
      phaseReadiness,
      provenance: "enterprise_phase_readiness/derive.derivePhaseReadiness",
    },
  );

  const productLenderPayload = deal.opportunityId
    ? await projectProductLenderIntelligence({
        organizationId: input.organizationId,
        opportunityRef: deal.opportunityId,
        dealId: deal.id,
      })
    : await projectProductLenderIntelligence({
        organizationId: input.organizationId,
        opportunityRef: null,
        dealId: deal.id,
      });

  slices.productLender = sliceBase(
    "productLender",
    input.organizationId,
    deal.id,
    "Product / Lender intelligence on this Deal",
    productLenderPayload as unknown as Record<string, unknown>,
    productLenderPayload.limitations,
    productLenderPayload.availability as ChanakyaDomainContextSlice["status"],
  );

  slices.relationships = sliceBase(
    "relationships",
    input.organizationId,
    deal.id,
    "Deal relationship identity (contact channels redacted)",
    {
      primaryContactName: deal.primaryContactName,
      customerName: deal.primaryContactName,
      companyName: parentOpportunity?.companyName ?? null,
      opportunityNumber: parentOpportunity?.opportunityNumber ?? null,
      businessSource: parentOpportunity
        ? {
            sourceCode: parentOpportunity.sourceCode,
            sourceContactName: parentOpportunity.sourceContactName,
            sourceCampaignLabel: parentOpportunity.sourceCampaignLabel,
          }
        : null,
      wealthPartner: parentOpportunity?.sourceWealthPartnerId
        ? {
            id: parentOpportunity.sourceWealthPartnerId,
            name: wealthPartnerName,
          }
        : null,
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
      ] as const) {
        const slice = opp360.slices[key];
        if (slice) slices[key] = slice;
      }
      const dealCommercial = await projectCommercialAccountingContext({
        organizationId: input.organizationId,
        opportunityId: deal.opportunityId,
        dealId: deal.id,
        dealStage: deal.grossStage,
        dealSubStage: deal.subStage,
        disbursedAt: deal.disbursedAt,
        limit: 50,
      });
      slices.commercial = sliceBase(
        "commercial",
        input.organizationId,
        deal.id,
        `Deal commercial / accounting snapshot (${deal.dealNumber})`,
        dealCommercial,
        [],
        (dealCommercial.availability as string) === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
          ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
          : (dealCommercial.availability as ChanakyaDomainContextSlice["status"]),
      );
      // Parent executive (ETE tasks) kept under transactions-adjacent note via documents/commercial;
      // Deal keeps its own executive (phase readiness) + enriched execution evidence.
      if (opp360.slices.executive) {
        slices.executive = sliceBase(
          "executive",
          input.organizationId,
          deal.id,
          "Deal phase readiness + parent Opportunity executive attention",
          {
            phaseReadiness,
            parentOpportunityExecutive: opp360.slices.executive.payload,
            provenance:
              "enterprise_phase_readiness + enterprise_task_engine (via Opportunity 360)",
          },
        );
      }
      limitations.push(...opp360.limitations);
    } else {
      limitations.push("Parent Opportunity 360 NOT AVAILABLE for linked opportunityId.");
    }
  } else {
    limitations.push("Deal has no opportunityId — parent Opportunity context NOT APPLICABLE.");
  }

  if (!slices.commercial) {
    const dealCommercial = await projectCommercialAccountingContext({
      organizationId: input.organizationId,
      opportunityId: deal.opportunityId,
      dealId: deal.id,
      dealStage: deal.grossStage,
      dealSubStage: deal.subStage,
      disbursedAt: deal.disbursedAt,
      limit: 50,
    });
    slices.commercial = sliceBase(
      "commercial",
      input.organizationId,
      deal.id,
      `Deal commercial / accounting snapshot (${deal.dealNumber})`,
      dealCommercial,
    );
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
