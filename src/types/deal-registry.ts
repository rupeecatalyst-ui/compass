/**
 * CO-SPRINT-098 — Deal Registry row + filter types.
 */

import type { LoanFilePriority, LoanFileStatus, PipelineStage } from "@/types/catalyst-one";

export interface DealRegistryRow {
  id: string;
  dealId: string;
  opportunityNumber: string;
  fileNumber: string;
  borrowerName: string;
  contactNumber: string;
  product: string;
  loanAmount: number;
  loanAmountLabel: string;
  assignedRm: string;
  grossStage: PipelineStage;
  grossStageLabel: string;
  subStage: string;
  selectedLender: string;
  expectedRevenue: number;
  expectedRevenueLabel: string;
  priority: LoanFilePriority;
  lastActivity: string;
  lastActivityLabel: string;
  dateCreated: string;
  dateCreatedLabel: string;
  lastModified: string;
  lastModifiedLabel: string;
  status: LoanFileStatus | string;
  statusLabel: string;
  city: string;
  state: string;
  source: string;
  channelPartner: string;
  creditExecutive: string;
  operationsExecutive: string;
  branch: string;
  sanctionAmount: number;
  sanctionAmountLabel: string;
  disbursedAmount: number;
  disbursedAmountLabel: string;
  roi: number;
  roiLabel: string;
  tatDays: number;
  nextFollowUp: string;
  documentsPending: number;
  tasksPending: number;
  riskIndicator: string;
}

export const DEAL_REGISTRY_PAGE_SIZES = [20, 50, 100] as const;

export type DealRegistrySortField =
  | "dealId"
  | "borrowerName"
  | "product"
  | "loanAmount"
  | "assignedRm"
  | "grossStageLabel"
  | "subStage"
  | "selectedLender"
  | "expectedRevenue"
  | "priority"
  | "lastActivity"
  | "dateCreated"
  | "status"
  | "contactNumber"
  | "city"
  | "source"
  | "channelPartner"
  | "creditExecutive"
  | "operationsExecutive"
  | "sanctionAmount"
  | "disbursedAmount"
  | "roi"
  | "tatDays"
  | "lastModified"
  | "nextFollowUp"
  | "documentsPending"
  | "tasksPending"
  | "riskIndicator";

export interface DealRegistryFilters {
  search: string;
  product: string;
  grossStage: string;
  subStage: string;
  assignedRm: string;
  lender: string;
  branch: string;
  city: string;
  state: string;
  priority: string;
  status: string;
  source: string;
  amountMin: string;
  amountMax: string;
  revenueMin: string;
  revenueMax: string;
  dateCreatedFrom: string;
  dateCreatedTo: string;
  lastUpdatedFrom: string;
  lastUpdatedTo: string;
  /** Scope: my deals vs team */
  scope: "my_deals" | "my_team" | "all";
  columnBorrower: string;
  columnDealId: string;
}

export const EMPTY_DEAL_REGISTRY_FILTERS: DealRegistryFilters = {
  search: "",
  product: "all",
  grossStage: "all",
  subStage: "all",
  assignedRm: "all",
  lender: "all",
  branch: "all",
  city: "all",
  state: "all",
  priority: "all",
  status: "all",
  source: "all",
  amountMin: "",
  amountMax: "",
  revenueMin: "",
  revenueMax: "",
  dateCreatedFrom: "",
  dateCreatedTo: "",
  lastUpdatedFrom: "",
  lastUpdatedTo: "",
  scope: "my_team",
  columnBorrower: "",
  columnDealId: "",
};
