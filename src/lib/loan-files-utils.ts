import { STAGE_LABELS } from "@/constants/loan-pipeline";
import { CUSTOMER_SEED } from "@/data/catalyst-one/customer-seed";
import { getInitialLoanFiles } from "@/data/catalyst-one/loan-files";
import { loadLoanFiles } from "@/lib/loan-files-storage";
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
  const expectedRevenue = Math.round(input.loanAmount * (revenuePercent / 100));

  return {
    id,
    fileNumber: `RC-2026-${String(2000 + index)}`,
    customerId: input.customerId ?? `c-new-${Date.now()}`,
    customerName: input.customerName,
    customerMobile: input.customerMobile,
    customerEmail: input.customerEmail,
    city: input.city,
    state: input.state,
    employmentType: input.employmentType,
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
    property: input.propertyDetails?.address,
    propertyDetails: input.propertyDetails,
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
