/**
 * CO-SPRINT-098 — Deal Registry projection from LoanFile SSOT.
 */

import type { LoanFile } from "@/types/catalyst-one";
import { STAGE_LABELS } from "@/constants/loan-stage-master";
import { getSubStatusLabel } from "@/constants/loan-stage-master";
import { opportunityNumberForFile } from "@/lib/enterprise-credit-workspace";
import { formatINR } from "@/lib/format-currency";
import type { DealRegistryFilters, DealRegistryRow, DealRegistrySortField } from "@/types/deal-registry";
import { DEMO_CURRENT_RM } from "@/constants/customer-360";

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

function lastActivityIso(file: LoanFile): string {
  return file.timeline?.[0]?.timestamp || file.createdAt || file.loginDate || "";
}

function riskFromFile(file: LoanFile): string {
  if (file.status === "delayed" || file.isDelayed) return "High";
  if (file.status === "at_risk" || file.isUrgent) return "Medium";
  return "Low";
}

function selectedLender(file: LoanFile): string {
  const primary = file.lenders?.find((l) => l.isPrimary)?.lender;
  return primary || file.lender || "—";
}

export function mapLoanFileToDealRegistryRow(file: LoanFile): DealRegistryRow {
  const last = lastActivityIso(file);
  const dealId = opportunityNumberForFile(file);
  const amount = file.requiredAmount || file.loanAmount || 0;
  const roi = file.finalRoi ?? file.interestRate ?? 0;
  const docsPending = (file.documents ?? []).filter((d) => d.status !== "verified").length;
  const tasksPending = (file.tasks ?? []).filter((t) => !t.completed).length;

  return {
    id: file.id,
    dealId,
    opportunityNumber: dealId,
    fileNumber: file.fileNumber,
    borrowerName: file.customerName,
    contactNumber: file.customerMobile || "—",
    product: file.loanProduct || "—",
    loanAmount: amount,
    loanAmountLabel: formatINR(amount),
    assignedRm: file.relationshipManager || "—",
    grossStage: file.stage,
    grossStageLabel: STAGE_LABELS[file.stage] ?? file.stage,
    subStage: getSubStatusLabel(file.stage, file.stageSubStatus) || "—",
    selectedLender: selectedLender(file),
    expectedRevenue: file.expectedRevenue ?? 0,
    expectedRevenueLabel: formatINR(file.expectedRevenue ?? 0),
    priority: file.priority,
    lastActivity: last,
    lastActivityLabel: formatWhenTime(last),
    dateCreated: file.createdAt || file.loginDate || "",
    dateCreatedLabel: formatWhen(file.createdAt || file.loginDate || ""),
    lastModified: last,
    lastModifiedLabel: formatWhen(last),
    status: file.status,
    statusLabel: String(file.status ?? "—").replace(/_/g, " "),
    city: file.city || "—",
    state: file.state || "—",
    source: file.source || file.sourceContactName || "—",
    channelPartner: file.sourceContactName || "—",
    creditExecutive: "—",
    operationsExecutive: "—",
    branch: file.lenders?.find((l) => l.isPrimary)?.branch || "—",
    sanctionAmount: file.sanctionAmount ?? 0,
    sanctionAmountLabel: formatINR(file.sanctionAmount ?? 0),
    disbursedAmount: file.disbursementAmount ?? 0,
    disbursedAmountLabel: formatINR(file.disbursementAmount ?? 0),
    roi,
    roiLabel: roi ? `${roi.toFixed(2)}%` : "—",
    tatDays: file.daysInStage ?? 0,
    nextFollowUp: "—",
    documentsPending: docsPending,
    tasksPending,
    riskIndicator: riskFromFile(file),
  };
}

export function listDealRegistryRows(files: LoanFile[]): DealRegistryRow[] {
  return files
    .filter((f) => f.stage !== undefined && !f.archived)
    .map(mapLoanFileToDealRegistryRow)
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}

