/**
 * CO-CHANAKYA-003E — Product & Lender intelligence core (verify-friendly).
 * Evidence-first fit assessment — never invents eligibility or approval states.
 */

import { lenderSupportsProduct } from "@/lib/deal-workspace/product-lender-eligibility";
import { resolveCanonicalProductCode } from "@/constants/enterprise-product-master";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";
import type { EnterpriseProductRecord } from "@/types/enterprise-product-registry";
import { resolveOpportunityLoanPurpose } from "@/lib/enterprise-opportunity/resolve-loan-purpose";
import {
  CHANAKYA_FIELD_AVAILABILITY,
  type ChanakyaFieldAvailability,
  type ChanakyaInternalLenderFitRecommendation,
  type ChanakyaLenderFitAssessment,
  type ChanakyaLenderFitReason,
  type ChanakyaLenderFitStatus,
  type ChanakyaMatrixDepthEvidence,
  type ChanakyaPersistedProgramFieldEvidence,
  type ChanakyaProductContextEvidence,
  type ChanakyaProductLenderIntelligenceContext,
  type ChanakyaProgramAvailabilityEvidence,
  type ChanakyaProgramFitExplanation,
  type ChanakyaPropertyEvidence,
  type ChanakyaTransactionLenderSnapshot,
} from "@/types/chanakya-enterprise-read-context";

const FORBIDDEN_FIT_TERMS =
  /\b(approved|eligible|guaranteed|best lender|best_lender|suitable for the borrower)\b/i;

export function assertNoForbiddenLenderFitLanguage(text: string): boolean {
  return !FORBIDDEN_FIT_TERMS.test(text);
}

export type AssignedLenderInput = {
  lenderId: string;
  lenderName?: string | null;
  lenderCode?: string | null;
  dealId?: string | null;
  dealNumber?: string | null;
  grossStage?: string | null;
  subStage?: string | null;
  stageEnteredAt?: string | Date | null;
};

export type MatrixLenderInput = {
  lenderId: string;
  lenderCode?: string | null;
  lenderName?: string | null;
  institutionCategory?: string | null;
  productsSupported?: string[] | null;
  enabled?: boolean;
  status?: string | null;
};

export type StatedCreditWorkbenchInput = {
  statedIncomeMonthly?: string | null;
  statedObligations?: string | null;
  statedTurnover?: string | null;
  statedBusinessVintage?: string | null;
  statedConstitution?: string | null;
  statedPropertyType?: string | null;
  statedPropertyValue?: string | null;
  statedPropertyLocation?: string | null;
  statedNatureOfBusiness?: string | null;
};

export type TransactionEvidenceInput = {
  requestedAmount?: number | null;
  employmentTypeCode?: string | null;
  transactionType?: string | null;
  productCode?: string | null;
  productLabel?: string | null;
  cityLabel?: string | null;
  stateLabel?: string | null;
};

/** Business parameters that constitute matrix/program depth (identity + lifecycle excluded). */
const PROGRAM_DEPTH_FIELD_KEYS = [
  "roiPercent",
  "minRoiPercent",
  "maxRoiPercent",
  "maxLtvPercent",
  "maxFoirPercent",
  "maxDbrPercent",
  "maxTenureMonths",
  "minFundingAmount",
  "maxFundingAmount",
  "eligibleStates",
  "eligibleCities",
] as const;

