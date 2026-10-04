/**
 * CO-C1-CONTEXT-LOCKED-DOCUMENT-WORKSPACE-008
 * Canonical transaction lock for Document Workspace. IDs only — never names/mobile/email.
 */

import type { DocumentWorkspaceOwnerTabId } from "@/constants/document-workspace";

export type DocumentWorkspaceLockErrorCode =
  | "MISSING_TRANSACTION"
  | "INVALID_ID"
  | "NAME_OR_PII_RESOLUTION_FORBIDDEN"
  | "CROSS_ORGANIZATION"
  | "OPPORTUNITY_DEAL_MISMATCH"
  | "CONTACT_OPPORTUNITY_MISMATCH"
  | "COMPANY_OPPORTUNITY_MISMATCH"
  | "NOT_FOUND"
  | "DELETED"
  | "UNAUTHORIZED"
  | "STALE_CONTEXT";

export type DocumentWorkspaceContextInput = {
  organizationId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  opportunityId?: string | null;
  dealId?: string | null;
  ownerTab?: string | null;
  documentId?: string | null;
  ownerUserId?: string | null;
  scope?: string | null;
};

export type DocumentWorkspaceResolvedContext = {
  organizationId: string;
  contactId: string | null;
  companyId: string | null;
  opportunityId: string;
  opportunityNumber: string | null;
  dealId: string | null;
  dealNumber: string | null;
  lenderName: string | null;
  customerName: string | null;
  companyName: string | null;
  product: string | null;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  workflowStage: string | null;
  fingerprint: string;
};

export type DocumentWorkspaceRestoreState = {
  ownerTab: DocumentWorkspaceOwnerTabId;
  documentId: string | null;
  selectedIds: string[];
  tableScroll: number;
  actionOpen: boolean;
  previewOpen: boolean;
};

export type DocumentWorkspaceLockFailure = {
  ok: false;
  code: DocumentWorkspaceLockErrorCode;
  message: string;
};

export type DocumentWorkspaceLockSuccess = {
  ok: true;
  context: DocumentWorkspaceResolvedContext;
};

export type DocumentWorkspaceLockResult =
  | DocumentWorkspaceLockSuccess
  | DocumentWorkspaceLockFailure;
