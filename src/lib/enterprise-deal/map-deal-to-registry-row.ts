/**
 * CO-ARCH-002-W4 — Map Enterprise Deal API → DealRegistryRow (active dual-read).
 * Used only when DEAL_REGISTRY_PORT_RUNTIME is ON.
 */
import { STAGE_LABELS } from "@/constants/loan-stage-master";
import {
  LENDER_CASE_STAGE_LABELS,
  normalizeLenderCaseStage,
} from "@/constants/lender-pipeline";
import { formatINR } from "@/lib/format-currency";
import { coalesceAssignedUsers, formatAssignedUsersLabel } from "@/lib/assigned-users";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import { resolveDealStageProjection } from "@/lib/enterprise-deal/deal-stage-projection";
import { borrowerDisplayNameOrDash } from "@/lib/enterprise-borrower-identity";
import type { DealRegistryRow } from "@/types/deal-registry";
import type { LoanFilePriority, LoanFileStatus, PipelineStage } from "@/types/catalyst-one";

function formatWhen(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatWhenTime(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function asPriority(value?: string): LoanFilePriority {
  if (value === "urgent" || value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return "medium";
}

function asStatus(value?: string): LoanFileStatus | string {
  if (
    value === "on_track" ||
    value === "at_risk" ||
    value === "delayed" ||
    value === "completed"
  ) {
    return value;
  }
  return value ?? "on_track";
}

export function mapEnterpriseDealToDealRegistryRow(
  deal: EnterpriseDealApiRecord,
): DealRegistryRow {
  const amount = deal.requestedAmount ?? 0;
  const last = deal.updatedAt || deal.createdAt || "";
  const lenderStage = normalizeLenderCaseStage(deal.grossStage);
  const stage = resolveDealStageProjection(deal) || ("raw_lead" as PipelineStage);
  const stageLabel =
    LENDER_CASE_STAGE_LABELS[lenderStage] ??
    STAGE_LABELS[stage] ??
    deal.grossStage;
  const rowId = deal.legacyLoanFileId || deal.id;
  const assignedUsers = coalesceAssignedUsers({
    lendingExtension: deal.lendingExtension,
    primaryOwnerUserId: deal.primaryOwnerUserId,
    relationshipManagerUserId: deal.relationshipManagerUserId,
    relationshipManagerName: deal.relationshipManagerName,
  });

  const snap =
    deal.snapshot && typeof deal.snapshot === "object"
      ? (deal.snapshot as Record<string, unknown>)
      : {};
  const expectedRevenue =
    typeof snap.expectedRevenue === "number"
      ? snap.expectedRevenue
      : typeof snap.expectedCommission === "number"
        ? snap.expectedCommission
        : 0;
  const documentsPending =
    typeof snap.pendingDocumentCount === "number"
      ? snap.pendingDocumentCount
      : typeof snap.pendingCustomerDocuments === "number"
        ? snap.pendingCustomerDocuments
        : 0;

  return {
    id: rowId,
    enterpriseDealId: deal.id,
    opportunityId: deal.opportunityId?.trim() || undefined,
    dealId: deal.dealNumber,
    opportunityNumber:
      deal.opportunityNumber?.trim() ||
      deal.opportunityId ||
      deal.dealNumber,
    customerType: undefined,
    fileNumber: deal.fileNumber || deal.dealNumber,
    borrowerName: borrowerDisplayNameOrDash(deal),
    contactNumber: deal.primaryContactMobile || "—",
    product: deal.productLabel || "—",
    loanAmount: amount,
    loanAmountLabel: formatINR(amount),
    assignedRm: formatAssignedUsersLabel(assignedUsers),
    assignedUsers,
    rowVersion: deal.rowVersion,
    lendingExtension:
      deal.lendingExtension && typeof deal.lendingExtension === "object"
        ? (deal.lendingExtension as Record<string, unknown>)
        : null,
    grossStage: stage,
    lenderCaseStage: lenderStage,
    grossStageLabel: stageLabel,
    subStage: deal.subStage || "—",
    selectedLender: deal.primaryCounterpartyName || "—",
    expectedRevenue,
    expectedRevenueLabel: formatINR(expectedRevenue),
    priority: asPriority(deal.priority),
    lastActivity: last,
    lastActivityLabel: formatWhenTime(last),
    dateCreated: deal.createdAt || "",
    dateCreatedLabel: formatWhen(deal.createdAt || ""),
    lastModified: last,
    lastModifiedLabel: formatWhen(last),
    status: asStatus(deal.operationalStatus),
    statusLabel: String(deal.operationalStatus ?? "—").replace(/_/g, " "),
    city: "—",
    state: "—",
    source: "—",
    channelPartner: "—",
    creditExecutive: "—",
    operationsExecutive: "—",
    branch: "—",
    sanctionAmount: deal.approvedAmount ?? 0,
    sanctionAmountLabel: formatINR(deal.approvedAmount ?? 0),
    disbursedAmount: deal.fulfilledAmount ?? 0,
    disbursedAmountLabel: formatINR(deal.fulfilledAmount ?? 0),
    roi: 0,
    roiLabel: "—",
    tatDays: 0,
    nextFollowUp: "—",
    documentsPending,
    tasksPending: 0,
    riskIndicator: "Low",
  };
}