export function buildProgramParameterEvidence(
  program: EnterpriseLenderProgramRecord,
): ChanakyaPersistedProgramFieldEvidence {
  const populatedFields: string[] = [];
  const noteField = (key: string, value: unknown) => {
    if (value != null && value !== "" && !(Array.isArray(value) && value.length === 0)) {
      populatedFields.push(key);
    }
  };

  noteField("roiPercent", program.roiPercent);
  noteField("minRoiPercent", program.minRoiPercent);
  noteField("maxRoiPercent", program.maxRoiPercent);
  noteField("maxLtvPercent", program.maxLtvPercent);
  noteField("maxFoirPercent", program.maxFoirPercent);
  noteField("maxDbrPercent", program.maxDbrPercent);
  noteField("maxTenureMonths", program.maxTenureMonths);
  noteField("minFundingAmount", program.minFundingAmount);
  noteField("maxFundingAmount", program.maxFundingAmount);
  noteField("eligibleStates", program.eligibleStates);
  noteField("eligibleCities", program.eligibleCities);
  noteField("lifecycleStatus", program.lifecycleStatus);

  const depthFields = populatedFields.filter((k) =>
    (PROGRAM_DEPTH_FIELD_KEYS as readonly string[]).includes(k),
  );

  return {
    programId: program.id,
    programCode: program.code,
    programLabel: program.label,
    ticketMin: program.minFundingAmount ?? null,
    ticketMax: program.maxFundingAmount ?? null,
    roiPercent: program.roiPercent ?? null,
    minRoiPercent: program.minRoiPercent ?? null,
    maxRoiPercent: program.maxRoiPercent ?? null,
    maxLtvPercent: program.maxLtvPercent ?? null,
    maxFoirPercent: program.maxFoirPercent ?? null,
    maxDbrPercent: program.maxDbrPercent ?? null,
    maxTenureMonths: program.maxTenureMonths ?? null,
    eligibleStates: program.eligibleStates ?? null,
    eligibleCities: program.eligibleCities ?? null,
    lifecycleStatus: program.lifecycleStatus ?? null,
    populatedFields,
    availability:
      depthFields.length > 0
        ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
        : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
    provenance: "enterprise_lender_program",
  };
}

export function programParametersToSnapshot(
  evidence: ChanakyaPersistedProgramFieldEvidence | null | undefined,
): Record<string, unknown> | null {
  if (!evidence || evidence.availability !== CHANAKYA_FIELD_AVAILABILITY.AVAILABLE) {
    return null;
  }
  const out: Record<string, unknown> = {
    programId: evidence.programId,
    programCode: evidence.programCode,
    programLabel: evidence.programLabel,
  };
  const assign = (key: string, value: unknown) => {
    if (value != null && value !== "" && !(Array.isArray(value) && value.length === 0)) {
      out[key] = value;
    }
  };
  assign("roiPercent", evidence.roiPercent);
  assign("minRoiPercent", evidence.minRoiPercent);
  assign("maxRoiPercent", evidence.maxRoiPercent);
  assign("maxLtvPercent", evidence.maxLtvPercent);
  assign("maxFoirPercent", evidence.maxFoirPercent);
  assign("maxDbrPercent", evidence.maxDbrPercent);
  assign("maxTenureMonths", evidence.maxTenureMonths);
  assign("minFundingAmount", evidence.ticketMin);
  assign("maxFundingAmount", evidence.ticketMax);
  assign("eligibleStates", evidence.eligibleStates);
  assign("eligibleCities", evidence.eligibleCities);
  assign("lifecycleStatus", evidence.lifecycleStatus);
  return Object.keys(out).length > 3 ? out : null;
}

function programHasParameterDepth(program: EnterpriseLenderProgramRecord): boolean {
  const evidence = buildProgramParameterEvidence(program);
  return evidence.populatedFields.some((k) =>
    (PROGRAM_DEPTH_FIELD_KEYS as readonly string[]).includes(k),
  );
}

function resolveRelationshipStatus(lender: MatrixLenderInput): "active" | "inactive" {
  const active =
    lender.enabled !== false && String(lender.status ?? "").toLowerCase() !== "inactive";
  return active ? "active" : "inactive";
}

