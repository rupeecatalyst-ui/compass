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
import { composeBusinessIntelligenceSnapshot } from "@/lib/enterprise-business-intelligence/compose";
import {
  CHANAKYA_FIELD_AVAILABILITY,
  type ChanakyaDomainContextSlice,
  type ChanakyaEnterpriseReadDomain,
  type ChanakyaOpportunity360Context,
} from "@/types/chanakya-enterprise-read-context";
import { redactCustomerContactPiiForAiContext } from "./redact-pii";

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

  slices.execution = sliceBase(
    "execution",
    organizationId,
    opportunityId,
    dealsPayload.length
      ? `${dealsPayload.length} lender Deal(s) for this Opportunity`
      : "No lender Deals linked (or Deal Registry unavailable)",
    {
      deals: dealsPayload,
      dealCount: dealsPayload.length,
      provenance: "enterprise_deal_registry",
    },
    dealsPayload.length === 0
      ? ["No Deals found for this Opportunity — NOT AVAILABLE rather than invented."]
      : [],
    dealsPayload.length > 0
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
  try {
    const pack = await buildChanakyaDocumentIntelligencePack({ opportunityId });
    documentIntelligenceSummary = {
      status: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      documentsWithReadableText: pack.documentsWithReadableText,
      documentsRequiringOcr: pack.documentsRequiringOcr,
      structuredFactCount: pack.structuredFacts.length,
      readCount: pack.reads.length,
      reads: pack.reads.slice(0, 40).map((r) => ({
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
    `Document checklist (${checklist.length}) + intelligence metadata`,
    {
      checklistCount: checklist.length,
      checklist,
      documentIntelligence: documentIntelligenceSummary,
      provenance: "document_requests + chanakya_document_intelligence",
    },
  );

  // Credit — workbench presence only (no analysis)
  slices.credit = sliceBase(
    "credit",
    organizationId,
    opportunityId,
    "Credit Workbench context shell (analysis engines NOT AVAILABLE)",
    {
      creditWorkbench: {
        analysisEngines: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
        foirDscrLtv: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
        bankingAnalysis: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
        note: "Use existing MAKE PROPOSAL / Credit Workbench flows for proposal drafts — this slice only exposes accessibility status.",
      },
      opportunityFields: {
        productLabel: opp.productLabel ?? null,
        requestedAmount: opp.requestedAmount ?? null,
        employmentTypeCode: opp.employmentTypeCode ?? null,
        transactionType: opp.transactionType ?? null,
        lendingType: opp.lendingType ?? null,
      },
      provenance: "opportunity_registry (credit analysis deferred)",
    },
    ["Advanced credit analysis is intentionally NOT AVAILABLE in CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002."],
    CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
  );

  // Tasks / activity (ETE + light activity)
  const tasks = listTasksForEntity({ opportunityRef: opportunityId }).slice(0, 50);
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
      provenance: "enterprise_task_engine",
    },
  );

  // Commercial / accounting linkage (read-only invoice refs when DB up)
  let commercialPayload: Record<string, unknown> = {
    invoices: [],
    status: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
  };
  if (isDatabaseAvailable()) {
    try {
      const invoices = await prisma.enterpriseAccountingInvoice.findMany({
        where: { organizationId, opportunityId },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          invoiceNumber: true,
          documentStatus: true,
          invoiceTotal: true,
          netReceivable: true,
          raisedAt: true,
          dealId: true,
        },
      });
      commercialPayload = {
        status:
          invoices.length > 0
            ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
            : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
        invoiceCount: invoices.length,
        invoices: invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          documentStatus: inv.documentStatus,
          invoiceTotal: inv.invoiceTotal != null ? Number(inv.invoiceTotal) : null,
          netReceivable: inv.netReceivable != null ? Number(inv.netReceivable) : null,
          raisedAt: inv.raisedAt,
          dealId: inv.dealId,
        })),
        provenance: "enterprise_accounting_invoice",
      };
    } catch {
      commercialPayload = {
        status: CHANAKYA_FIELD_AVAILABILITY.UNKNOWN,
        note: "Accounting invoice query failed — linkage UNKNOWN.",
      };
    }
  }

  slices.commercial = sliceBase(
    "commercial",
    organizationId,
    opportunityId,
    "Accounting / invoice linkage (read-only)",
    commercialPayload,
  );

  // Product / lender assignment (read-only — no recommendations)
  const primaryDeal = dealsPayload[0] as Record<string, unknown> | undefined;
  slices.productLender = sliceBase(
    "productLender",
    organizationId,
    opportunityId,
    "Product and lender assignment for this Opportunity",
    {
      opportunityProduct: {
        productCode: opp.productCode ?? null,
        productLabel: opp.productLabel ?? null,
      },
      deals: dealsPayload.map((d) => ({
        dealId: d.id,
        dealNumber: d.dealNumber,
        lenderId: d.lenderId,
        lenderName: d.lenderName,
        productLabel: d.productLabel,
        grossStage: d.grossStage,
        subStage: d.subStage,
      })),
      primaryLenderAssignment: primaryDeal
        ? {
            lenderId: primaryDeal.lenderId ?? null,
            lenderName: primaryDeal.lenderName ?? null,
            dealNumber: primaryDeal.dealNumber ?? null,
          }
        : null,
      lenderProductMatrixDeepParams: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      recommendations: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      note: "Assignment and stage evidence only — lender recommendations deferred.",
      provenance: "enterprise_opportunity_registry + enterprise_deal_registry",
    },
    [
      "Product-Lender Matrix deep program parameters are NOT AVAILABLE in this sprint.",
      "Lender recommendations are NOT AVAILABLE in this sprint.",
    ],
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
