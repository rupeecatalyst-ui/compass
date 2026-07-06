import type { LendingType, PipelineStage, TransactionType } from "@/types/catalyst-one";

/** CRC-017 — Configurable loan stage master (future: Product/Lender Masters). */

export interface StageSubStatusMaster {
  id: string;
  label: string;
}

export interface PipelineStageMaster {
  id: PipelineStage;
  label: string;
  color: string;
  /** Sub-statuses for this stage (empty when none). */
  subStatuses: StageSubStatusMaster[];
}

export const PIPELINE_STAGE_MASTER: PipelineStageMaster[] = [
  { id: "raw_lead", label: "Raw Lead", color: "#94A3B8", subStatuses: [] },
  {
    id: "pre_login",
    label: "Pre Login",
    color: "#3B82F6",
    subStatuses: [
      { id: "contacted", label: "Contacted" },
      { id: "documents_pending", label: "Documents Pending" },
      { id: "documents_received", label: "Documents Received" },
      { id: "login_ready", label: "Login Ready" },
    ],
  },
  { id: "logged_in", label: "Logged In", color: "#06B6D4", subStatuses: [] },
  {
    id: "credit_wip",
    label: "Credit WIP",
    color: "#F59E0B",
    subStatuses: [
      { id: "query_raised", label: "Query Raised" },
      { id: "query_resolved", label: "Query Resolved" },
    ],
  },
  { id: "soft_approved", label: "Soft Approved", color: "#A855F7", subStatuses: [] },
  { id: "final_approved", label: "Final Approved", color: "#22C55E", subStatuses: [] },
  {
    id: "closure_wip",
    label: "Closure WIP",
    color: "#F97316",
    subStatuses: [
      { id: "agreement_signing", label: "Agreement Signing" },
      { id: "pre_authorization", label: "Pre Authorization" },
      { id: "authorized", label: "Authorized" },
      { id: "bt_cheque_deposited", label: "BT Cheque Deposited" },
      { id: "property_papers_submitted", label: "Property Papers Submitted" },
      { id: "top_up_awaited", label: "Top-up Awaited" },
    ],
  },
  { id: "won", label: "Won", color: "#0F766E", subStatuses: [] },
];

export const STAGE_ORDER: PipelineStage[] = PIPELINE_STAGE_MASTER.map((s) => s.id);

export const STAGE_LABELS: Record<PipelineStage, string> = Object.fromEntries(
  PIPELINE_STAGE_MASTER.map((s) => [s.id, s.label]),
) as Record<PipelineStage, string>;

export const STAGE_COLORS: Record<PipelineStage, string> = Object.fromEntries(
  PIPELINE_STAGE_MASTER.map((s) => [s.id, s.color]),
) as Record<PipelineStage, string>;

export const PIPELINE_STAGES = PIPELINE_STAGE_MASTER.map(({ id, label }) => ({ id, label }));

/** Active pipeline columns (excludes Won — completed engagements). */
export const ACTIVE_PIPELINE_STAGES: PipelineStage[] = STAGE_ORDER.filter((s) => s !== "won");

/** Legacy stage migration (localStorage + imports). */
export const LEGACY_STAGE_MAP: Record<string, PipelineStage> = {
  soft_approval: "soft_approved",
  final_approval: "final_approved",
  disbursement: "closure_wip",
  invoice_raised: "closure_wip",
  payout_received: "won",
};

export function migrateLegacyStage(stage: string): PipelineStage {
  return (LEGACY_STAGE_MAP[stage] ?? stage) as PipelineStage;
}