export function buildProgramFitExplanation(input: {
  programs: EnterpriseLenderProgramRecord[];
  transaction: TransactionEvidenceInput;
  matrixMapped: boolean;
}): ChanakyaProgramFitExplanation {
  const whyMayFit: string[] = [];
  const supportingTransactionEvidence: string[] = [];
  const missingForStrongerAssessment: string[] = [];

  if (input.matrixMapped) {
    whyMayFit.push(
      "Product–Lender Matrix lists an active productsSupported relationship for this product.",
    );
  }

  for (const program of input.programs) {
    const params = buildProgramParameterEvidence(program);
    if (params.populatedFields.length === 0) continue;
    whyMayFit.push(
      `Persisted lender program "${program.label}" carries parameter evidence in Lender Program Registry.`,
    );
    for (const key of params.populatedFields.filter((k) =>
      (PROGRAM_DEPTH_FIELD_KEYS as readonly string[]).includes(k),
    )) {
      if (key === "minFundingAmount" || key === "maxFundingAmount") {
        whyMayFit.push(`Program ticket bounds are persisted (${key}).`);
      }
      if (key === "maxLtvPercent") {
        whyMayFit.push("Program maximum LTV is persisted in registry.");
      }
      if (key === "maxFoirPercent" || key === "maxDbrPercent") {
        whyMayFit.push(`Program ${key === "maxFoirPercent" ? "FOIR" : "DBR"} ceiling is persisted.`);
      }
      if (key === "eligibleStates" || key === "eligibleCities") {
        whyMayFit.push("Program geography constraints are persisted.");
      }
    }
  }

  if (input.transaction.productCode || input.transaction.productLabel) {
    supportingTransactionEvidence.push(
      `Transaction product: ${input.transaction.productLabel ?? input.transaction.productCode}.`,
    );
  }
  if (input.transaction.requestedAmount && input.transaction.requestedAmount > 0) {
    supportingTransactionEvidence.push(
      `Stated required amount: ${input.transaction.requestedAmount}.`,
    );
    for (const program of input.programs) {
      const ticket = ticketSizeEvidence(input.transaction.requestedAmount, program);
      if (ticket) supportingTransactionEvidence.push(ticket);
    }
  }
  if (input.transaction.employmentTypeCode?.trim()) {
    supportingTransactionEvidence.push(
      `Employment / borrower type captured: ${input.transaction.employmentTypeCode}.`,
    );
  }
  if (input.transaction.cityLabel?.trim() || input.transaction.stateLabel?.trim()) {
    supportingTransactionEvidence.push(
      `Transaction geography: ${[input.transaction.cityLabel, input.transaction.stateLabel]
        .filter(Boolean)
        .join(", ")}.`,
    );
  }

  if (!input.transaction.requestedAmount || input.transaction.requestedAmount <= 0) {
    missingForStrongerAssessment.push("Required amount is not captured on the Opportunity.");
  }
  if (!input.transaction.employmentTypeCode?.trim()) {
    missingForStrongerAssessment.push("Employment / borrower type is not captured.");
  }
  if (input.programs.length === 0) {
    missingForStrongerAssessment.push(
      "No persisted lender program records for this product in Lender Program Registry.",
    );
  } else if (!input.programs.some(programHasParameterDepth)) {
    missingForStrongerAssessment.push(
      "Matrix mapping exists but lender program parameter depth is insufficient in registry.",
    );
  }

  return {
    whyMayFit: [...new Set(whyMayFit)],
    supportingTransactionEvidence: [...new Set(supportingTransactionEvidence)],
    missingForStrongerAssessment: [...new Set(missingForStrongerAssessment)],
  };
}

export function assessMatrixDepth(input: {
  productCode: string | null;
  matrixEvidence: ChanakyaProductLenderIntelligenceContext["matrixEvidence"];
  programsByLender: Map<string, EnterpriseLenderProgramRecord[]>;
}): ChanakyaMatrixDepthEvidence {
  if (!input.productCode) {
    return {
      status: "NOT_AVAILABLE",
      mappedLenderCount: 0,
      lendersWithPersistedProgramParameters: 0,
      statement:
        "Product code unavailable — Product–Lender Matrix depth cannot be assessed.",
      limitations: ["Transaction product code NOT AVAILABLE."],
    };
  }

  if (
    input.matrixEvidence.availability !== CHANAKYA_FIELD_AVAILABILITY.AVAILABLE ||
    input.matrixEvidence.mappedLenderCount === 0
  ) {
    return {
      status: "NOT_AVAILABLE",
      mappedLenderCount: 0,
      lendersWithPersistedProgramParameters: 0,
      statement: `Product–Lender Matrix mapping NOT AVAILABLE for ${input.productCode}.`,
      limitations: input.matrixEvidence.limitations,
    };
  }

  let lendersWithParams = 0;
  for (const lender of input.matrixEvidence.lenders) {
    const programs = (input.programsByLender.get(lender.lenderId) ?? []).filter(
      (p) => !p.isDeleted && p.enabled !== false,
    );
    if (programs.some(programHasParameterDepth)) lendersWithParams += 1;
  }

  if (lendersWithParams === 0) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      mappedLenderCount: input.matrixEvidence.mappedLenderCount,
      lendersWithPersistedProgramParameters: 0,
      statement: `Matrix lists ${input.matrixEvidence.mappedLenderCount} lender relationship(s) for ${input.productCode}, but persisted program parameter depth is insufficient.`,
      limitations: [
        "Product–Lender Matrix relationship exists without sufficient Lender Program Registry parameters.",
      ],
    };
  }

  return {
    status: "AVAILABLE",
    mappedLenderCount: input.matrixEvidence.mappedLenderCount,
    lendersWithPersistedProgramParameters: lendersWithParams,
    statement: `${input.matrixEvidence.mappedLenderCount} matrix-mapped lender(s); ${lendersWithParams} with persisted program parameters.`,
    limitations: [],
  };
}

