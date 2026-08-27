/**
 * CO-CHANAKYA-003E — Product & Lender intelligence loaders (read-only SSOT).
 */

import "server-only";

import { enterpriseOpportunityService } from "@server/services/enterprise-opportunity";
import { enterpriseDealRepository } from "@server/repositories/enterprise-deal/enterprise-deal.repository";
import { lenderRegistryService } from "@server/services/lender-registry/lender-registry.service";
import { productRegistryService } from "@server/services/product-registry/product-registry.service";
import { isDatabaseAvailable } from "@server/lib/prisma";
import { resolveProductLibraryCode } from "@/lib/deal-workspace/product-lender-eligibility";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";
import {
  CHANAKYA_FIELD_AVAILABILITY,
  type ChanakyaProductLenderIntelligenceContext,
} from "@/types/chanakya-enterprise-read-context";
import { redactCustomerContactPiiForAiContext } from "./redact-pii";
import {
  assembleProductLenderIntelligence,
  assessMatrixDepth,
  buildAssignedLenderAssessments,
  buildMatrixMappedLenders,
  buildMissingInformation,
  buildPotentialLenderFitAssessments,
  buildProductContextEvidence,
  buildPropertyEvidence,
  buildInternalLenderFitRecommendations,
  buildTransactionLenderSnapshot,
  type AssignedLenderInput,
  type MatrixLenderInput,
  type StatedCreditWorkbenchInput,
  type TransactionEvidenceInput,
} from "./product-lender-intelligence-core";

async function resolveOpportunityRow(
  organizationId: string,
  opportunityRef: string,
): Promise<Record<string, unknown> | null> {
  const ref = opportunityRef.trim();
  if (!ref) return null;
  try {
    const row = (await enterpriseOpportunityService.getOpportunity(ref)) as Record<
      string,
      unknown
    >;
    if (row && String(row.organizationId || "") === organizationId) return row;
  } catch {
    /* search fallback */
  }
  try {
    const search = await enterpriseOpportunityService.searchOpportunities({
      q: ref,
      limit: 10,
    });
    const upper = ref.toUpperCase();
    return (
      (search.items as Array<Record<string, unknown>>).find(
        (r) =>
          String(r.organizationId || "") === organizationId &&
          (String(r.id) === ref ||
            String(r.opportunityNumber || "").toUpperCase() === upper),
      ) ?? null
    );
  } catch {
    return null;
  }
}

async function loadDealsForScope(input: {
  organizationId: string;
  opportunityId: string;
  dealId?: string | null;
}): Promise<{ assigned: AssignedLenderInput[]; limitations: string[] }> {
  if (!isDatabaseAvailable()) {
    return {
      assigned: [],
      limitations: ["Deal Registry unavailable (database offline) — assigned lender context NOT AVAILABLE."],
    };
  }
  try {
    const deals = await enterpriseDealRepository.listByOpportunity(
      input.organizationId,
      input.opportunityId,
    );
    const filtered = input.dealId
      ? deals.filter((d) => d.id === input.dealId)
      : deals;
    return {
      assigned: filtered
        .filter((d) => d.lenderId)
        .map((d) => ({
          lenderId: d.lenderId!,
          lenderName: d.primaryCounterpartyName ?? null,
          dealId: d.id,
          dealNumber: d.dealNumber ?? null,
          grossStage: d.grossStage ?? null,
          subStage: d.subStage ?? null,
          stageEnteredAt: d.stageEnteredAt ?? null,
        })),
      limitations: [],
    };
  } catch {
    return {
      assigned: [],
      limitations: [
        "Deal Registry query failed — assigned lender context NOT AVAILABLE (no invented lenders).",
      ],
    };
  }
}

