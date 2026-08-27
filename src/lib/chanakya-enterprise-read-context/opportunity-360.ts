/**
 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 — Opportunity 360 foundation (read access only).
 * No credit analysis / banking engines — evidence accessibility only.
 */

import "server-only";

import { enterpriseOpportunityService } from "@server/services/enterprise-opportunity";
import { enterpriseDealRepository } from "@server/repositories/enterprise-deal/enterprise-deal.repository";
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { listTasksForEntity } from "@/lib/enterprise-task-engine";
import { getDocumentRequestState } from "@/lib/document-requests/store";
import { buildChanakyaDocumentIntelligencePack } from "@/lib/chanakya-document-intelligence";
import { projectOcrIntegrationSummaryForAiContext } from "@/lib/chanakya-document-intelligence/ocr-integration-core";
import { composeBusinessIntelligenceSnapshot } from "@/lib/enterprise-business-intelligence/compose";
import {
  CHANAKYA_FIELD_AVAILABILITY,
  type ChanakyaDomainContextSlice,
  type ChanakyaEnterpriseReadDomain,
  type ChanakyaOpportunity360Context,
} from "@/types/chanakya-enterprise-read-context";
import { redactCustomerContactPiiForAiContext } from "./redact-pii";
import { resolveOpportunityLoanPurpose } from "@/lib/enterprise-opportunity/resolve-loan-purpose";
import {
  projectDialogueEvidence,
  projectDocumentReadinessEvidence,
  projectEarEvidence,
  projectPhaseReadinessEvidence,
  projectPostDisbursementConfirmationEvidence,
} from "./evidence-projections";
import { projectCommercialAccountingContext } from "./commercial-projections";
import { projectProductLenderIntelligence } from "./product-lender-intelligence";
import { projectCreditIntelligence } from "@/lib/chanakya-credit-intelligence/project-credit-intelligence";
import type { ChanakyaDocumentIntelligencePack } from "@/types/chanakya-document-intelligence";

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
    entityRefs: [{ entityKind: "opportunity", entityId }],
    summary,
    payload: redactCustomerContactPiiForAiContext(payload),
    limitations,
  };
}

async function resolveOpportunityRow(
  organizationId: string,
  opportunityRef: string,
): Promise<Record<string, unknown> | null> {
  const ref = opportunityRef.trim();
  if (!ref) return null;
  const upper = ref.toUpperCase();

  const pickExact = (items: Array<Record<string, unknown>>) =>
    items.find((row) => {
      if (String(row.organizationId || "") !== organizationId) return false;
      return (
        String(row.id || "") === ref ||
        String(row.opportunityNumber || "").toUpperCase() === upper
      );
    }) ?? null;

  try {
    const byId = (await enterpriseOpportunityService.getOpportunity(ref)) as Record<
      string,
      unknown
    >;
    if (byId && String(byId.organizationId || "") === organizationId) {
      return byId;
    }
  } catch {
    /* fall through to search */
  }

  try {
    const search = await enterpriseOpportunityService.searchOpportunities({
      q: ref,
      limit: 15,
    });
    return pickExact(search.items as Array<Record<string, unknown>>);
  } catch {
    return null;
  }
}

function sanitizeOpportunityCore(opp: Record<string, unknown>): Record<string, unknown> {
  const loanPurpose = resolveOpportunityLoanPurpose(opp);
  return {
    id: opp.id ?? null,
    opportunityNumber: opp.opportunityNumber ?? null,
    primaryContactName: opp.primaryContactName ?? null,
    primaryContactId: opp.primaryContactId ?? null,
    companyName: opp.companyName ?? null,
    companyId: opp.companyId ?? null,
    productCode: opp.productCode ?? null,
    productLabel: opp.productLabel ?? null,
    requestedAmount: opp.requestedAmount ?? null,
    lifecycleStatus: opp.lifecycleStatus ?? null,
    requirementStage: opp.requirementStage ?? null,
    employmentTypeCode: opp.employmentTypeCode ?? null,
    cityLabel: opp.cityLabel ?? null,
    transactionType: opp.transactionType ?? null,
    lendingType: opp.lendingType ?? null,
    loanPurpose: loanPurpose ?? null,
    loanPurposeAvailability: loanPurpose
      ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
      : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
    loanPurposeProvenance: "enterprise_opportunity_registry.lendingExtension.loanPurpose",
    relationshipManagerName: opp.relationshipManagerName ?? null,
    ownerUserId: opp.ownerUserId ?? null,
    createdAt: opp.createdAt ?? null,
    updatedAt: opp.updatedAt ?? null,
    // Explicitly never include contact channels even before global redact
    primaryContactMobile: undefined,
    primaryContactEmail: undefined,
  };
}