export function getStageIndex(stage: PipelineStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export function getStageProgress(stage: PipelineStage): number {
  const index = getStageIndex(stage);
  if (index < 0) return 0;
  return Math.round(((index + 1) / STAGE_ORDER.length) * 100);
}

export function isStageAtOrBeyond(stage: PipelineStage, target: PipelineStage): boolean {
  return getStageIndex(stage) >= getStageIndex(target);
}

export function isStageBeyond(stage: PipelineStage, target: PipelineStage): boolean {
  return getStageIndex(stage) > getStageIndex(target);
}

export function getSubStatusesForStage(stage: PipelineStage): StageSubStatusMaster[] {
  return PIPELINE_STAGE_MASTER.find((s) => s.id === stage)?.subStatuses ?? [];
}

export function getSubStatusLabel(stage: PipelineStage, subStatusId?: string): string | undefined {
  if (!subStatusId) return undefined;
  return getSubStatusesForStage(stage).find((s) => s.id === subStatusId)?.label;
}

export function searchPipelineStages(query: string): { id: PipelineStage; label: string }[] {
  const q = query.trim().toLowerCase();
  const stages = PIPELINE_STAGES;
  if (!q) return [...stages];
  return stages.filter((s) => s.label.toLowerCase().includes(q) || s.id.includes(q));
}

export function searchSubStatusesForStage(
  stage: PipelineStage,
  query: string,
): StageSubStatusMaster[] {
  const q = query.trim().toLowerCase();
  const subs = getSubStatusesForStage(stage);
  if (!q) return subs;
  return subs.filter((s) => s.label.toLowerCase().includes(q) || s.id.includes(q));
}

export function isLoanWon(stage: PipelineStage): boolean {
  return stage === "won";
}

export function shouldShowFinalLoanAmount(stage: PipelineStage): boolean {
  return isStageAtOrBeyond(stage, "final_approved");
}

export function requiresFinalLoanAmount(stage: PipelineStage): boolean {
  return isStageBeyond(stage, "final_approved") || stage === "won";
}

/** CRC-018 — Lending type master. */
export const LENDING_TYPES: { id: LendingType; label: string }[] = [
  { id: "secured", label: "Secured" },
  { id: "unsecured", label: "Unsecured" },
  { id: "hybrid", label: "Hybrid" },
];

export const SECURED_PRODUCTS = [
  "Home Loan",
  "Home Loan Balance Transfer",
  "Loan Against Property",
  "Working Capital",
  "Construction Finance",
  "Commercial Property Loan",
  "Lease Rental Discounting",
  "Machinery Loan",
  "Plot Loan",
] as const;

export const UNSECURED_PRODUCTS = [
  "Personal Loan",
  "Business Loan (Unsecured)",
  "Credit Card",
] as const;

export function getProductsForLendingType(lendingType: LendingType): readonly string[] {
  switch (lendingType) {
    case "secured":
      return SECURED_PRODUCTS;
    case "unsecured":
      return UNSECURED_PRODUCTS;
    case "hybrid":
      return [...SECURED_PRODUCTS, ...UNSECURED_PRODUCTS];
    default:
      return SECURED_PRODUCTS;
  }
}

export function isPropertySectionVisible(lendingType: LendingType): boolean {
  return lendingType === "secured" || lendingType === "hybrid";
}

/** CRC-10.2C — Property qualification fields (product-driven). */
export const PROPERTY_TYPES = [
  "Residential Apartment",
  "Residential House",
  "Residential Villa",
  "Residential Plot",
  "Commercial Office",
  "Commercial Shop",
  "Commercial Showroom",
  "Commercial Building",
  "Industrial Plot",
  "Factory",
  "Warehouse",
  "Industrial Shed",
  "Hotel",
  "Hospital",
  "School / Educational Institution",
  "Mixed Use Property",
  "Agricultural Land",
  "Other",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export function searchPropertyTypes(query: string): PropertyType[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...PROPERTY_TYPES];
  return PROPERTY_TYPES.filter((t) => t.toLowerCase().includes(q));
}

/** CRC-019 — Transaction type master. */
export const TRANSACTION_TYPES: { id: TransactionType; label: string }[] = [
  { id: "fresh", label: "Fresh" },
  { id: "balance_transfer", label: "Balance Transfer" },
];

export function isBalanceTransferVisible(
  lendingType: LendingType,
  transactionType: TransactionType,
): boolean {
  return lendingType === "secured" && transactionType === "balance_transfer";
}

export function computeTopUpRequested(requiredAmount: number, btAmount: number): number {
  return Math.max(0, requiredAmount - btAmount);
}
