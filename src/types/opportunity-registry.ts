/**
 * CO-ARCH-003 — Opportunity Registry row + filter types (My Opportunities).
 */

import type { AssignedUserRef } from "@/types/assigned-users";

export interface OpportunityRegistryRow {
  id: string;
  opportunityNumber: string;
  legacyLoanFileId: string | null;
  customerName: string;
  product: string;
  opportunityStage: string;
  opportunityStageLabel: string;
  /** @deprecated Prefer assignedUsers — kept for sort/filter compatibility. */
  owner: string;
  assignedUsers: AssignedUserRef[];
  rowVersion?: number;
  lendingExtension?: Record<string, unknown> | null;
  createdAt: string;
  createdAtLabel: string;
  updatedAt: string;
  updatedAtLabel: string;
  status: string;
  statusLabel: string;
  fulfilmentStatus: string;
  primaryBorrowerKind?: "individual" | "company" | null;
  primaryContactId?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  requestedAmount: number | null;
  /** CO-UX-006 — Opportunity.sourceCode */
  sourceCode: string | null;
  sourceLabel: string;
}

export type OpportunityRegistrySortField =
  | "opportunityNumber"
  | "customerName"
  | "product"
  | "opportunityStageLabel"
  | "owner"
  | "assignedUsers"
  | "createdAt"
  | "updatedAt"
  | "status"
  | "sourceLabel";

export type OpportunityRegistrySortDir = "asc" | "desc";

export interface OpportunityRegistryFilters {
  search: string;
  stage: string;
  status: string;
  /** Exact sourceCode, or "all" */
  source: string;
}

export const EMPTY_OPPORTUNITY_REGISTRY_FILTERS: OpportunityRegistryFilters = {
  search: "",
  stage: "all",
  status: "all",
  source: "all",
};

export const OPPORTUNITY_REGISTRY_PAGE_SIZES = [20, 50, 100] as const;
