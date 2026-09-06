/**
 * Map published Enterprise Lender Registry programs → comparison grid rows.
 */
import { ELW_DIRECTORY_PRODUCTS } from "@/constants/enterprise-lender-directory";
import { canonicalizeProductCode, productCodesEquivalent } from "@/lib/product-programme-operations/product-aliases";
import { deriveEmploymentFamily } from "@/lib/product-programme-operations/employment";
import type { ElwLenderProgramRow, LenderInstitutionType } from "@/types/enterprise-lender-directory";
import type {
  EnterpriseLenderProgramRecord,
  EnterpriseLenderRecord,
} from "@/types/enterprise-lender-registry";

const PRODUCT_CODE_TO_DIRECTORY: Record<string, string> = {
  home_loan: "home-loan",
  home_loan_bt: "home-loan-balance-transfer",
  lap: "loan-against-property",
  business_loan: "business-loan",
  working_capital: "working-capital",
  construction_funding: "construction-funding",
  personal_loan: "personal-loan",
  gold_loan: "gold-loan",
  las: "loan-against-securities",
};

function institutionType(
  cat: EnterpriseLenderRecord["institutionCategory"] | string,
): LenderInstitutionType {
  if (cat === "hfc") return "HFC";
  if (cat === "nbfc" || cat === "fintech") return "NBFC";
  return "Bank";
}

function formatInr(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function mapDirectoryProductIdToRegistryCode(productId: string): string | undefined {
  const hit = Object.entries(PRODUCT_CODE_TO_DIRECTORY).find(([, v]) => v === productId);
  return hit?.[0];
}

export function mapRegistryProgramToDirectoryRow(
  program: EnterpriseLenderProgramRecord,
  lender: EnterpriseLenderRecord,
): ElwLenderProgramRow {
  const productCode = canonicalizeProductCode(program.productCode) ?? program.productCode ?? "";
  const directoryProductId =
    PRODUCT_CODE_TO_DIRECTORY[productCode.toLowerCase()] ??
    PRODUCT_CODE_TO_DIRECTORY[program.productCode ?? ""] ??
    productCode;
  const productMeta = ELW_DIRECTORY_PRODUCTS.find((p) => p.id === directoryProductId);
  const roiExact = program.minRoiExact ? Number(program.minRoiExact) : program.roiPercent ?? program.minRoiPercent ?? 0;
  const feePct = program.processingFeePct ?? (program.processingFeePctExact ? Number(program.processingFeePctExact) : 0);
  const maxFunding = program.maxFundingAmount ?? (program.maxLoanAmountExact ? Number(program.maxLoanAmountExact) : 0);
  const state = program.eligibleStates?.[0] ?? lender.coverageStates?.[0] ?? "—";
  const city = program.eligibleCities?.[0] ?? lender.coverageCities?.[0] ?? "—";
  const family = deriveEmploymentFamily((program.employmentTypes ?? []) as never);
  const employment =
    family === "salaried"
      ? "salaried"
      : family === "self_employed"
        ? "self_employed"
        : family === "both"
          ? "both"
          : program.employmentType === "salaried"
            ? "salaried"
            : program.employmentType === "self_employed"
              ? "self_employed"
              : "both";

  return {
    id: program.id,
    lenderId: lender.id,
    lenderName: lender.label,
    programName: program.label,
    programCode: program.code,
    productId: directoryProductId || "home-loan",
    productLabel: productMeta?.label ?? program.label,
    productVariant: program.productVariantCode ?? null,
    roi: Number.isFinite(roiExact) ? roiExact : 0,
    roiLabel:
      program.minRoiExact && program.maxRoiExact
        ? `${program.minRoiExact}–${program.maxRoiExact}%`
        : roiExact
          ? `${Number(roiExact).toFixed(2)}%`
          : "—",
    lenderScore: 75,
    contactScore: 75,
    maxFundingLabel: formatInr(maxFunding),
    maxFundingAmount: maxFunding,
    maxLtvLabel: program.maxLtvPercent != null ? `${program.maxLtvPercent}%` : program.maxLtvExact ? `${program.maxLtvExact}%` : undefined,
    maxTenureLabel: program.maxTenureMonths != null ? `${program.maxTenureMonths} mo` : "—",
    processingFeeLabel: program.processingFeeLabel ?? (feePct ? `${feePct}%` : "—"),
    processingFeePct: feePct,
    averageTatDays: program.averageTatDays ?? 0,
    status: program.enabled && (program.isLivePublished || program.status === "active") ? "active" : "inactive",
    institutionType: institutionType(lender.institutionCategory),
    employmentSegment: employment,
    employmentTypes: program.employmentTypes ?? [],
    constitutions: program.legalConstitutions ?? [],
    policyLabel: program.policyVersionId || program.creditRiskPolicyRef || null,
    documentCount: (program.requiredDocumentTypeIds ?? []).length,
    effectiveFrom: program.effectiveFrom ?? null,
    effectiveUntil: program.effectiveUntil ?? null,
    publishedVersion: program.versionNumber,
    lastUpdated: program.updatedAt ?? null,
    state,
    city,
    minCibil: program.minCibil ?? 0,
  };
}

export function buildPublishedDirectoryRows(
  programs: EnterpriseLenderProgramRecord[],
  lenders: EnterpriseLenderRecord[],
  directoryProductId: string,
): ElwLenderProgramRow[] {
  const registryCode = mapDirectoryProductIdToRegistryCode(directoryProductId);
  const lenderById = new Map(lenders.map((l) => [l.id, l]));
  const seen = new Set<string>();
  return programs
    .filter((p) => {
      if (!registryCode) return true;
      return productCodesEquivalent(p.productCode, registryCode);
    })
    .map((p) => {
      const lender = lenderById.get(p.lenderId);
      if (!lender) return null;
      const key = `${p.lenderId}:${p.lineageId ?? canonicalizeProductCode(p.productCode) ?? p.id}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return mapRegistryProgramToDirectoryRow(p, lender);
    })
    .filter((row): row is ElwLenderProgramRow => row != null);
}