async function loadRegistryEvidence(productCode: string | null): Promise<{
  productRecord: Awaited<ReturnType<typeof productRegistryService.getProductById>> | null;
  matrixLenders: MatrixLenderInput[];
  programsByLender: Map<string, EnterpriseLenderProgramRecord[]>;
  limitations: string[];
}> {
  const limitations: string[] = [];
  if (!isEnterprisePersistencePrisma() || !isDatabaseAvailable()) {
    limitations.push(
      "Enterprise persistence / database unavailable — Product Registry and Product–Lender Matrix NOT AVAILABLE.",
    );
    return {
      productRecord: null,
      matrixLenders: [],
      programsByLender: new Map(),
      limitations,
    };
  }

  let productRecord = null as Awaited<
    ReturnType<typeof productRegistryService.getProductById>
  > | null;
  if (productCode) {
    try {
      const products = await productRegistryService.queryProducts({
        pageSize: 50,
        enabled: true,
      });
      productRecord =
        products.items.find(
          (p) => p.code === productCode || p.label === productCode,
        ) ?? null;
    } catch {
      limitations.push("Product Registry query failed — product context may be limited.");
    }
  }

  let matrixLenders: MatrixLenderInput[] = [];
  const programsByLender = new Map<string, EnterpriseLenderProgramRecord[]>();

  try {
    const lenders = await lenderRegistryService.queryLenders({
      pageSize: 200,
      enabled: true,
      sortBy: "sortOrder",
      sortDir: "asc",
    });
    matrixLenders = lenders.items.map((l) => ({
      lenderId: l.id,
      lenderCode: l.code,
      lenderName: l.label || l.displayName || l.code,
      institutionCategory: l.institutionCategory ?? null,
      productsSupported: l.productsSupported ?? [],
      enabled: l.enabled !== false,
      status: l.status ?? null,
    }));

    if (productCode) {
      const programs = await lenderRegistryService.queryPrograms({
        productCode,
        pageSize: 200,
        enabled: true,
      });
      for (const program of programs.items) {
        const bucket = programsByLender.get(program.lenderId) ?? [];
        bucket.push(program);
        programsByLender.set(program.lenderId, bucket);
      }
    }
  } catch {
    limitations.push(
      "Lender Registry / Product–Lender Matrix query failed — matrix evidence NOT AVAILABLE.",
    );
    matrixLenders = [];
  }

  return { productRecord, matrixLenders, programsByLender, limitations };
}

