import { z } from "zod";
import { ExactDecimalError, parseExactMoney, parseExactPercent } from "@/lib/product-programme-operations/money";
import {
  ASSESSMENT_CIBIL_KINDS,
  ASSESSMENT_CERTAINTIES,
  ASSESSMENT_CONTRIBUTION_DECISIONS,
  ASSESSMENT_EXPECTED_CIBIL_BANDS,
  ASSESSMENT_FACT_STATES,
  ASSESSMENT_FORBIDDEN_TRANSACTION_TYPES,
  ASSESSMENT_INCOME_BASIS_SALARY,
  ASSESSMENT_OBLIGATION_SCOPES,
  ASSESSMENT_PRODUCT_CODES,
  ASSESSMENT_PROPERTY_VALUE_DECLARATIONS,
  ASSESSMENT_SOURCE_CHANNELS,
  OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION,
  type AssessmentFact,
  type OpportunityAssessmentFactsV1,
} from "@/types/opportunity-assessment";

const ZERO_MONEY = "0.00";

function issue(ctx: z.RefinementCtx, path: Array<string | number>, message: string) {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
}

function exactMoneyValue(field: string) {
  return z.union([z.string(), z.null()]).superRefine((value, ctx) => {
    if (value == null) return;
    try {
      const parsed = parseExactMoney(value, field);
      if (parsed == null) issue(ctx, [], `${field} must be an exact rupee string.`);
    } catch (error) {
      issue(ctx, [], error instanceof ExactDecimalError ? error.message : `${field} must be an exact rupee string.`);
    }
  });
}

function exactPercentValue(field: string) {
  return z.union([z.string(), z.null()]).superRefine((value, ctx) => {
    if (value == null) return;
    try {
      const parsed = parseExactPercent(value, field);
      if (parsed == null) issue(ctx, [], `${field} must be an exact percent string.`);
    } catch (error) {
      issue(ctx, [], error instanceof ExactDecimalError ? error.message : `${field} must be an exact percent string.`);
    }
  });
}

const conflictCandidateSchema = z.object({
  value: z.unknown().nullable(),
  sourceChannel: z.enum(ASSESSMENT_SOURCE_CHANNELS),
  sourceEntityId: z.string().nullable().optional(),
  sourceFieldKey: z.string().nullable().optional(),
});

function assessmentFactSchema<Value extends z.ZodTypeAny>(valueSchema: Value, field: string) {
  return z
    .object({
      value: valueSchema.nullable(),
      state: z.enum(ASSESSMENT_FACT_STATES),
      sourceChannel: z.enum(ASSESSMENT_SOURCE_CHANNELS).nullable(),
      sourceEntityType: z.string().nullable(),
      sourceEntityId: z.string().nullable(),
      sourceFieldKey: z.string().nullable(),
      sourceUpdatedAt: z.string().nullable(),
      capturedByUserId: z.string().nullable(),
      capturedAt: z.string().nullable(),
      effectiveAt: z.string().nullable(),
      confirmedByUserId: z.string().nullable(),
      confirmedAt: z.string().nullable(),
      certainty: z.enum(ASSESSMENT_CERTAINTIES).nullable().optional(),
      knownZeroDeclared: z.boolean().optional(),
      evidenceRef: z.string().nullable().optional(),
      conflictCandidates: z.array(conflictCandidateSchema).optional(),
    })
    .superRefine((fact, ctx) => {
      if (fact.state === "missing" && fact.value != null) {
        issue(ctx, ["value"], `${field} cannot have a value while state is missing.`);
      }
      if (fact.state === "explicitly_unknown" && fact.value != null) {
        issue(ctx, ["value"], `${field} cannot carry a resolved value while explicitly unknown.`);
      }
      if ((fact.state === "known" || fact.state === "unconfirmed") && fact.value == null && fact.knownZeroDeclared !== true) {
        issue(ctx, ["value"], `${field} requires a value when state is ${fact.state}.`);
      }
      if (fact.state === "unsupported" && fact.sourceChannel === "SYSTEM_DERIVED" && field.includes("monthlyIncome")) {
        issue(ctx, ["sourceChannel"], "Self-employed income methodology cannot be system-derived.");
      }
    });
}

const stringFact = (field: string) => assessmentFactSchema(z.string(), field);
const moneyFact = (field: string) => assessmentFactSchema(exactMoneyValue(field), field);
const percentFact = (field: string) => assessmentFactSchema(exactPercentValue(field), field);
const intFact = (field: string) => assessmentFactSchema(z.number().int(), field);