export function filterDealRegistryRows(
  rows: DealRegistryRow[],
  filters: DealRegistryFilters,
  currentRm?: string,
): DealRegistryRow[] {
  const rm = currentRm?.trim() || DEMO_CURRENT_RM;
  const q = filters.search.trim().toLowerCase();
  const amountMin = filters.amountMin ? Number(filters.amountMin) : null;
  const amountMax = filters.amountMax ? Number(filters.amountMax) : null;
  const revenueMin = filters.revenueMin ? Number(filters.revenueMin) : null;
  const revenueMax = filters.revenueMax ? Number(filters.revenueMax) : null;
  const createdFrom = filters.dateCreatedFrom ? new Date(filters.dateCreatedFrom).getTime() : null;
  const createdTo = filters.dateCreatedTo ? new Date(filters.dateCreatedTo).getTime() : null;
  const updatedFrom = filters.lastUpdatedFrom ? new Date(filters.lastUpdatedFrom).getTime() : null;
  const updatedTo = filters.lastUpdatedTo ? new Date(filters.lastUpdatedTo).getTime() : null;
  const colBorrower = filters.columnBorrower.trim().toLowerCase();
  const colDeal = filters.columnDealId.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.scope === "my_deals" && row.assignedRm !== rm) return false;
    if (q) {
      const hay = [
        row.borrowerName,
        row.dealId,
        row.fileNumber,
        row.product,
        row.assignedRm,
        row.selectedLender,
        row.city,
        row.contactNumber,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.product !== "all" && row.product !== filters.product) return false;
    if (filters.grossStage !== "all" && row.grossStage !== filters.grossStage) return false;
    if (filters.subStage !== "all" && row.subStage !== filters.subStage) return false;
    if (filters.assignedRm !== "all" && row.assignedRm !== filters.assignedRm) return false;
    if (filters.lender !== "all" && row.selectedLender !== filters.lender) return false;
    if (filters.branch !== "all" && row.branch !== filters.branch) return false;
    if (filters.city !== "all" && row.city !== filters.city) return false;
    if (filters.state !== "all" && row.state !== filters.state) return false;
    if (filters.priority !== "all" && row.priority !== filters.priority) return false;
    if (filters.status !== "all" && row.status !== filters.status) return false;
    if (filters.source !== "all" && row.source !== filters.source) return false;
    if (amountMin != null && !Number.isNaN(amountMin) && row.loanAmount < amountMin) return false;
    if (amountMax != null && !Number.isNaN(amountMax) && row.loanAmount > amountMax) return false;
    if (revenueMin != null && !Number.isNaN(revenueMin) && row.expectedRevenue < revenueMin) {
      return false;
    }
    if (revenueMax != null && !Number.isNaN(revenueMax) && row.expectedRevenue > revenueMax) {
      return false;
    }
    if (createdFrom != null && !Number.isNaN(createdFrom)) {
      const t = new Date(row.dateCreated).getTime();
      if (Number.isNaN(t) || t < createdFrom) return false;
    }
    if (createdTo != null && !Number.isNaN(createdTo)) {
      const t = new Date(row.dateCreated).getTime();
      if (Number.isNaN(t) || t > createdTo + 86400000 - 1) return false;
    }
    if (updatedFrom != null && !Number.isNaN(updatedFrom)) {
      const t = new Date(row.lastActivity).getTime();
      if (Number.isNaN(t) || t < updatedFrom) return false;
    }
    if (updatedTo != null && !Number.isNaN(updatedTo)) {
      const t = new Date(row.lastActivity).getTime();
      if (Number.isNaN(t) || t > updatedTo + 86400000 - 1) return false;
    }
    if (colBorrower && !row.borrowerName.toLowerCase().includes(colBorrower)) return false;
    if (colDeal && !row.dealId.toLowerCase().includes(colDeal)) return false;
    return true;
  });
}

export function sortDealRegistryRows(
  rows: DealRegistryRow[],
  field: DealRegistrySortField,
  direction: "asc" | "desc",
): DealRegistryRow[] {
  const dir = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

export function uniqueDealValues(
  rows: DealRegistryRow[],
  key: keyof DealRegistryRow,
): string[] {
  return [
    ...new Set(
      rows
        .map((r) => String(r[key] ?? ""))
        .filter((v) => v && v !== "—"),
    ),
  ].sort();
}

export function exportDealRegistryCsv(rows: DealRegistryRow[]): string {
  const headers = [
    "Deal ID",
    "Borrower Name",
    "Product",
    "Loan Amount",
    "Assigned RM",
    "Gross Stage",
    "Sub Stage",
    "Selected Lender",
    "Expected Revenue",
    "Priority",
    "Last Activity",
    "Date Created",
    "Status",
    "Contact Number",
    "City",
    "Source",
    "Channel Partner",
    "Sanction Amount",
    "Disbursed Amount",
    "ROI",
    "TAT",
    "Documents Pending",
    "Tasks Pending",
    "Risk Indicator",
  ];
  const lines = rows.map((r) =>
    [
      r.dealId,
      r.borrowerName,
      r.product,
      r.loanAmount,
      r.assignedRm,
      r.grossStageLabel,
      r.subStage,
      r.selectedLender,
      r.expectedRevenue,
      r.priority,
      r.lastActivityLabel,
      r.dateCreatedLabel,
      r.statusLabel,
      r.contactNumber,
      r.city,
      r.source,
      r.channelPartner,
      r.sanctionAmount,
      r.disbursedAmount,
      r.roiLabel,
      r.tatDays,
      r.documentsPending,
      r.tasksPending,
      r.riskIndicator,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}
