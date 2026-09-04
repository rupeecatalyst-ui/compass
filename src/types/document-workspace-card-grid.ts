/**
 * CO-C1-DOCUMENT-WORKSPACE-CARD-GRID-012
 * Opening transaction-selection cards. Canonical IDs only for navigation.
 */

import type { DOCUMENT_WORKSPACE_CARD_GRID_CHIPS } from "@/constants/document-workspace-card-grid";

export type DocumentWorkspaceCardGridChipId =
  (typeof DOCUMENT_WORKSPACE_CARD_GRID_CHIPS)[number]["id"];

export type DocumentWorkspaceCardReadiness =
  | { available: false }
  | {
      available: true;
      percent: number;
      required: number;
      received: number;
      accepted: number;
      pending: number;
      rejected: number;
      expired: number;
      reviewPending: boolean;
      replacementOrRejection: boolean;
    };

export type DocumentWorkspaceCardGridFilters = {
  chip: DocumentWorkspaceCardGridChipId;
};

export type DocumentWorkspaceCardGridPersistedState = {
  query: string;
  filters: DocumentWorkspaceCardGridFilters;
  opportunityOffset: number;
  dealSearchPage: number;
  scrollTop: number;
  lastCardKey: string | null;
};

export type DocumentWorkspaceOpportunityGroupInput = {
  opportunityId: string;
  opportunityNumber: string;
  borrowerName: string;
  product: string;
  amountLabel: string;
  stage: string;
  lifecycleStatus: string;
  assignedRc: string;
  assignedUserId?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  contactId?: string | null;
  companyId?: string | null;
  deals: DocumentWorkspaceDealCardInput[];
};

export type DocumentWorkspaceDealCardInput = {
  dealId: string;
  dealNumber: string;
  opportunityId: string;
  opportunityNumber: string;
  borrowerName: string;
  lenderName: string;
  lenderId?: string | null;
  product: string;
  amountLabel: string;
  stage: string;
  assignedRc: string;
  createdAt: string | null;
  updatedAt: string | null;
  contactId?: string | null;
  companyId?: string | null;
};

export type DocumentWorkspaceOpportunityCard = {
  kind: "opportunity";
  key: string;
  opportunityId: string;
  dealId?: undefined;
  contactId?: string | null;
  companyId?: string | null;
  borrowerName: string;
  opportunityNumber: string;
  product: string;
  amountLabel: string;
  stage: string;
  assignedRc: string;
  assignedUserId?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  linkedDealCount: number;
  opportunityCreatedAt: string | null;
};

export type DocumentWorkspaceDealCard = {
  kind: "deal";
  key: string;
  opportunityId: string;
  dealId: string;
  contactId?: string | null;
  companyId?: string | null;
  borrowerName: string;
  opportunityNumber: string;
  dealNumber: string;
  lenderName: string;
  lenderId?: string | null;
  product: string;
  amountLabel: string;
  stage: string;
  assignedRc: string;
  createdAt: string | null;
  updatedAt: string | null;
  opportunityCreatedAt: string | null;
};

export type DocumentWorkspaceTransactionCard =
  | DocumentWorkspaceOpportunityCard
  | DocumentWorkspaceDealCard;

export type DocumentWorkspaceCardGroup = {
  opportunityId: string;
  opportunityCreatedAt: string | null;
  opportunityUpdatedAt: string | null;
  linkedDealCount: number;
  opportunity: DocumentWorkspaceOpportunityCard;
  deals: DocumentWorkspaceDealCard[];
};