export function buildTransactionLenderSnapshot(input: {
  productContext: ChanakyaProductContextEvidence;
  assignedCount: number;
  matrixEvidence: ChanakyaProductLenderIntelligenceContext["matrixEvidence"];
  programAvailabilityCount: number;
  transaction: TransactionEvidenceInput;
}): ChanakyaTransactionLenderSnapshot {
  const geography = [input.transaction.cityLabel, input.transaction.stateLabel]
    .filter(Boolean)
    .join(", ");
  const hasProduct =
    input.productContext.availability === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE;

  return {
    productCode: input.productContext.productCode ?? null,
    productName: input.productContext.productName ?? null,
    assignedLenderCount: input.assignedCount,
    matrixSupportedLenderCount: input.matrixEvidence.mappedLenderCount,
    programAvailabilityCount: input.programAvailabilityCount,
    isSecured: input.productContext.isSecured ?? null,
    transactionGeography: geography || null,
    availability:
      hasProduct || input.assignedCount > 0 || input.matrixEvidence.mappedLenderCount > 0
        ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
        : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
    provenance: "chanakya_product_lender_intelligence",
  };
}

function stageAgeDays(stageEnteredAt?: string | Date | null): number | null {
  if (!stageEnteredAt) return null;
  const at = stageEnteredAt instanceof Date ? stageEnteredAt : new Date(stageEnteredAt);
  if (!Number.isFinite(at.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - at.getTime()) / 86_400_000));
}

function ticketSizeEvidence(
  requestedAmount: number | null | undefined,
  program: EnterpriseLenderProgramRecord | null | undefined,
): string | null {
  if (!requestedAmount || requestedAmount <= 0 || !program) return null;
  const min = program.minFundingAmount;
  const max = program.maxFundingAmount;
  if (min != null && requestedAmount < min) {
    return `Persisted program minFundingAmount (${min}) exceeds stated required amount (${requestedAmount}) — informational only, not an eligibility verdict.`;
  }
  if (max != null && requestedAmount > max) {
    return `Stated required amount (${requestedAmount}) exceeds persisted program maxFundingAmount (${max}) — informational only, not an eligibility verdict.`;
  }
  if (min != null || max != null) {
    return "Stated required amount falls within persisted program ticket-size bounds where both are available.";
  }
  return null;
}

export function buildProductContextEvidence(input: {
  opportunityProductCode?: string | null;
  opportunityProductLabel?: string | null;
  productRecord?: EnterpriseProductRecord | null;
}): ChanakyaProductContextEvidence {
  const code =
    resolveCanonicalProductCode(
      input.productRecord?.code ?? input.opportunityProductCode,
    ) ?? input.opportunityProductCode ?? null;

  if (!code && !input.opportunityProductLabel) {
    return {
      availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      provenance: "enterprise_product_registry",
    };
  }

  return {
    productId: input.productRecord?.id ?? null,
    productCode: code,
    productName:
      input.productRecord?.label ?? input.opportunityProductLabel ?? null,
    productCategory: input.productRecord?.categoryId ?? null,
    productType: input.productRecord?.groupId ?? null,
    transactionProduct: input.opportunityProductLabel ?? code,
    productStatus: input.productRecord?.status ?? null,
    isSecured: input.productRecord?.isSecured ?? null,
    availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    provenance: input.productRecord
      ? "enterprise_product_registry"
      : "enterprise_opportunity_registry",
  };
}

