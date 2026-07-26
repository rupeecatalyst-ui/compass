/**
 * Map published Enterprise Lender Registry programs → comparison grid rows.
 */
import { ELW_DIRECTORY_PRODUCTS } from "@/constants/enterprise-lender-directory";
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
  const productCode = program.productCode ?? "";
  const directoryProductId = PRODUCT_CODE_TO_DIRECTORY[productCode] ?? productCode;
  const productMeta = ELW_DIRECTORY_PRODUCTS.find((p) => p.id === directoryProductId);
  const roi = program.roiPercent ?? program.minRoiPercent ?? 0;
  const feePct = program.processingFeePct ?? 0;
  const maxFunding = program.maxFundingAmount ?? 0;
  const state = program.eligibleStates?.[0] ?? lender.coverageStates?.[0] ?? "—";
  const city = program.eligibleCities?.[0] ?? lender.coverageCities?.[0] ?? "—";
  const employment =
    program.employmentType === "salaried"
      ? "salaried"
      : program.employmentType === "self_employed"
        ? "self_employed"
        : "both";

  return {
    id: program.id,
    lenderId: lender.id,
    lenderName: lender.label,
    programName: program.label,
    productId: directoryProductId || "home-loan",
    productLabel: productMeta?.label ?? program.label,
    roi,
    roiLabel: roi ? `${roi.toFixed(2)}%` : "—",
    lenderScore: 75,
    contactScore: 75,
    maxFundingLabel: formatInr(maxFunding),
    maxFundingAmount: maxFunding,
    maxLtvLabel: program.maxLtvPercent != null ? `${program.maxLtvPercent}%` : undefined,
    maxTenureLabel: program.maxTenureMonths != null ? `${program.maxTenureMonths} mo` : "—",
    processingFeeLabel: program.processingFeeLabel ?? (feePct ? `${feePct}%` : "—"),
    processingFeePct: feePct,
    averageTatDays: program.averageTatDays ?? 0,
    status: program.enabled && program.status === "active" ? "active" : "inactive",
    institutionType: institutionType(lender.institutionCategory),
    employmentSegment: employment,
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
  return programs
    .filter((p) => {
      if (!registryCode) return true;
      return p.productCode === registryCode;
    })
    .map((p) => {
      const lender = lenderById.get(p.lenderId);
      if (!lender) return null;
      return mapRegistryProgramToDirectoryRow(p, lender);
    })
    .filter((row): row is ElwLenderProgramRow => row != null);
}
