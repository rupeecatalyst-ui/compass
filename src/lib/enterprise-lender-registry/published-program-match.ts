/**
 * Published programme eligibility and commercial projection.
 * One calculator for COMPASS and Chanakya. Missing commercials stay absent.
 * Provisional BF_* lender rows are never selected. They are not deleted.
 */
import {
  getCanonicalProductByCode,
  productCodesShareSelectionFamily,
} from "@/constants/enterprise-product-master";
import { isProvisionalBfLenderCode } from "@/lib/enterprise-lender-registry/published-directory";
import { isPublishedCommercialProgram } from "@/lib/enterprise-lender-registry/program-architecture";
import {
  programmeEmploymentCategory,
  recommendationProgrammeIds,
} from "@/lib/enterprise-lender-registry/programme-versioning";
import { calculateMonthlyEmi } from "@/lib/loan-emi-utils";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

export type ProgrammeCustomerProfile = {
  employmentType?: string | null;
  approxCibil?: string | number | null;
  monthlyIncome?: number | null;
  existingEmi?: number | null;
  loanAmount?: number | null;
  propertyValue?: number | null;
};

export type PublishedProgrammeCandidate = {
  program: EnterpriseLenderProgramRecord;
  lenderId: string;
  lenderCode: string;
  lenderName: string;
  priorityRank: number | null;
};

export type RankedPublishedProgramme = {
  lenderId: string;
  lenderCode: string;
  lenderName: string;
  lenderRef: string;
  programmeId: string;
  programmeLabel: string;
  priorityRank: number | null;
  matchScore: number;
  interestRateLabel: string | null;
  estimatedEmiLabel: string | null;
  tenureLabel: string | null;
  processingTimeLabel: string | null;
  reasons: string[];
};

const CIBIL_FLOOR: Record<string, number | null> = {
  not_known: null,
  below_600: 0,
  "600_649": 600,
  "650_699": 650,
  "700_749": 700,
  "750_799": 750,
  "800_plus": 800,
};

export function canonicalStoredProductCode(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return getCanonicalProductByCode(raw)?.code ?? null;
}

function employmentFamily(value: string | null | undefined): "salaried" | "self_employed" | "any" | "unknown" {
  const category = programmeEmploymentCategory(value);
  if (category === "salaried" || category === "self_employed") return category;
  const raw = (value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  if (!raw || raw === "both" || raw === "all" || raw === "any" || raw.includes("both")) return "any";
  return "unknown";
}

function cibilFloor(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw in CIBIL_FLOOR) return CIBIL_FLOOR[raw] ?? null;
  const range = raw.match(/(\d{3})/);
  if (!range) return null;
  const n = Number(range[1]);
  return Number.isFinite(n) ? n : null;
}

function inr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function rateLabel(program: EnterpriseLenderProgramRecord): string | null {
  if (program.roiPercent != null && Number.isFinite(program.roiPercent)) {
    return `${program.roiPercent.toFixed(2)}%`;
  }
  if (program.minRoiPercent != null && program.maxRoiPercent != null) {
    return `${program.minRoiPercent.toFixed(2)}% – ${program.maxRoiPercent.toFixed(2)}%`;
  }
  if (program.minRoiPercent != null) return `${program.minRoiPercent.toFixed(2)}%`;
  return null;
}

function programmeFitsProduct(
  program: EnterpriseLenderProgramRecord,
  productCode: string,
): boolean {
  return productCodesShareSelectionFamily(program.productCode, productCode);
}