export function buildPropertyEvidence(input: {
  opportunity?: Record<string, unknown> | null;
  stated?: StatedCreditWorkbenchInput | null;
}): ChanakyaPropertyEvidence {
  const ext =
    input.opportunity?.lendingExtension &&
    typeof input.opportunity.lendingExtension === "object"
      ? (input.opportunity.lendingExtension as Record<string, unknown>)
      : null;

  const propertyType =
    input.stated?.statedPropertyType?.trim() ||
    (typeof ext?.propertyType === "string" ? ext.propertyType.trim() : null) ||
    null;
  const location =
    input.stated?.statedPropertyLocation?.trim() ||
    (typeof ext?.propertyLocation === "string" ? ext.propertyLocation.trim() : null) ||
    (typeof input.opportunity?.cityLabel === "string"
      ? input.opportunity.cityLabel.trim()
      : null) ||
    null;
  const statedValue =
    input.stated?.statedPropertyValue?.trim() ||
    (ext?.propertyValue != null ? String(ext.propertyValue) : null) ||
    null;
  const existingLoanObligation =
    typeof ext?.outstandingLoanAmount === "number" ||
    typeof ext?.outstandingLoanAmount === "string"
      ? String(ext.outstandingLoanAmount)
      : input.stated?.statedObligations?.trim() || null;
  const purpose = resolveOpportunityLoanPurpose(input.opportunity ?? null);

  const hasAny = Boolean(propertyType || location || statedValue || purpose);
  return {
    propertyType,
    location,
    statedValue,
    existingLoanObligation,
    purpose,
    availability: hasAny
      ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
      : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
    provenance: input.stated?.statedPropertyType
      ? "credit_workbench_stated + enterprise_opportunity_registry"
      : "enterprise_opportunity_registry",
    note: hasAny
      ? "Stated / captured property facts only — no independent valuation or security acceptability claim."
      : "No provenance-backed property information captured for this transaction.",
  };
}

export function buildAssignedLenderAssessments(
  assigned: AssignedLenderInput[],
): ChanakyaLenderFitAssessment[] {
  return assigned
    .filter((a) => a.lenderId)
    .map((a) => {
      const stageLabel = [a.grossStage, a.subStage].filter(Boolean).join(" / ") || null;
      const age = stageAgeDays(a.stageEnteredAt);
      const reasons: ChanakyaLenderFitReason[] = [
        {
          statement: "Lender is currently assigned on an Enterprise Deal for this transaction.",
          source: "enterprise_deal_registry",
          availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
        },
      ];
      if (stageLabel) {
        reasons.push({
          statement: `Current lender stage: ${stageLabel}.`,
          source: "enterprise_deal_registry",
          availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
        });
      }
      if (age != null) {
        reasons.push({
          statement: `Lender stage age: ${age} day(s) since stageEnteredAt.`,
          source: "enterprise_deal_registry",
          availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
        });
      }
      return {
        lenderId: a.lenderId,
        lenderName: a.lenderName ?? null,
        lenderCode: a.lenderCode ?? null,
        fitStatus: "CURRENTLY_ASSIGNED" as ChanakyaLenderFitStatus,
        dealId: a.dealId ?? null,
        dealNumber: a.dealNumber ?? null,
        currentStage: stageLabel,
        stageAgeDays: age,
        reasons,
        supportingEvidence: reasons.map((r) => r.statement),
        limitations: [],
        provenance: ["enterprise_deal_registry"],
      };
    });
}

