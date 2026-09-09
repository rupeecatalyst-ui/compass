/**
 * Customer-specific tenure in months.
 * “Maximum permitted age at loan maturity: 75 years” is not an automatic fresh-loan qualification.
 */

export type TenureCapInput = {
  programmeMaxTenureMonths: number | null;
  maxAgeAtMaturityYears: number | null;
  applicantAgeMonths: number | null;
  coApplicantAgeMonths?: number | null;
  /** Whose age governs tenure — from the lender programme only. */
  ageGoverningParty?: "applicant" | "co_applicant" | "younger" | "older" | null;
  retirementCapMonths?: number | null;
  propertyCapMonths?: number | null;
  customerSelectedTenureMonths?: number | null;
};

export type EffectiveTenureResult = {
  status: "calculated" | "unknown";
  effectiveTenureMonths: number | null;
  components: {
    programmeMaxTenureMonths: number | null;
    ageBasedTenureMonths: number | null;
    retirementCapMonths: number | null;
    propertyCapMonths: number | null;
    customerSelectedTenureMonths: number | null;
  };
  ageAtMaturityYearsLabel: string | null;
  unknownReason: string | null;
  reasonCodes: string[];
};

export function ageInMonthsFromDateOfBirth(dobIso: string | null | undefined, asOf = new Date()): number | null {
  if (!dobIso) return null;
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;
  const months =
    (asOf.getFullYear() - dob.getFullYear()) * 12 + (asOf.getMonth() - dob.getMonth());
  const dayAdjust = asOf.getDate() < dob.getDate() ? -1 : 0;
  const total = months + dayAdjust;
  return total >= 0 ? total : null;
}

function governingAgeMonths(input: TenureCapInput): number | null {
  const applicant = input.applicantAgeMonths;
  const co = input.coApplicantAgeMonths ?? null;
  switch (input.ageGoverningParty) {
    case "co_applicant":
      return co;
    case "younger":
      if (applicant == null) return co;
      if (co == null) return applicant;
      return Math.min(applicant, co);
    case "older":
      if (applicant == null) return co;
      if (co == null) return applicant;
      return Math.max(applicant, co);
    case "applicant":
    default:
      return applicant;
  }
}

export function calculateEffectiveTenureMonths(input: TenureCapInput): EffectiveTenureResult {
  const governingAge = governingAgeMonths(input);
  let ageBased: number | null = null;
  const reasonCodes: string[] = [];

  if (input.maxAgeAtMaturityYears != null && governingAge != null) {
    const maturityMonths = input.maxAgeAtMaturityYears * 12;
    ageBased = Math.max(0, maturityMonths - governingAge);
    if (ageBased < (input.programmeMaxTenureMonths ?? ageBased)) {
      reasonCodes.push("AGE_LIMIT_REDUCED_TENURE");
    }
  }

  const candidates = [
    input.programmeMaxTenureMonths,
    ageBased,
    input.retirementCapMonths ?? null,
    input.propertyCapMonths ?? null,
    input.customerSelectedTenureMonths ?? null,
  ].filter((value): value is number => value != null && Number.isFinite(value) && value > 0);

  if (candidates.length === 0) {
    return {
      status: "unknown",
      effectiveTenureMonths: null,
      components: {
        programmeMaxTenureMonths: input.programmeMaxTenureMonths,
        ageBasedTenureMonths: ageBased,
        retirementCapMonths: input.retirementCapMonths ?? null,
        propertyCapMonths: input.propertyCapMonths ?? null,
        customerSelectedTenureMonths: input.customerSelectedTenureMonths ?? null,
      },
      ageAtMaturityYearsLabel:
        input.maxAgeAtMaturityYears != null
          ? `Maximum permitted age at loan maturity: ${input.maxAgeAtMaturityYears} years`
          : null,
      unknownReason: "Tenure cannot be determined from verified programme and applicant age inputs.",
      reasonCodes,
    };
  }

  const effective = Math.min(...candidates);
  if (input.programmeMaxTenureMonths != null && effective === input.programmeMaxTenureMonths) {
    reasonCodes.push("LONGER_TENURE_LOWER_EMI");
  }

  return {
    status: "calculated",
    effectiveTenureMonths: Math.floor(effective),
    components: {
      programmeMaxTenureMonths: input.programmeMaxTenureMonths,
      ageBasedTenureMonths: ageBased,
      retirementCapMonths: input.retirementCapMonths ?? null,
      propertyCapMonths: input.propertyCapMonths ?? null,
      customerSelectedTenureMonths: input.customerSelectedTenureMonths ?? null,
    },
    ageAtMaturityYearsLabel:
      input.maxAgeAtMaturityYears != null
        ? `Maximum permitted age at loan maturity: ${input.maxAgeAtMaturityYears} years`
        : null,
    unknownReason: null,
    reasonCodes,
  };
}

export function calculateReducingBalanceEmi(input: {
  principalRupees: number;
  annualRoiPercent: number | null;
  tenureMonths: number | null;
}): number | null {
  if (
    input.principalRupees <= 0 ||
    input.annualRoiPercent == null ||
    !Number.isFinite(input.annualRoiPercent) ||
    input.tenureMonths == null ||
    input.tenureMonths <= 0
  ) {
    return null;
  }
  const monthlyRate = input.annualRoiPercent / 12 / 100;
  if (monthlyRate === 0) {
    return Math.round(input.principalRupees / input.tenureMonths);
  }
  const n = input.tenureMonths;
  const factor = (1 + monthlyRate) ** n;
  const emi = (input.principalRupees * monthlyRate * factor) / (factor - 1);
  return Math.round(emi);
}

export function principalFromEmi(input: {
  monthlyEmiRupees: number;
  annualRoiPercent: number;
  tenureMonths: number;
}): number {
  if (input.monthlyEmiRupees <= 0 || input.tenureMonths <= 0) return 0;
  const monthlyRate = input.annualRoiPercent / 12 / 100;
  if (monthlyRate === 0) {
    return Math.floor(input.monthlyEmiRupees * input.tenureMonths);
  }
  const n = input.tenureMonths;
  const factor = (1 + monthlyRate) ** n;
  return Math.floor((input.monthlyEmiRupees * (factor - 1)) / (monthlyRate * factor));
}
