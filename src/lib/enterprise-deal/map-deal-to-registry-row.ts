/**
 * CO-ARCH-002-W4 — Map Enterprise Deal API → DealRegistryRow (active dual-read).
 * Used only when DEAL_REGISTRY_PORT_RUNTIME is ON.
 */
import { STAGE_LABELS } from "@/constants/loan-stage-master";
import { formatINR } from "@/lib/format-currency";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
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
  const stage = (deal.grossStage || "raw_lead") as PipelineStage;
  const rowId = deal.legacyLoanFileId || deal.id;

  return {
    id: rowId,
    enterpriseDealId: deal.id,
    dealId: deal.dealNumber,
    opportunityNumber:
      deal.opportunityNumber?.trim() ||
      deal.opportunityId ||
      deal.dealNumber,
    fileNumber: deal.fileNumber || deal.dealNumber,
    borrowerName: deal.primaryContactName || "—",
    contactNumber: deal.primaryContactMobile || "—",
    product: deal.productLabel || "—",
    loanAmount: amount,
    loanAmountLabel: formatINR(amount),
    assignedRm: deal.relationshipManagerName || "—",
    grossStage: stage,
    grossStageLabel: STAGE_LABELS[stage] ?? deal.grossStage,
    subStage: deal.subStage || "—",
    selectedLender: deal.primaryCounterpartyName || "—",
    expectedRevenue: 0,
    expectedRevenueLabel: formatINR(0),
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
    documentsPending: 0,
    tasksPending: 0,
    riskIndicator: "Low",
  };
}
