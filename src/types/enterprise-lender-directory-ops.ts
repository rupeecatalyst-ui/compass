/**
 * CO-ARCH-ELD-001 — Enterprise Lender Directory (lender-centric operational rows).
 * Product parameters always from Enterprise Lender Registry programs — never hardcoded.
 */

export type EnterpriseLenderDirectoryCategoryId =
  | "bank"
  | "hfc"
  | "nbfc"
  | "fintech"
  | "cooperative"
  | "other";

export type EnterpriseLenderDirectoryStatus = "active" | "inactive";

/**
 * One row = one lender, with product parameters projected from published programs.
 */
export interface EnterpriseLenderDirectoryRow {
  lenderId: string;
  lenderName: string;
  shortName: string;
  categoryId: EnterpriseLenderDirectoryCategoryId;
  categoryLabel: string;
  status: EnterpriseLenderDirectoryStatus;
  /** Registry sortOrder / priority — lower = more pinned */
  pinRank: number;
  pinned: boolean;
  homeLoanRoiLabel: string;
  homeLoanRoi: number | null;
  balanceTransferRoiLabel: string;
  balanceTransferRoi: number | null;
  maxLtvLabel: string;
  maxLtvPercent: number | null;
  /** Not on program schema yet — show Not Specified until registry field exists */
  foirLabel: string;
  minCibilLabel: string;
  minCibil: number | null;
  maxLoanAmountLabel: string;
  maxLoanAmount: number;
  processingFeeLabel: string;
  averageTatLabel: string;
  averageTatDays: number;
  balanceTransferAvailable: boolean;
  topUpAvailable: boolean;
  /** Real deal counts when enriched; otherwise 0 (not invented marketing numbers) */
  activeOpportunities: number;
  activeDeals: number;
  pipelineValue: number;
  activityScore: number;
  recentlyUsedAt?: string | null;
  regionLabel: string;
  productsSupported: string[];
  searchBlob: string;
}

export type EnterpriseLenderDirectoryFilters = {
  search: string;
  category: EnterpriseLenderDirectoryCategoryId | "all";
  product: string | "all";
  region: string | "all";
};

export type EnterpriseLenderDirectorySortMode =
  | "smart"
  | "lenderName"
  | "homeLoanRoi"
  | "balanceTransferRoi"
  | "maxLtv"
  | "minCibil"
  | "maxLoanAmount"
  | "averageTat"
  | "activeOpportunities"
  | "status";

/**
 * CO-ARCH-ELD-EMP — Lender Employee (banker) directory row.
 * Identity SSOT: Enterprise Contact Registry (role = lender_employee).
 * Institution SSOT: Enterprise Lender Registry.
 * Products SSOT: Enterprise Product Master codes on banker profile.
 */
export type EldLenderEmployeeStatus = "active" | "provisional" | "inactive";

export interface EldLenderEmployeePipelineItem {
  dealId: string;
  dealNumber: string;
  opportunityId?: string | null;
  opportunityNumber?: string | null;
  customerName: string;
  productLabel: string;
  stageLabel: string;
  amountLabel: string;
  lenderId?: string | null;
}

export interface EldLenderEmployeeHierarchyNode {
  contactId: string;
  name: string;
  designationLabel: string;
  mobile: string;
}

export interface EldLenderEmployeeRow {
  contactId: string;
  employeeName: string;
  institutionId: string;
  institutionName: string;
  branchId: string;
  branchLabel: string;
  cityId: string;
  cityLabel: string;
  regionId: string;
  regionLabel: string;
  designationId: string;
  designationLabel: string;
  productCodes: string[];
  productsHandledLabel: string;
  mobile: string;
  email: string;
  reportingManagerContactId?: string;
  reportingManagerName: string;
  /** Certified performance score when an SSOT formula exists; otherwise null */
  performanceScore: number | null;
  performanceScoreLabel: string;
  activeOpportunities: number;
  activeDeals: number;
  totalSanctions: number;
  totalDisbursements: number;
  averageTatDays: number | null;
  averageTatLabel: string;
  approvalRatioLabel: string;
  status: EldLenderEmployeeStatus;
  statusLabel: string;
  searchBlob: string;
  /** Pipeline rows projected for this banker (Deal Registry via sales contact link). */
  pipeline: EldLenderEmployeePipelineItem[];
  hierarchy: EldLenderEmployeeHierarchyNode[];
}

export type EldLenderEmployeeFilters = {
  search: string;
  lenderId: string | "all";
  product: string | "all";
  designation: string | "all";
  city: string | "all";
  region: string | "all";
  status: EldLenderEmployeeStatus | "all";
  performance: "all" | "not_specified" | "has_activity";
};

export type EldLenderEmployeeSortMode =
  | "employeeName"
  | "institutionName"
  | "designationLabel"
  | "cityLabel"
  | "performanceScore"
  | "activeOpportunities"
  | "activeDeals"
  | "status";
