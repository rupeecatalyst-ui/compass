/**
 * CO-SPRINT-093 — Enterprise Lender Directory (landing grid).
 * One row = one lender program for the selected product.
 */

export type LenderInstitutionType = "Bank" | "NBFC" | "HFC";

export type LenderProgramStatus = "active" | "inactive";

export type LenderEmploymentSegment = "salaried" | "self_employed" | "both";

export interface ElwLenderProgramRow {
  id: string;
  lenderId: string;
  lenderName: string;
  programName: string;
  productId: string;
  productLabel: string;
  /** Display ROI % (numeric for sort) */
  roi: number;
  roiLabel: string;
  /**
   * Display-only program quality score (0–100).
   * No scoring engine in this sprint — values are seeded for operational comparison.
   */
  lenderScore: number;
  /**
   * Display-only relationship/people score (0–100).
   * Reflects contact quality placeholders — not computed from contact graph.
   */
  contactScore: number;
  maxFundingLabel: string;
  maxFundingAmount: number;
  maxLtvLabel?: string;
  maxTenureLabel: string;
  processingFeeLabel: string;
  /** Numeric proxy for fee range filters (percent where applicable, else 0) */
  processingFeePct: number;
  averageTatDays: number;
  status: LenderProgramStatus;
  institutionType: LenderInstitutionType;
  employmentSegment: LenderEmploymentSegment;
  state: string;
  city: string;
  minCibil: number;
}