export function buildMatrixMappedLenders(input: {
  productCode: string | null;
  lenders: MatrixLenderInput[];
}): ChanakyaProductLenderIntelligenceContext["matrixEvidence"] {
  if (!input.productCode) {
    return {
      availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      mappedLenderCount: 0,
      lenders: [],
      limitations: ["Transaction product code unavailable — matrix mapping cannot be assessed."],
    };
  }

  const mapped = input.lenders.filter((l) =>
    lenderSupportsProduct(l.productsSupported, input.productCode),
  );

  if (mapped.length === 0) {
    return {
      availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      productCode: input.productCode,
      mappedLenderCount: 0,
      lenders: [],
      limitations: [
        "No Product–Lender Matrix relationship found for this product code in Lender Registry productsSupported.",
      ],
    };
  }

  return {
    availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    productCode: input.productCode,
    mappedLenderCount: mapped.length,
    lenders: mapped.map((l) => ({
      lenderId: l.lenderId,
      lenderCode: l.lenderCode ?? null,
      lenderName: l.lenderName ?? null,
      productsSupported: l.productsSupported ?? [],
      activeRelationship:
        l.enabled !== false &&
        String(l.status ?? "").toLowerCase() !== "inactive",
      provenance: "enterprise_lender_registry.productsSupported",
    })),
    limitations: [],
  };
}

export function buildPotentialLenderFitAssessments(input: {
  productCode: string | null;
  matrixLenders: MatrixLenderInput[];
  programsByLender: Map<string, EnterpriseLenderProgramRecord[]>;
  transaction: TransactionEvidenceInput;
  assignedLenderIds: Set<string>;
}): ChanakyaLenderFitAssessment[] {
  if (!input.productCode) return [];

  const rows: ChanakyaLenderFitAssessment[] = [];
  for (const lender of input.matrixLenders) {
    if (input.assignedLenderIds.has(lender.lenderId)) continue;
    if (!lenderSupportsProduct(lender.productsSupported, input.productCode)) continue;

    const programs = (input.programsByLender.get(lender.lenderId) ?? []).filter(
      (p) => !p.isDeleted && p.enabled !== false,
    );
    const programAvailability: ChanakyaProgramAvailabilityEvidence[] = programs.map(
      (program) => ({
        programId: program.id,
        programCode: program.code,
        programLabel: program.label,
        parameters: buildProgramParameterEvidence(program),
        relationshipStatus: resolveRelationshipStatus(lender),
        provenance: "enterprise_lender_program",
      }),
    );
    const programsWithDepth = programs.filter(programHasParameterDepth);
    const reasons: ChanakyaLenderFitReason[] = [
      {
        statement:
          "Product–Lender Matrix shows an active relationship for this product (productsSupported).",
        source: "enterprise_lender_registry.productsSupported",
        availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
      },
    ];
    const supporting: string[] = [reasons[0]!.statement];
    const limitations: string[] = [];
    let fitStatus: ChanakyaLenderFitStatus = "POTENTIALLY_RELEVANT";

    if (programsWithDepth.length > 0) {
      for (const program of programsWithDepth) {
        reasons.push({
          statement: `Lender program "${program.label}" has persisted parameter evidence in Lender Program Registry.`,
          source: "enterprise_lender_program",
          availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
        });
        supporting.push(
          `Persisted program parameters available for "${program.label}" (${buildProgramParameterEvidence(program).populatedFields.filter((k) => (PROGRAM_DEPTH_FIELD_KEYS as readonly string[]).includes(k)).join(", ")}).`,
        );
      }
      for (const program of programsWithDepth) {
        const ticket = ticketSizeEvidence(input.transaction.requestedAmount, program);
        if (ticket) supporting.push(ticket);
      }
    } else if (programs.length > 0) {
      fitStatus = "INSUFFICIENT_EVIDENCE";
      limitations.push(
        "Matrix mapping exists and program record(s) are persisted, but program parameter depth is insufficient in registry.",
      );
    } else {
      fitStatus = "INSUFFICIENT_EVIDENCE";
      limitations.push(
        "Matrix mapping exists but no active lender program records are persisted for this product.",
      );
    }

    const programMatch =
      programsWithDepth.length > 0 || programs.length > 0
        ? buildProgramFitExplanation({
            programs,
            transaction: input.transaction,
            matrixMapped: true,
          })
        : buildProgramFitExplanation({
            programs: [],
            transaction: input.transaction,
            matrixMapped: true,
          });

    const legacySnapshot =
      programsWithDepth.length > 0
        ? programParametersToSnapshot(buildProgramParameterEvidence(programsWithDepth[0]!))
        : null;

    rows.push({
      lenderId: lender.lenderId,
      lenderName: lender.lenderName ?? null,
      lenderCode: lender.lenderCode ?? null,
      institutionCategory: lender.institutionCategory ?? null,
      fitStatus,
      reasons,
      supportingEvidence: supporting,
      limitations,
      programParameters: legacySnapshot,
      programAvailability: programAvailability.length ? programAvailability : undefined,
      programMatch,
      relationshipStatus: resolveRelationshipStatus(lender),
      provenance: [
        "enterprise_lender_registry.productsSupported",
        ...(programsWithDepth.length ? ["enterprise_lender_program"] : []),
      ],
    });
  }
  return rows;
}