function evaluateProgramme(
  candidate: PublishedProgrammeCandidate,
  profile: ProgrammeCustomerProfile,
): { ok: boolean; reasons: string[]; gates: number } {
  const program = candidate.program;
  const reasons: string[] = [`Published programme ${program.label}`];
  let gates = 1;

  const programmeEmployment = employmentFamily(program.employmentType || program.borrowerType);
  const customerEmployment = employmentFamily(profile.employmentType);
  if (programmeEmployment === "salaried" || programmeEmployment === "self_employed") {
    if (customerEmployment === "unknown") return { ok: false, reasons: [], gates: 0 };
    if (customerEmployment !== "any" && customerEmployment !== programmeEmployment) {
      return { ok: false, reasons: [], gates: 0 };
    }
    reasons.push(
      programmeEmployment === "salaried" ? "Salaried eligibility" : "Self-employed eligibility",
    );
    gates += 1;
  }

  if (program.minCibil != null) {
    const floor = cibilFloor(profile.approxCibil);
    if (floor == null) return { ok: false, reasons: [], gates: 0 };
    if (floor < program.minCibil) return { ok: false, reasons: [], gates: 0 };
    reasons.push(`CIBIL meets ${program.minCibil}`);
    gates += 1;
  }

  if (program.minIncomeAmount != null) {
    if (profile.monthlyIncome == null || profile.monthlyIncome <= 0) {
      return { ok: false, reasons: [], gates: 0 };
    }
    if (profile.monthlyIncome < program.minIncomeAmount) return { ok: false, reasons: [], gates: 0 };
    reasons.push("Income meets programme minimum");
    gates += 1;
  }

  if (profile.loanAmount != null && profile.loanAmount > 0) {
    if (program.minFundingAmount != null && profile.loanAmount < program.minFundingAmount) {
      return { ok: false, reasons: [], gates: 0 };
    }
    if (program.maxFundingAmount != null && profile.loanAmount > program.maxFundingAmount) {
      return { ok: false, reasons: [], gates: 0 };
    }
  }

  if (
    program.maxLtvPercent != null &&
    profile.loanAmount != null &&
    profile.propertyValue != null &&
    profile.propertyValue > 0
  ) {
    const ltv = (profile.loanAmount / profile.propertyValue) * 100;
    if (ltv > program.maxLtvPercent) return { ok: false, reasons: [], gates: 0 };
    reasons.push(`LTV within ${program.maxLtvPercent}%`);
    gates += 1;
  }

  const rate = program.roiPercent ?? program.minRoiPercent ?? null;
  const tenure = program.maxTenureMonths ?? null;
  if (
    program.maxFoirPercent != null &&
    profile.monthlyIncome != null &&
    profile.monthlyIncome > 0 &&
    profile.existingEmi != null
  ) {
    const foir = (profile.existingEmi / profile.monthlyIncome) * 100;
    if (foir > program.maxFoirPercent) return { ok: false, reasons: [], gates: 0 };
    reasons.push(`FOIR within ${program.maxFoirPercent}%`);
    gates += 1;
  }

  if (
    program.maxDbrPercent != null &&
    profile.monthlyIncome != null &&
    profile.monthlyIncome > 0 &&
    profile.existingEmi != null &&
    profile.loanAmount != null &&
    rate != null &&
    tenure != null
  ) {
    const proposed = calculateMonthlyEmi(profile.loanAmount, rate, tenure) ?? 0;
    const dbr = ((profile.existingEmi + proposed) / profile.monthlyIncome) * 100;
    if (dbr > program.maxDbrPercent) return { ok: false, reasons: [], gates: 0 };
    reasons.push(`DBR within ${program.maxDbrPercent}%`);
    gates += 1;
  }

  if (rateLabel(program)) {
    reasons.push(`Indicative rate ${rateLabel(program)}`);
    gates += 1;
  }

  return { ok: true, reasons, gates };
}

function matchScore(gates: number, priorityRank: number | null): number {
  const priorityBoost =
    priorityRank != null && priorityRank > 0 ? Math.max(0, 16 - Math.min(priorityRank, 16)) : 0;
  return Math.max(55, Math.min(96, 60 + gates * 4 + priorityBoost));
}

export function rankPublishedProgrammes(input: {
  productCode: string;
  candidates: PublishedProgrammeCandidate[];
  profile: ProgrammeCustomerProfile;
  limit?: number;
}): RankedPublishedProgramme[] {
  const bestByLender = new Map<string, { candidate: PublishedProgrammeCandidate; gates: number; reasons: string[] }>();
  const currentIds = recommendationProgrammeIds(input.candidates.map((row) => row.program));

  for (const candidate of input.candidates) {
    if (!currentIds.has(candidate.program.id)) continue;
    if (isProvisionalBfLenderCode(candidate.lenderCode)) continue;
    if (!isPublishedCommercialProgram(candidate.program)) continue;
    if (!programmeFitsProduct(candidate.program, input.productCode)) continue;
    const decision = evaluateProgramme(candidate, input.profile);
    if (!decision.ok) continue;
    const current = bestByLender.get(candidate.lenderId);
    const specific = employmentFamily(candidate.program.employmentType) !== "any";
    const currentSpecific = current
      ? employmentFamily(current.candidate.program.employmentType) !== "any"
      : false;
    const sameSpecificity = Boolean(current) && specific === currentSpecific;
    if (
      !current ||
      (specific && !currentSpecific) ||
      (sameSpecificity && decision.gates > current.gates)
    ) {
      bestByLender.set(candidate.lenderId, {
        candidate,
        gates: decision.gates,
        reasons: decision.reasons,
      });
    }
  }

  const ranked = [...bestByLender.values()].sort((a, b) => {
    const ap = a.candidate.priorityRank ?? 10_000;
    const bp = b.candidate.priorityRank ?? 10_000;
    if (ap !== bp) return ap - bp;
    const as = matchScore(a.gates, a.candidate.priorityRank);
    const bs = matchScore(b.gates, b.candidate.priorityRank);
    if (as !== bs) return bs - as;
    return a.candidate.lenderName.localeCompare(b.candidate.lenderName);
  });

  const limit = input.limit ?? 8;
  return ranked.slice(0, limit).map((row) => {
    const program = row.candidate.program;
    const rate = program.roiPercent ?? program.minRoiPercent ?? null;
    const tenure = program.maxTenureMonths ?? null;
    const emi =
      input.profile.loanAmount != null && rate != null && tenure != null
        ? calculateMonthlyEmi(input.profile.loanAmount, rate, tenure)
        : null;
    return {
      lenderId: row.candidate.lenderId,
      lenderCode: row.candidate.lenderCode,
      lenderName: row.candidate.lenderName,
      lenderRef: `lender:${row.candidate.lenderId}`,
      programmeId: program.id,
      programmeLabel: program.label,
      priorityRank: row.candidate.priorityRank,
      matchScore: matchScore(row.gates, row.candidate.priorityRank),
      interestRateLabel: rateLabel(program),
      estimatedEmiLabel: emi != null ? inr(emi) : null,
      tenureLabel: tenure != null ? `${tenure} months` : null,
      processingTimeLabel:
        program.averageTatDays != null ? `${program.averageTatDays} days` : null,
      reasons: row.reasons,
    };
  });
}
