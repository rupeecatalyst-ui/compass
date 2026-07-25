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
  primaryContactId: string;
  requestedAmount: number | null;
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
  | "status";

export type OpportunityRegistrySortDir = "asc" | "desc";

export interface OpportunityRegistryFilters {
  search: string;
  stage: string;
  status: string;
}

export const EMPTY_OPPORTUNITY_REGISTRY_FILTERS: OpportunityRegistryFilters = {
  search: "",
  stage: "all",
  status: "all",
};

export const OPPORTUNITY_REGISTRY_PAGE_SIZES = [20, 50, 100] as const;