export function buildMissingInformation(input: {
  transaction: TransactionEvidenceInput;
  stated?: StatedCreditWorkbenchInput | null;
  documentsReadable?: boolean;
}): ChanakyaProductLenderIntelligenceContext["missingInformation"] {
  const rows: ChanakyaProductLenderIntelligenceContext["missingInformation"] = [];
  const push = (field: string, statement: string) => {
    rows.push({
      field,
      statement,
      availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
    });
  };

  if (!input.transaction.requestedAmount || input.transaction.requestedAmount <= 0) {
    push("requiredAmount", "Required amount is not captured on the Opportunity.");
  }
  if (!input.transaction.employmentTypeCode?.trim()) {
    push("employmentType", "Employment / borrower type is not captured.");
  }
  if (!input.stated?.statedTurnover?.trim()) {
    push("turnover", "Turnover evidence is unavailable for lender-fit assessment.");
  }
  if (!input.stated?.statedIncomeMonthly?.trim()) {
    push("income", "Stated monthly income is unavailable.");
  }
  if (!input.stated?.statedObligations?.trim()) {
    push("existingEmi", "Existing EMI / obligation information is unavailable.");
  }
  if (!input.stated?.statedConstitution?.trim()) {
    push("constitution", "Borrower constitution is unavailable.");
  }
  if (!input.stated?.statedBusinessVintage?.trim()) {
    push("businessVintage", "Business vintage is unavailable.");
  }
  if (!input.stated?.statedPropertyValue?.trim()) {
    push("propertyValue", "Property value is unavailable.");
  }
  if (input.documentsReadable === false) {
    push(
      "bankingDocuments",
      "Bank statements are not durably readable for this transaction.",
    );
  }
  return rows;
}