export async function projectProductLenderIntelligence(input: {
  organizationId: string;
  opportunityRef?: string | null;
  opportunityRow?: Record<string, unknown> | null;
  dealId?: string | null;
  stated?: StatedCreditWorkbenchInput | null;
  documentsReadable?: boolean;
  /** BAT / certification — hydrate assigned lenders from live API when local Prisma is unavailable. */
  assignedLendersOverride?: AssignedLenderInput[] | null;
}): Promise<ChanakyaProductLenderIntelligenceContext> {
  const limitations: string[] = [];

  let opp =
    input.opportunityRow ??
    (input.opportunityRef
      ? await resolveOpportunityRow(input.organizationId, input.opportunityRef)
      : null);

  if (opp) {
    opp = redactCustomerContactPiiForAiContext(opp) as Record<string, unknown>;
  }

  if (!opp?.id) {
    return assembleProductLenderIntelligence({
      productContext: {
        availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
        provenance: "enterprise_opportunity_registry",
      },
      assignedLenders: [],
      matrixEvidence: {
        availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
        mappedLenderCount: 0,
        lenders: [],
        limitations: ["Opportunity scope unavailable."],
      },
      potentialFit: [],
      propertyEvidence: buildPropertyEvidence({ opportunity: null, stated: input.stated }),
      missingInformation: [],
      internalRecommendations: [],
      limitations: ["Opportunity not found within organization scope."],
    });
  }

  const opportunityId = String(opp.id);
  const productCode = resolveProductLibraryCode({
    productCode: typeof opp.productCode === "string" ? opp.productCode : null,
    productLabel: typeof opp.productLabel === "string" ? opp.productLabel : null,
  });

  const transaction: TransactionEvidenceInput = {
    requestedAmount:
      typeof opp.requestedAmount === "number" ? opp.requestedAmount : null,
    employmentTypeCode:
      typeof opp.employmentTypeCode === "string" ? opp.employmentTypeCode : null,
    transactionType:
      typeof opp.transactionType === "string" ? opp.transactionType : null,
    productCode,
    productLabel: typeof opp.productLabel === "string" ? opp.productLabel : null,
    cityLabel: typeof opp.cityLabel === "string" ? opp.cityLabel : null,
    stateLabel:
      typeof opp.stateLabel === "string"
        ? opp.stateLabel
        : typeof opp.stateCode === "string"
          ? opp.stateCode
          : null,
  };

  const { productRecord, matrixLenders, programsByLender, limitations: regLimits } =
    await loadRegistryEvidence(productCode);
  limitations.push(...regLimits);

  const productContext = buildProductContextEvidence({
    opportunityProductCode: transaction.productCode,
    opportunityProductLabel: transaction.productLabel,
    productRecord: productRecord ?? undefined,
  });

  const assignedLoad = input.assignedLendersOverride?.length
    ? { assigned: input.assignedLendersOverride, limitations: [] as string[] }
    : await loadDealsForScope({
        organizationId: input.organizationId,
        opportunityId,
        dealId: input.dealId,
      });
  limitations.push(...assignedLoad.limitations);
  const assignedLenders = buildAssignedLenderAssessments(assignedLoad.assigned);
  const assignedIds = new Set(assignedLoad.assigned.map((a) => a.lenderId));

  const matrixEvidence = buildMatrixMappedLenders({
    productCode,
    lenders: matrixLenders,
  });
  limitations.push(...matrixEvidence.limitations);

  const potentialFit = buildPotentialLenderFitAssessments({
    productCode,
    matrixLenders,
    programsByLender,
    transaction,
    assignedLenderIds: assignedIds,
  });

  const propertyEvidence = buildPropertyEvidence({
    opportunity: opp,
    stated: input.stated,
  });

  const missingInformation = buildMissingInformation({
    transaction,
    stated: input.stated,
    documentsReadable: input.documentsReadable,
  });

  const internalRecommendations = buildInternalLenderFitRecommendations({
    productCode,
    matrixAvailable:
      matrixEvidence.availability === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    missingInformation,
    documentsReadable: input.documentsReadable,
  });

  const matrixDepth = assessMatrixDepth({
    productCode,
    matrixEvidence,
    programsByLender,
  });

  const potentialProgramCount = potentialFit.reduce(
    (sum, row) => sum + (row.programAvailability?.length ?? 0),
    0,
  );

  const transactionSnapshot = buildTransactionLenderSnapshot({
    productContext,
    assignedCount: assignedLenders.length,
    matrixEvidence,
    programAvailabilityCount: potentialProgramCount,
    transaction,
  });

  const assembled = assembleProductLenderIntelligence({
    productContext,
    assignedLenders,
    matrixEvidence,
    potentialFit,
    propertyEvidence,
    missingInformation,
    internalRecommendations,
    matrixDepth,
    transactionSnapshot,
    limitations,
  });

  return redactCustomerContactPiiForAiContext(
    assembled,
  ) as ChanakyaProductLenderIntelligenceContext;
}

export {
  assembleProductLenderIntelligence,
  assessMatrixDepth,
  buildProgramParameterEvidence,
  buildProgramFitExplanation,
  buildTransactionLenderSnapshot,
  programParametersToSnapshot,
  buildProductContextEvidence,
  buildAssignedLenderAssessments,
  buildMatrixMappedLenders,
  buildPotentialLenderFitAssessments,
  buildInternalLenderFitRecommendations,
  assertNoForbiddenLenderFitLanguage,
} from "./product-lender-intelligence-core";