export async function assembleChanakyaOpportunity360(input: {
  organizationId: string;
  opportunityRef: string;
  includeDocumentExcerpts?: boolean;
}): Promise<ChanakyaOpportunity360Context | null> {
  const opp = await resolveOpportunityRow(input.organizationId, input.opportunityRef);
  if (!opp?.id) return null;

  const opportunityId = String(opp.id);
  const opportunityNumber =
    typeof opp.opportunityNumber === "string" ? opp.opportunityNumber : null;
  const organizationId =
    typeof opp.organizationId === "string"
      ? opp.organizationId
      : input.organizationId;

  if (organizationId !== input.organizationId) {
    return null;
  }

  const limitations: string[] = [
    "Opportunity 360 is a read-access foundation — advanced credit / banking analysis is NOT AVAILABLE in this sprint.",
    "Customer mobile and email are omitted from all slices (privacy hard rule).",
    "CO-CHANAKYA-003A: EAR, Dialogue, document/phase readiness, and post-disbursement confirmation are evidence projections from existing SSOTs.",
  ];

  const slices: ChanakyaOpportunity360Context["slices"] = {};

  // Transactions — opportunity core
  slices.transactions = sliceBase(
    "transactions",
    organizationId,
    opportunityId,
    `Opportunity ${opportunityNumber ?? opportunityId} core transaction context`,
    {
      opportunity: sanitizeOpportunityCore(opp),
      provenance: "enterprise_opportunity_registry",
    },
  );

  // Relationships — customer/business without contact channels
  slices.relationships = sliceBase(
    "relationships",
    organizationId,
    opportunityId,
    "Customer / company relationship identity (contact channels redacted)",
    {
      primaryContactId: opp.primaryContactId ?? null,
      primaryContactName: opp.primaryContactName ?? null,
      companyId: opp.companyId ?? null,
      companyName: opp.companyName ?? null,
      cityLabel: opp.cityLabel ?? null,
      employmentTypeCode: opp.employmentTypeCode ?? null,
      contactChannels: {
        mobile: CHANAKYA_FIELD_AVAILABILITY.REDACTED,
        email: CHANAKYA_FIELD_AVAILABILITY.REDACTED,
      },
      provenance: "enterprise_opportunity_registry + ecm_projection",
    },
  );

  // Execution — deals / lender pipeline
  let dealsPayload: Record<string, unknown>[] = [];
  if (isDatabaseAvailable()) {
    const deals = await enterpriseDealRepository.listByOpportunity(
      organizationId,
      opportunityId,
    );
    dealsPayload = deals.map((d) =>
      redactCustomerContactPiiForAiContext({
        id: d.id,
        dealNumber: d.dealNumber,
        lenderId: d.lenderId,
        lenderName: d.primaryCounterpartyName ?? null,
        productLabel: d.productLabel,
        grossStage: d.grossStage,
        subStage: d.subStage,
        requestedAmount: d.requestedAmount != null ? Number(d.requestedAmount) : null,
        approvedAmount: d.approvedAmount != null ? Number(d.approvedAmount) : null,
        fulfilledAmount: d.fulfilledAmount != null ? Number(d.fulfilledAmount) : null,
        disbursedAt: d.disbursedAt,
        stageEnteredAt: d.stageEnteredAt,
        updatedAt: d.updatedAt,
      }),
    );
  } else {
    limitations.push("Deal Registry unavailable (database offline) — execution slice limited.");
  }

  // CO-CHANAKYA-003A — EAR + Dialogue evidence (read-only)
  const earEvidence = await projectEarEvidence({
    organizationId,
    opportunityId,
    dealId: null,
  });
  const dialogueEvidence = projectDialogueEvidence({
    opportunityId,
    dealId: null,
  });

  const postDisbursementByDeal: Record<string, unknown>[] = [];
  if (isDatabaseAvailable()) {
    for (const d of dealsPayload.slice(0, 15)) {
      const dealId = String(d.id || "");
      if (!dealId) continue;
      postDisbursementByDeal.push(
        await projectPostDisbursementConfirmationEvidence({
          organizationId,
          dealId,
          grossStage: typeof d.grossStage === "string" ? d.grossStage : null,
          subStage: typeof d.subStage === "string" ? d.subStage : null,
          disbursedAt: (d.disbursedAt as Date | string | null) ?? null,
        }),
      );
    }
  }

  slices.execution = sliceBase(
    "execution",
    organizationId,
    opportunityId,
    dealsPayload.length
      ? `${dealsPayload.length} lender Deal(s) + activity/dialogue evidence`
      : "Execution evidence (deals may be empty)",
    {
      deals: dealsPayload,
      dealCount: dealsPayload.length,
      activityRegistry: earEvidence,
      dialogue: dialogueEvidence,
      postDisbursementConfirmation: postDisbursementByDeal.length
        ? {
            status: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
            deals: postDisbursementByDeal,
            provenance: "post-disbursement-confirmation service SSOT",
          }
        : {
            status: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
            deals: [],
            note: "No deals to project confirmation state.",
            provenance: "post-disbursement-confirmation service SSOT",
          },
      provenance: "enterprise_deal_registry + EAR + EDC + post-disbursement-confirmation",
    },
    dealsPayload.length === 0
      ? ["No Deals found for this Opportunity — deal execution NOT AVAILABLE rather than invented."]
      : [],
    dealsPayload.length > 0 ||
      earEvidence.status === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE ||
      dialogueEvidence.status === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
      ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
      : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
  );

  // Documents — checklist + intelligence metadata (no binaries)
  const docState = getDocumentRequestState(opportunityId);
  const checklist = (docState.lodItems ?? []).slice(0, 80).map((item) => ({
    typeRef: item.typeRef,
    label: item.label,
    status: item.status,
    mandatory: item.mandatory,
    participantId: item.participantId ?? null,
  }));

  let documentIntelligenceSummary: Record<string, unknown> = {
    status: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
    note: "Document intelligence pack not loaded in this compile.",
  };
  let documentPack: ChanakyaDocumentIntelligencePack | null = null;
  try {
    documentPack = await buildChanakyaDocumentIntelligencePack({ opportunityId });
    documentIntelligenceSummary = {
      status: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      documentsWithReadableText: documentPack.documentsWithReadableText,
      documentsRequiringOcr: documentPack.documentsRequiringOcr,
      documentsOcrFailed: documentPack.documentsOcrFailed,
      structuredFactCount: documentPack.structuredFacts.length,
      readCount: documentPack.reads.length,
      ocrIntegration: projectOcrIntegrationSummaryForAiContext(documentPack),
      reads: documentPack.reads.slice(0, 40).map((r) => ({
        displayName: r.displayName,
        typeRef: r.typeRef,
        hasBinary: r.hasBinary,
        extractionMethod: r.extractionMethod,
        status: r.status,
        // Never include raw document body in Opportunity 360 foundation by default
        textExcerpt:
          input.includeDocumentExcerpts && r.textExcerpt
            ? String(r.textExcerpt).slice(0, 400)
            : null,
      })),
      provenance: "chanakya_document_intelligence + enterprise_transaction_documents",
    };
    if (!input.includeDocumentExcerpts) {
      limitations.push(
        "Document text excerpts omitted (summary mode). Set includeDocumentExcerpts for truncated excerpts only — binaries remain server-controlled.",
      );
    }
  } catch {
    limitations.push("Document intelligence pack failed to load — metadata may be incomplete.");
  }

  slices.documents = sliceBase(
    "documents",
    organizationId,
    opportunityId,
    `Document checklist (${checklist.length}) + readiness + intelligence metadata`,
    {
      checklistCount: checklist.length,
      checklist,
      documentIntelligence: documentIntelligenceSummary,
      readinessEvidence: projectDocumentReadinessEvidence({
        lodItems: docState.lodItems ?? [],
        opportunity: {
          primaryContactName: opp.primaryContactName,
          primaryContactId: opp.primaryContactId,
          productLabel: opp.productLabel,
          employmentTypeCode: opp.employmentTypeCode,
          companyName: opp.companyName,
        },
        documentIntelligenceSummary,
      }),
      provenance: "document_requests + readiness derives + chanakya_document_intelligence",
    },
  );

  // Credit intelligence (010 — evidence-first financial & credit analysis)
  const creditIntelligencePayload = await projectCreditIntelligence({
    organizationId,
    opportunityRef: opportunityId,
    opportunityRow: opp,
    documentPack: documentPack ?? undefined,
  });

  slices.credit = sliceBase(
    "credit",
    organizationId,
    opportunityId,
    "Credit intelligence — financial profile, trends, banking, GST, reconciliation (read-only)",
    {
      availability: creditIntelligencePayload.availability,
      readOnly: true,
      summary: creditIntelligencePayload.creditAssessment.overallAssessment.summary,
      financialProfileAvailability: creditIntelligencePayload.financialProfile.availability,
      financialTrendsAvailability: creditIntelligencePayload.financialTrends.availability,
      bankingAnalysisAvailability: creditIntelligencePayload.bankingAnalysis.availability,
      gstAnalysisAvailability: creditIntelligencePayload.gstAnalysis.availability,
      reconciliationAvailability: creditIntelligencePayload.reconciliation.availability,
      creditRatiosAvailability: creditIntelligencePayload.creditRatios.availability,
      keyPositiveCount: creditIntelligencePayload.keyPositives.length,
      keyConcernCount: creditIntelligencePayload.keyConcerns.length,
      mitigantCount: creditIntelligencePayload.mitigants.length,
      internalRecommendationCount: creditIntelligencePayload.internalRecommendations.length,
      opportunityFields: {
        productLabel: opp.productLabel ?? null,
        requestedAmount: opp.requestedAmount ?? null,
        employmentTypeCode: opp.employmentTypeCode ?? null,
        transactionType: opp.transactionType ?? null,
        lendingType: opp.lendingType ?? null,
      },
      creditIntelligence: creditIntelligencePayload,
      provenance: "chanakya_credit_intelligence + document_intelligence + opportunity_registry",
    },
    creditIntelligencePayload.limitations.slice(0, 8),
    creditIntelligencePayload.availability === "NOT_AVAILABLE"
      ? CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE
      : CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
  );

  // Tasks / activity (ETE + phase readiness advisory)
  const tasks = listTasksForEntity({ opportunityRef: opportunityId }).slice(0, 50);
  const phaseReadiness = projectPhaseReadinessEvidence({
    hasContact: Boolean(opp.primaryContactId || opp.primaryContactName),
    hasOpportunity: true,
    customerName:
      typeof opp.primaryContactName === "string" ? opp.primaryContactName : null,
    productLabel: typeof opp.productLabel === "string" ? opp.productLabel : null,
    lifeFinalized: false,
  });
  slices.executive = sliceBase(
    "executive",
    organizationId,
    opportunityId,
    `Operational attention for opportunity (${tasks.length} ETE task(s) in scope)`,
    {
      openTaskCount: tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled")
        .length,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title ?? t.predefinedDescription ?? null,
        status: t.status ?? null,
        dueOn: t.dueOn ?? null,
        workType: t.workType ?? null,
        priority: t.priority ?? null,
      })),
      phaseReadiness,
      provenance: "enterprise_task_engine + enterprise_phase_readiness",
    },
  );

  // Commercial / accounting read intelligence (003C — SSOT projections only)
  const commercialPayload = await projectCommercialAccountingContext({
    organizationId,
    opportunityId,
    limit: 50,
  });

  slices.commercial = sliceBase(
    "commercial",
    organizationId,
    opportunityId,
    "Commercial / accounting snapshot (read-only)",
    commercialPayload,
    [],
    (commercialPayload.availability as string) === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
      ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
      : (commercialPayload.availability as ChanakyaDomainContextSlice["status"]),
  );

  // Product / lender intelligence (003E — evidence-first fit, no recommendations engine)
  const productLenderPayload = await projectProductLenderIntelligence({
    organizationId,
    opportunityRow: opp,
  });

  slices.productLender = sliceBase(
    "productLender",
    organizationId,
    opportunityId,
    "Product & Lender intelligence (Registry + Matrix + assignment evidence)",
    productLenderPayload as unknown as Record<string, unknown>,
    productLenderPayload.limitations,
    productLenderPayload.availability as ChanakyaDomainContextSlice["status"],
  );

  // Research — not enabled
  slices.research = sliceBase(
    "research",
    organizationId,
    opportunityId,
    "External research",
    {
      webResearch: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      note: "External web research is not enabled.",
    },
    ["External research NOT AVAILABLE."],
    CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
  );

  return {
    opportunityId,
    opportunityNumber,
    organizationId,
    compiledAt: new Date().toISOString(),
    slices,
    limitations,
  };
}

export function buildEnterpriseAttentionSummary(organizationId: string): Record<string, unknown> {
  const ebi = composeBusinessIntelligenceSnapshot();
  return redactCustomerContactPiiForAiContext({
    organizationId,
    activeOpportunities: ebi.executive.activeOpportunities,
    activeDeals: ebi.executive.activeDeals,
    pipelineValue: ebi.executive.pipelineValue,
    conversionRatioPct: ebi.executive.conversionRatioPct,
    attentionRequired: {
      overdueTasks: ebi.operational.overdueTasks,
      dealsAwaitingDocuments: ebi.operational.dealsAwaitingDocuments,
      dealsAwaitingLenderAction: ebi.operational.dealsAwaitingLenderAction,
      inactiveOpportunities: ebi.operational.inactiveOpportunities,
    },
    stageDistribution: ebi.executive.dealsByStage.slice(0, 16),
    provenance: "enterprise_business_intelligence",
    note: "Aggregated operational metrics — not a full database dump.",
  });
}