export function buildInternalLenderFitRecommendations(input: {
  productCode: string | null;
  matrixAvailable: boolean;
  missingInformation: ChanakyaProductLenderIntelligenceContext["missingInformation"];
  documentsReadable?: boolean;
}): ChanakyaInternalLenderFitRecommendation[] {
  const out: ChanakyaInternalLenderFitRecommendation[] = [];

  for (const gap of input.missingInformation.slice(0, 8)) {
    out.push({
      id: `missing:${gap.field}`,
      statement: `Chanakya would assess lender fit more strongly if ${gap.field} evidence were available: ${gap.statement}`,
      source: "chanakya_product_lender_intelligence",
      internalOnly: true,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  }

  if (input.documentsReadable === false) {
    out.push({
      id: "banking_readable",
      statement:
        "Bank statements are not durably readable for this transaction — internal lender-fit assessment remains limited.",
      source: "chanakya_document_intelligence",
      internalOnly: true,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  }

  if (input.matrixAvailable && input.missingInformation.length > 0) {
    out.push({
      id: "matrix_with_gaps",
      statement:
        "Product–Lender Matrix confirms lender relationship(s), but borrower financial evidence is insufficient to assess program fit more strongly.",
      source: "enterprise_lender_registry.productsSupported",
      internalOnly: true,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  }

  if (!input.productCode) {
    out.push({
      id: "no_product",
      statement:
        "Product context is NOT AVAILABLE — lender-fit assessment cannot proceed beyond assigned lenders.",
      source: "enterprise_opportunity_registry",
      internalOnly: true,
      availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
    });
  }

  return out.filter((r) => assertNoForbiddenLenderFitLanguage(r.statement));
}

export function buildProductLenderSummary(input: {
  productCode: string | null;
  assignedCount: number;
  potentialCount: number;
  matrixAvailable: boolean;
}): string {
  if (!input.productCode && input.assignedCount === 0) {
    return "Product & Lender intelligence: product context and lender assignment are NOT AVAILABLE.";
  }
  const parts: string[] = [];
  if (input.assignedCount) {
    parts.push(`${input.assignedCount} lender(s) currently assigned on Deal(s)`);
  }
  if (input.matrixAvailable && input.potentialCount) {
    parts.push(
      `${input.potentialCount} additional lender(s) potentially relevant via Product–Lender Matrix mapping`,
    );
  } else if (!input.matrixAvailable && input.productCode) {
    parts.push("Product–Lender Matrix mapping NOT AVAILABLE for this product");
  }
  return parts.length
    ? `Product & Lender intelligence: ${parts.join("; ")}. Evidence-first — not underwriting or approval.`
    : "Product & Lender intelligence: assignment and matrix evidence reviewed; no additional fit rows emitted.";
}

export function assembleProductLenderIntelligence(input: {
  productContext: ChanakyaProductContextEvidence;
  assignedLenders: ChanakyaLenderFitAssessment[];
  matrixEvidence: ChanakyaProductLenderIntelligenceContext["matrixEvidence"];
  potentialFit: ChanakyaLenderFitAssessment[];
  propertyEvidence: ChanakyaPropertyEvidence;
  missingInformation: ChanakyaProductLenderIntelligenceContext["missingInformation"];
  internalRecommendations: ChanakyaInternalLenderFitRecommendation[];
  matrixDepth?: ChanakyaMatrixDepthEvidence;
  transactionSnapshot?: ChanakyaTransactionLenderSnapshot;
  limitations?: string[];
}): ChanakyaProductLenderIntelligenceContext {
  const lenderFit = [...input.assignedLenders, ...input.potentialFit];
  const programAvailabilityCount = lenderFit.reduce(
    (sum, row) => sum + (row.programAvailability?.length ?? 0),
    0,
  );
  const availability: ChanakyaFieldAvailability =
    lenderFit.length > 0 ||
    input.productContext.availability === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE ||
    input.matrixEvidence.availability === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
      ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
      : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE;

  const matrixDepth =
    input.matrixDepth ??
    ({
      status: "NOT_AVAILABLE" as const,
      mappedLenderCount: input.matrixEvidence.mappedLenderCount,
      lendersWithPersistedProgramParameters: 0,
      statement: "Matrix depth not assessed.",
      limitations: [],
    } satisfies ChanakyaMatrixDepthEvidence);

  const transactionSnapshot =
    input.transactionSnapshot ??
    buildTransactionLenderSnapshot({
      productContext: input.productContext,
      assignedCount: input.assignedLenders.length,
      matrixEvidence: input.matrixEvidence,
      programAvailabilityCount,
      transaction: {
        productCode: input.productContext.productCode ?? null,
        productLabel: input.productContext.productName ?? null,
      },
    });

  return {
    availability,
    readOnly: true,
    productContext: input.productContext,
    assignedLenders: input.assignedLenders,
    matrixEvidence: input.matrixEvidence,
    matrixDepth,
    transactionSnapshot,
    lenderFit,
    propertyEvidence: input.propertyEvidence,
    missingInformation: input.missingInformation,
    internalRecommendations: input.internalRecommendations,
    summary: buildProductLenderSummary({
      productCode: input.productContext.productCode ?? null,
      assignedCount: input.assignedLenders.length,
      potentialCount: input.potentialFit.length,
      matrixAvailable:
        input.matrixEvidence.availability === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    }),
    limitations: input.limitations ?? [
      "Product & Lender intelligence is read-only and evidence-first — not underwriting, approval, or a new recommendation engine.",
      "Lender fit uses Product Registry, Lender Registry, Product–Lender Matrix, and Deal assignment only.",
      "Internal recommendations are CHANAKYA guidance and must not appear in lender-facing proposals.",
    ],
    provenance: [
      "enterprise_product_registry",
      "enterprise_lender_registry",
      "enterprise_lender_program",
      "enterprise_lender_registry.productsSupported",
      "enterprise_deal_registry",
      "enterprise_opportunity_registry",
      "credit_workbench_stated",
    ],
  };
}
