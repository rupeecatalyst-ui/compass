"use client";

import { LoanWorkspaceModal, type LoanWorkspaceModalProps } from "@/components/catalyst-one/shared/loan-workspace-modal";

/** Loan Board adapter — delegates to shared Loan Workspace (CRC-005). */
export function LoanBoardDetailModal(props: LoanWorkspaceModalProps) {
  return <LoanWorkspaceModal {...props} />;
}