function isZeroMoney(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    return parseExactMoney(value, "zero") === ZERO_MONEY;
  } catch {
    return false;
  }
}

function isPositiveMoney(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const parsed = parseExactMoney(value, "positive");
    return parsed != null && parsed !== ZERO_MONEY && !parsed.startsWith("-");
  } catch {
    return false;
  }
}

export const opportunityAssessmentFactsSchema = z
  .object({
    schemaVersion: z.literal(OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION),
    borrower: z.object({
      residency: stringFact("borrower.residency"),
      dateOfBirth: stringFact("borrower.dateOfBirth"),
      employmentTypeCode: stringFact("borrower.employmentTypeCode"),
      employmentFamily: assessmentFactSchema(
        z.enum(["salaried", "self_employed", "unknown"]),
        "borrower.employmentFamily",
      ),
      constitution: stringFact("borrower.constitution"),
      journeyCity: stringFact("borrower.journeyCity"),
      journeyState: stringFact("borrower.journeyState"),
    }).strict(),
    incomeAndObligations: z.object({
      monthlyIncome: moneyFact("incomeAndObligations.monthlyIncome"),
      incomeBasis: stringFact("incomeAndObligations.incomeBasis"),
      incomeEffectiveAt: stringFact("incomeAndObligations.incomeEffectiveAt"),
      existingMonthlyObligations: moneyFact("incomeAndObligations.existingMonthlyObligations"),
      obligationScope: assessmentFactSchema(
        z.enum(ASSESSMENT_OBLIGATION_SCOPES),
        "incomeAndObligations.obligationScope",
      ),
      requestedTenureMonths: intFact("incomeAndObligations.requestedTenureMonths"),
    }).strict(),
    loanRequirement: z.object({
      productCode: assessmentFactSchema(z.enum(ASSESSMENT_PRODUCT_CODES), "loanRequirement.productCode"),
      transactionType: stringFact("loanRequirement.transactionType"),
      requestedAmount: moneyFact("loanRequirement.requestedAmount"),
    }).strict(),
    property: z.object({
      propertyValue: moneyFact("property.propertyValue"),
      valueDeclaration: assessmentFactSchema(
        z.enum(ASSESSMENT_PROPERTY_VALUE_DECLARATIONS),
        "property.valueDeclaration",
      ),
      valueEffectiveAt: stringFact("property.valueEffectiveAt"),
      propertyCategory: stringFact("property.propertyCategory"),
      propertyKind: stringFact("property.propertyKind"),
      constructionStatus: stringFact("property.constructionStatus"),
      occupancy: stringFact("property.occupancy"),
      possessionStatus: stringFact("property.possessionStatus"),
      registrationStatus: stringFact("property.registrationStatus"),
      propertyCity: stringFact("property.propertyCity"),
      propertyState: stringFact("property.propertyState"),
      pincode: stringFact("property.pincode"),
      address: stringFact("property.address"),
    }).strict(),
    cibil: z.object({
      kind: assessmentFactSchema(z.enum(ASSESSMENT_CIBIL_KINDS), "cibil.kind"),
      exactScore: intFact("cibil.exactScore"),
      expectedBand: assessmentFactSchema(z.enum(ASSESSMENT_EXPECTED_CIBIL_BANDS), "cibil.expectedBand"),
      observationDate: stringFact("cibil.observationDate"),
    }).strict(),
    balanceTransfer: z.object({
      outstandingPrincipal: moneyFact("balanceTransfer.outstandingPrincipal"),
      outstandingCertainty: assessmentFactSchema(z.enum(ASSESSMENT_CERTAINTIES), "balanceTransfer.outstandingCertainty"),
      outstandingObservationDate: stringFact("balanceTransfer.outstandingObservationDate"),
      loanStartDate: stringFact("balanceTransfer.loanStartDate"),
      loanStartDateCertainty: assessmentFactSchema(z.enum(ASSESSMENT_CERTAINTIES), "balanceTransfer.loanStartDateCertainty"),
      repaymentTrack: assessmentFactSchema(z.enum(["yes", "no", "not_sure"]), "balanceTransfer.repaymentTrack"),
      delayedEmiCount: intFact("balanceTransfer.delayedEmiCount"),
      delayedEmiCertainty: assessmentFactSchema(z.enum(ASSESSMENT_CERTAINTIES), "balanceTransfer.delayedEmiCertainty"),
      existingLenderInstitution: stringFact("balanceTransfer.existingLenderInstitution"),
      currentRoiPercent: percentFact("balanceTransfer.currentRoiPercent"),
      currentRoiCertainty: assessmentFactSchema(z.enum(ASSESSMENT_CERTAINTIES), "balanceTransfer.currentRoiCertainty"),
      currentHomeLoanEmi: moneyFact("balanceTransfer.currentHomeLoanEmi"),
      currentHomeLoanEmiCertainty: assessmentFactSchema(
        z.enum(ASSESSMENT_CERTAINTIES),
        "balanceTransfer.currentHomeLoanEmiCertainty",
      ),
      remainingTenureMonths: intFact("balanceTransfer.remainingTenureMonths"),
      remainingTenureCertainty: assessmentFactSchema(
        z.enum(ASSESSMENT_CERTAINTIES),
        "balanceTransfer.remainingTenureCertainty",
      ),
      originalSanctionedAmount: moneyFact("balanceTransfer.originalSanctionedAmount"),
      originalTenureMonths: intFact("balanceTransfer.originalTenureMonths"),
      rateType: assessmentFactSchema(z.enum(["floating", "fixed", "hybrid", "not_known"]), "balanceTransfer.rateType"),
    }).strict(),
    coApplicant: z.object({
      participantRef: stringFact("coApplicant.participantRef"),
      contributionDecision: assessmentFactSchema(
        z.enum(ASSESSMENT_CONTRIBUTION_DECISIONS),
        "coApplicant.contributionDecision",
      ),
      relationship: stringFact("coApplicant.relationship"),
      dateOfBirth: stringFact("coApplicant.dateOfBirth"),
      employmentType: stringFact("coApplicant.employmentType"),
      contributedIncome: moneyFact("coApplicant.contributedIncome"),
      obligations: moneyFact("coApplicant.obligations"),
    }).strict(),
    selfEmployedEvidence: z.object({
      turnover: moneyFact("selfEmployedEvidence.turnover"),
      profit: moneyFact("selfEmployedEvidence.profit"),
      vintage: stringFact("selfEmployedEvidence.vintage"),
      constitution: stringFact("selfEmployedEvidence.constitution"),
      methodologyStatus: assessmentFactSchema(z.literal("unsupported"), "selfEmployedEvidence.methodologyStatus"),
    }).strict(),
  })
  .strict()
  .superRefine((facts, ctx) => {
    const income = facts.incomeAndObligations.monthlyIncome;
    if ((income.state === "known" || income.state === "unconfirmed") && !isPositiveMoney(income.value)) {
      issue(ctx, ["incomeAndObligations", "monthlyIncome", "value"], "Known monthly income must be a positive exact rupee amount.");
    }

    const obligations = facts.incomeAndObligations.existingMonthlyObligations;
    if (obligations.state === "missing" && isZeroMoney(obligations.value)) {
      issue(ctx, ["incomeAndObligations", "existingMonthlyObligations"], "Missing obligations must not be stored as zero.");
    }
    if (isZeroMoney(obligations.value) && obligations.knownZeroDeclared !== true) {
      issue(
        ctx,
        ["incomeAndObligations", "existingMonthlyObligations", "knownZeroDeclared"],
        "Zero obligations require explicit knownZeroDeclared.",
      );
    }
    if (obligations.knownZeroDeclared === true && !isZeroMoney(obligations.value)) {
      issue(
        ctx,
        ["incomeAndObligations", "existingMonthlyObligations", "knownZeroDeclared"],
        "knownZeroDeclared is only valid with an explicit zero obligations amount.",
      );
    }

    const tenure = facts.incomeAndObligations.requestedTenureMonths;
    if ((tenure.state === "known" || tenure.state === "unconfirmed") && (typeof tenure.value !== "number" || tenure.value <= 0)) {
      issue(ctx, ["incomeAndObligations", "requestedTenureMonths", "value"], "Requested tenure must be a positive integer month count.");
    }

    const basis = facts.incomeAndObligations.incomeBasis;
    if (basis.state === "known" && basis.value && basis.value !== ASSESSMENT_INCOME_BASIS_SALARY) {
      issue(ctx, ["incomeAndObligations", "incomeBasis"], "Non-salary income basis is unsupported for governed eligibility.");
    }

    const tx = facts.loanRequirement.transactionType;
    if (tx.value && (ASSESSMENT_FORBIDDEN_TRANSACTION_TYPES as readonly string[]).includes(tx.value)) {
      issue(ctx, ["loanRequirement", "transactionType", "value"], "fresh, bt_top_up and with_topup are not canonical assessment transaction types.");
    }

    const requested = facts.loanRequirement.requestedAmount;
    if ((requested.state === "known" || requested.state === "unconfirmed") && !isPositiveMoney(requested.value)) {
      issue(ctx, ["loanRequirement", "requestedAmount", "value"], "Known requested amount must be a positive exact rupee amount.");
    }

    const propertyValue = facts.property.propertyValue;
    if ((propertyValue.state === "known" || propertyValue.state === "unconfirmed") && !isPositiveMoney(propertyValue.value)) {
      issue(ctx, ["property", "propertyValue", "value"], "Known property value must be a positive exact rupee amount.");
    }

    const journeyCity = facts.borrower.journeyCity.value;
    const propertyCity = facts.property.propertyCity;
    if (
      propertyCity.state === "missing" &&
      typeof journeyCity === "string" &&
      propertyCity.value === journeyCity
    ) {
      issue(ctx, ["property", "propertyCity"], "Journey city must not be copied onto missing property city.");
    }

    const cibilKind = facts.cibil.kind;
    const exact = facts.cibil.exactScore;
    const band = facts.cibil.expectedBand;
    const kindValue = cibilKind.state === "missing" ? "missing" : cibilKind.value;
    if (kindValue === "exact") {
      if (exact.value == null || exact.value < 300 || exact.value > 900) {
        issue(ctx, ["cibil", "exactScore", "value"], "Exact CIBIL must be an integer score between 300 and 900.");
      }
      if (band.value != null) {
        issue(ctx, ["cibil", "expectedBand"], "Exact CIBIL cannot also store an expected band.");
      }
    }
    if (kindValue === "expected_band") {
      if (band.value == null) {
        issue(ctx, ["cibil", "expectedBand", "value"], "Expected CIBIL band is required.");
      }
      if (exact.value != null) {
        issue(ctx, ["cibil", "exactScore"], "Expected CIBIL band cannot be converted into an exact score.");
      }
    }
    if (kindValue === "explicitly_unknown") {
      if (exact.value != null || band.value != null) {
        issue(ctx, ["cibil"], "Explicitly unknown CIBIL cannot carry a score or band.");
      }
    }
    if (kindValue === "missing" || cibilKind.state === "missing") {
      if (exact.value != null || band.value != null) {
        issue(ctx, ["cibil"], "Missing CIBIL cannot carry a score, band, or not_known value.");
      }
    }

    const outstanding = facts.balanceTransfer.outstandingPrincipal;
    if ((outstanding.state === "known" || outstanding.state === "unconfirmed") && !isPositiveMoney(outstanding.value)) {
      issue(ctx, ["balanceTransfer", "outstandingPrincipal", "value"], "Known BT outstanding must be a positive exact rupee amount.");
    }
    if (
      outstanding.state === "missing" &&
      requested.state !== "missing" &&
      outstanding.value != null &&
      outstanding.value === requested.value
    ) {
      issue(ctx, ["balanceTransfer", "outstandingPrincipal"], "Requested amount must not be used as BT outstanding.");
    }

    const contributor = facts.coApplicant.contributionDecision;
    const participant = facts.coApplicant.participantRef;
    if (contributor.state === "missing" && contributor.value === "yes") {
      issue(ctx, ["coApplicant", "contributionDecision"], "A participant must not be inferred as a contributing co-applicant.");
    }
    if (contributor.value === "yes" && (contributor.state === "known" || contributor.state === "unconfirmed") && !participant.value) {
      issue(ctx, ["coApplicant", "participantRef"], "Contributor selection requires an explicit participant reference.");
    }

    if (facts.borrower.employmentFamily.value === "self_employed" && income.state === "known") {
      issue(
        ctx,
        ["incomeAndObligations", "monthlyIncome"],
        "Self-employed assessments cannot invent eligible income; methodology remains unsupported.",
      );
    }
  });

export function parseOpportunityAssessmentFacts(input: unknown): OpportunityAssessmentFactsV1 {
  return opportunityAssessmentFactsSchema.parse(input) as OpportunityAssessmentFactsV1;
}

export function safeParseOpportunityAssessmentFacts(input: unknown) {
  return opportunityAssessmentFactsSchema.safeParse(input);
}

export function cloneAssessmentFact<T>(fact: AssessmentFact<T>, patch: Partial<AssessmentFact<T>>): AssessmentFact<T> {
  return { ...fact, ...patch };
}
