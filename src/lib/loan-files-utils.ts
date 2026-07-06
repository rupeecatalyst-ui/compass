import { STAGE_LABELS } from "@/constants/loan-pipeline";
import {
  getStageProgress,
  getSubStatusLabel,
} from "@/constants/loan-stage-master";
import { getRevenueBaseAmount } from "@/lib/loan-amount-utils";
import { loadLoanFiles, saveLoanFiles } from "@/lib/loan-files-storage";
import {
  applyWonTransition,
  inferLendingTypeFromProduct,
  normalizeLoanFile,
  validateLoanFile,
} from "@/lib/loan-validation";
import { CUSTOMER_SEED } from "@/data/catalyst-one/customer-seed";
import { getInitialLoanFiles } from "@/data/catalyst-one/loan-files";
import type { CustomerLoanStats, LoanFile } from "@/types/catalyst-one";

export function getAllLoanFiles(): LoanFile[] {
  if (typeof window === "undefined") return getInitialLoanFiles();
  return loadLoanFiles();
}

export function computeCustomerLoanStats(customerId: string, files?: LoanFile[]): CustomerLoanStats {
  const all = files ?? getAllLoanFiles();
  const customerFiles = all.filter((f) => f.customerId === customerId && !f.archived);
  if (customerFiles.length === 0) {
    return { loanCount: 0, totalLoanAmount: 0, currentStage: "—", expectedRevenue: 0 };
  }
  const latest = customerFiles.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0]!;
  return {
    loanCount: customerFiles.length,
    totalLoanAmount: customerFiles.reduce((s, f) => s + f.loanAmount, 0),
    currentStage: STAGE_LABELS[latest.stage],
    expectedRevenue: customerFiles.reduce((s, f) => s + f.expectedRevenue, 0),
  };
}

export interface GlobalSearchResult {
  id: string;
  type: "loan" | "customer";
  title: string;
  subtitle: string;
  href: string;
}

export function searchGlobal(query: string, files?: LoanFile[]): GlobalSearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const allFiles = files ?? getAllLoanFiles();
  const results: GlobalSearchResult[] = [];

  allFiles
    .filter((f) => !f.archived)
    .forEach((f) => {
      const haystack = [
        f.customerName,
        f.fileNumber,
        f.customerMobile,
        f.relationshipManager,
        f.lender,
        f.city,
        f.loanProduct,
        f.businessDetails?.companyName ?? "",
        f.customerEmail ?? "",
        f.state ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (haystack.includes(q)) {
        results.push({
          id: f.id,
          type: "loan",
          title: `${f.customerName} · ${f.fileNumber}`,
          subtitle: `${f.loanProduct} · ${f.lender}`,
          href: `/loan-files?file=${f.id}`,
        });
      }
    });

  CUSTOMER_SEED.forEach((c) => {
    const haystack = [c.name, c.mobile, c.email, c.city, c.state].join(" ").toLowerCase();
    if (haystack.includes(q)) {
      results.push({
        id: c.id,
        type: "customer",
        title: c.name,
        subtitle: `${c.city} · ${c.mobile}`,
        href: `/customers?customer=${c.id}`,
      });
    }
  });

  return results.slice(0, 12);
}

export function exportLoanFilesCsv(files: LoanFile[]): string {
  const headers = [
    "File Number",
    "Customer",
    "Product",
    "Amount",
    "Stage",
    "Lender",
    "RM",
    "Priority",
    "Expected Revenue",
  ];
  const rows = files.map((f) =>
    [
      f.fileNumber,
      f.customerName,
      f.loanProduct,
      f.loanAmount,
      STAGE_LABELS[f.stage],
      f.lender,
      f.relationshipManager,
      f.priority,
      f.expectedRevenue,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function createLoanFileFromInput(
  input: import("@/types/catalyst-one").CreateLoanFileInput,
  existingFiles: LoanFile[],
): LoanFile {
  const index = existingFiles.length;
  const id = `lf-${String(index + 1).padStart(3, "0")}`;
  const now = new Date().toISOString();
  const revenuePercent = 1.2;
  const lendingType = input.lendingType ?? inferLendingTypeFromProduct(input.loanProduct);
  const transactionType = input.transactionType ?? "fresh";
  const revenueBase = input.requiredAmount || input.loanAmount;
  const expectedRevenue = Math.round(revenueBase * (revenuePercent / 100));

  const file: LoanFile = {
    id,
    fileNumber: `RC-2026-${String(2000 + index)}`,
    customerId: input.customerId ?? `c-new-${Date.now()}`,
    customerName: input.customerName,
    customerMobile: input.customerMobile,
    customerEmail: input.customerEmail,
    city: input.city,
    state: input.state,
    employmentType: input.employmentType,
    lendingType,
    transactionType,
    loanProduct: input.loanProduct,
    loanAmount: input.loanAmount,
    requiredAmount: input.requiredAmount,
    lender: input.lender,
    stage: "raw_lead",
    relationshipManager: input.relationshipManager,
    priority: input.priority,
    daysInStage: 0,
    expectedRevenue,
    revenuePercent,
    revenueReceived: 0,
    expectedDisbursement: new Date(Date.now() + 30 * 86400000).toISOString(),
    loginDate: input.loginDate,
    expectedLoginDate: input.expectedLoginDate,
    sanctionAmount: 0,
    disbursementAmount: 0,
    interestRate: 9.5,
    tenure: 240,
    status: "on_track",
    progress: 11,
    createdAt: now,
    propertyType: input.propertyType,
    approxPropertyValue: input.approxPropertyValue,
    businessDetails: input.businessDetails,
    documents: [
      "PAN",
      "Aadhaar",
      "Income Proof",
      "Bank Statement",
      "ITR",
      "GST",
      "Property Papers",
      "Sanction Letter",
      "Disbursement Letter",
    ].map((name) => ({ id: `doc-${name}`, name, status: "pending" as const })),
    tasks: [
      {
        id: `task-new-${index}-0`,
        title: "Collect PAN",
        priority: "high",
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
        assignedTo: input.relationshipManager,
        completed: false,
      },
    ],
    timeline: [
      {
        id: "tl-0",
        title: "Lead Created",
        description: "New loan file created",
        timestamp: now,
        completed: true,
      },
    ],
    internalNotes: input.internalNotes,
    isUrgent: input.priority === "urgent",
    isDelayed: false,
    archived: false,
  };

  return normalizeLoanFile(file);
}

export function duplicateLoanFile(file: LoanFile, existingCount: number): LoanFile {
  const copy = structuredClone(file);
  copy.id = `lf-dup-${Date.now()}`;
  copy.fileNumber = `RC-2026-${String(3000 + existingCount)}`;
  copy.stage = "raw_lead";
  copy.daysInStage = 0;
  copy.progress = 11;
  copy.status = "on_track";
  copy.createdAt = new Date().toISOString();
  return copy;
}

/** Single save path — updates storage and notifies all consumers. */
export function updateLoanFileInStorage(
  fileId: string,
  patch: Partial<LoanFile>,
  timelineNote?: string,
): LoanFile | null {
  const files = loadLoanFiles();
  const index = files.findIndex((f) => f.id === fileId);
  if (index < 0) return null;

  const existing = files[index]!;
  const timeline = timelineNote
    ? [
        {
          id: `tl-upd-${Date.now()}`,
          title: "Loan Updated",
          description: timelineNote,
          timestamp: new Date().toISOString(),
          completed: true,
        },
        ...existing.timeline,
      ]
    : existing.timeline;

  let merged: LoanFile = normalizeLoanFile({ ...existing, ...patch, timeline });

  const validation = validateLoanFile(merged, existing);
  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  if (merged.stage === "won" && existing.stage !== "won") {
    merged = applyWonTransition(merged);
  }

  const revenueBase = getRevenueBaseAmount(merged);
  merged.expectedRevenue = Math.round(revenueBase * (merged.revenuePercent / 100));

  const next = [...files];
  next[index] = merged;
  saveLoanFiles(next);
  return merged;
}

/** Build patch for an immediate stage transition (timeline + kanban fields). */
export function buildStageChangePatch(
  existing: LoanFile,
  newStage: import("@/types/catalyst-one").PipelineStage,
): Partial<LoanFile> | null {
  if (existing.stage === newStage) return null;

  const timelineEvent = {
    id: `tl-stage-${Date.now()}`,
    title: "Stage changed",
    description: `${STAGE_LABELS[existing.stage]} → ${STAGE_LABELS[newStage]}`,
    timestamp: new Date().toISOString(),
    completed: true,
  };

  return {
    stage: newStage,
    stageSubStatus: undefined,
    daysInStage: 0,
    progress: getStageProgress(newStage),
    status:
      newStage === "won"
        ? "completed"
        : existing.status === "completed"
          ? "on_track"
          : existing.status,
    timeline: [timelineEvent, ...existing.timeline],
  };
}

/** Build patch for a sub-stage update (stage unchanged). */
export function buildSubStageChangePatch(
  existing: LoanFile,
  subStatusId: string | undefined,
): Partial<LoanFile> | null {
  if (existing.stageSubStatus === subStatusId) return null;

  const prevLabel = getSubStatusLabel(existing.stage, existing.stageSubStatus) ?? "—";
  const nextLabel = getSubStatusLabel(existing.stage, subStatusId) ?? "—";

  const timelineEvent = {
    id: `tl-sub-${Date.now()}`,
    title: "Sub stage updated",
    description: `${prevLabel} → ${nextLabel}`,
    timestamp: new Date().toISOString(),
    completed: true,
  };

  return {
    stageSubStatus: subStatusId,
    timeline: [timelineEvent, ...existing.timeline],
  };
}
