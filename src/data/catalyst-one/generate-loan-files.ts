import { getStageIndex, getStageProgress, STAGE_ORDER } from "@/constants/loan-pipeline";
import {
  computeTopUpRequested,
  getSubStatusesForStage,
  PROPERTY_TYPES,
  SECURED_PRODUCTS,
  UNSECURED_PRODUCTS,
} from "@/constants/loan-stage-master";
import { getOccupancyOptionsForProduct } from "@/constants/occupancy-master";
import { isProductSecured } from "@/constants/product-master";
import { inferLendingTypeFromProduct } from "@/lib/loan-validation";
import { ORGANIZATION_REGISTRY } from "@/data/catalyst-one/organization-registry-seed";
import { CUSTOMER_SEED } from "@/data/catalyst-one/customer-seed";
import type {
  DocumentCheckStatus,
  LoanFile,
  LoanFileDocument,
  LoanFilePriority,
  LoanFileStatus,
  LoanFileTask,
  LoanFileTimelineEvent,
  PipelineStage,
  SavedViewPreset,
} from "@/types/catalyst-one";

export const LOAN_PRODUCTS = [...SECURED_PRODUCTS, ...UNSECURED_PRODUCTS] as const;

export const LOAN_LENDERS = [
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "SBI",
  "Kotak Mahindra",
  "IndusInd Bank",
  "Bajaj Finserv",
  "Federal Bank",
  "IDFC First Bank",
  "PNB Housing",
  "Tata Capital",
  "LIC Housing",
] as const;

export const LOAN_MANAGERS = [
  "Amit Sharma",
  "Priya Mehta",
  "Rahul Verma",
  "Neha Patel",
  "Sanjay Gupta",
  "Kavita Iyer",
  "Rohit Desai",
  "Anjali Nair",
] as const;

const DOC_NAMES = [
  "PAN",
  "Aadhaar",
  "Income Proof",
  "Bank Statement",
  "ITR",
  "GST",
  "Property Papers",
  "Sanction Letter",
  "Disbursement Letter",
] as const;

const TIMELINE_TITLES = [
  "Lead Created",
  "Pre Login",
  "Logged In",
  "Credit WIP",
  "Soft Approved",
  "Final Approved",
  "Closure WIP",
  "Loan Won",
] as const;

const TASK_POOL = [
  "Collect PAN",
  "Collect ITR",
  "Credit Query",
  "Site Visit",
  "Disbursement Follow-up",
  "Property Valuation",
  "Follow up with lender",
  "Raise commission invoice",
  "Verify bank statement",
  "Schedule legal vetting",
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pick<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function docStatus(stageIndex: number, docIndex: number, rand: () => number): DocumentCheckStatus {
  if (docIndex < stageIndex - 1) return rand() > 0.15 ? "verified" : "received";
  if (docIndex === stageIndex - 1) return rand() > 0.5 ? "received" : "pending";
  if (rand() > 0.92) return "rejected";
  return "pending";
}

function buildDocuments(stageIndex: number, rand: () => number): LoanFileDocument[] {
  return DOC_NAMES.map((name, i) => ({
    id: `doc-${name.toLowerCase().replace(/\s/g, "-")}`,
    name,
    status: docStatus(stageIndex, i, rand),
  }));
}

function buildTimeline(stage: PipelineStage, createdAt: Date, rand: () => number): LoanFileTimelineEvent[] {
  const stageIndex = getStageIndex(stage);
  return TIMELINE_TITLES.map((title, i) => {
    const completed = i <= stageIndex;
    const daysOffset = i * 4 + Math.floor(rand() * 3);
    const ts = new Date(createdAt);
    ts.setDate(ts.getDate() + daysOffset);
    return {
      id: `tl-${i}`,
      title,
      description: completed ? `${title} — completed` : undefined,
      timestamp: ts.toISOString(),
      completed,
    };
  });
}

function buildTasks(rm: string, stageIndex: number, rand: () => number, fileIndex: number, taskOffset: number): LoanFileTask[] {
  const priorities: LoanFilePriority[] = ["urgent", "high", "medium", "low"];
  const count = 2 + Math.floor(rand() * 2);
  return Array.from({ length: count }, (_, i) => {
    const due = new Date();
    due.setDate(due.getDate() + Math.floor(rand() * 14) - 5);
    return {
      id: `task-${fileIndex}-${taskOffset + i}`,
      title: pick(TASK_POOL, rand),
      priority: pick(priorities, rand),
      dueDate: due.toISOString(),
      assignedTo: rm,
      completed: i < stageIndex - 2 && rand() > 0.35,
    };
  });
}

function isPropertyProduct(product: string): boolean {
  return isProductSecured(product);
}

function isBusinessProduct(product: string): boolean {
  return product.includes("Business Loan") || product === "Working Capital";
}

export function generateLoanFiles(count = 100): LoanFile[] {
  const rand = seededRandom(2026);
  const stageDistribution: PipelineStage[] = [];

  STAGE_ORDER.forEach((stage) => {
    const stageCount = stage === "won" ? 4 : 12;
    for (let i = 0; i < stageCount; i++) stageDistribution.push(stage);
  });

  return Array.from({ length: count }, (_, index) => {
    const customer = CUSTOMER_SEED[index % CUSTOMER_SEED.length]!;
    const stage = stageDistribution[index] ?? "raw_lead";
    const stageIndex = getStageIndex(stage);
    const product = pick(LOAN_PRODUCTS, rand);
    const lender = pick(LOAN_LENDERS, rand);
    const rm = pick(LOAN_MANAGERS, rand);
    const amountBase =
      product.includes("Home") || product === "Loan Against Property" || product === "Construction Finance"
        ? 55_00_000
        : product.includes("Business Loan") || product === "Working Capital"
          ? 85_00_000
          : 18_00_000;
    const loanAmount = Math.round((amountBase * (0.55 + rand() * 1.35)) / 50_000) * 50_000;
    const requiredAmount = Math.round(loanAmount * (0.9 + rand() * 0.15));
    const revenuePercent = Math.round((0.8 + rand() * 0.8) * 100) / 100;
    const expectedRevenue = Math.round(loanAmount * (revenuePercent / 100));
    const revenueReceived =
      stage === "won"
        ? Math.round(expectedRevenue * (0.85 + rand() * 0.15))
        : stageIndex >= 6
          ? Math.round(expectedRevenue * (0.4 + rand() * 0.6))
          : 0;
    const daysInStage = Math.floor(rand() * 22) + 1;
    const isDelayed = daysInStage > 14 && stage !== "won";
    const isUrgent = rand() > 0.85 || isDelayed;
    const priority: LoanFilePriority = isUrgent ? "urgent" : rand() > 0.55 ? "high" : rand() > 0.35 ? "medium" : "low";

    let status: LoanFileStatus = "on_track";
    if (stage === "won") status = "completed";
    else if (isDelayed) status = "delayed";
    else if (rand() > 0.82) status = "at_risk";

    const created = new Date();
    created.setDate(created.getDate() - (25 + Math.floor(rand() * 70)));

    const loginDate = new Date(created);
    loginDate.setDate(loginDate.getDate() + 3 + Math.floor(rand() * 10));

    const expectedLogin = new Date(created);
    expectedLogin.setDate(expectedLogin.getDate() + 7);

    const disbursement = new Date();
    disbursement.setDate(disbursement.getDate() + Math.floor(rand() * 40) + 3);

    const sanctionAmount = stageIndex >= 5 ? Math.round(loanAmount * (0.92 + rand() * 0.08)) : 0;
    const disbursementAmount = stage === "won" ? Math.round(sanctionAmount * (0.85 + rand() * 0.15)) : 0;
    const finalLoanAmount =
      stageIndex >= 5 ? Math.round(loanAmount * (0.92 + rand() * 0.08)) : undefined;
    const lendingType = inferLendingTypeFromProduct(product);
    const transactionType = product.includes("Balance Transfer") || rand() > 0.75 ? "balance_transfer" : "fresh";
    const btOrg =
      transactionType === "balance_transfer" && lendingType === "secured"
        ? pick(ORGANIZATION_REGISTRY, rand)
        : null;
    const btAmount = btOrg ? Math.round(requiredAmount * (0.55 + rand() * 0.35)) : undefined;
    const subStatuses = getSubStatusesForStage(stage);
    const stageSubStatus = subStatuses.length > 0 ? pick(subStatuses, rand).id : undefined;
    const interestRate = Math.round((8 + rand() * 4.5) * 100) / 100;
    const tenure = pick([120, 180, 240, 300], rand);

    const propertyType = isPropertyProduct(product) ? pick([...PROPERTY_TYPES], rand) : undefined;
    const occupancyOptions = isPropertyProduct(product) ? getOccupancyOptionsForProduct(product) : [];
    const occupancyId =
      occupancyOptions.length > 0 ? pick(occupancyOptions, rand).id : undefined;
    const approxPropertyValue = isPropertyProduct(product)
      ? Math.round(loanAmount * (1.1 + rand() * 0.3))
      : undefined;

    const businessDetails = isBusinessProduct(product)
      ? {
          companyName: customer.name.includes("Pvt") || customer.name.includes("LLP") ? customer.name : `${customer.name.split(" ")[0]} Enterprises`,
          constitution: pick(["Proprietorship", "Partnership", "Pvt Ltd", "LLP"], rand),
          gst: `27${String(Math.floor(rand() * 900000000) + 100000000)}Z${String.fromCharCode(65 + Math.floor(rand() * 26))}`,
          annualTurnover: Math.round(loanAmount * (2 + rand() * 3)),
          businessVintage: Math.floor(rand() * 15) + 2,
        }
      : undefined;

    const taskOffset = index * 3;

    const referralCustomer =
      rand() > 0.35
        ? CUSTOMER_SEED[(index + 7) % CUSTOMER_SEED.length]!
        : null;
    const sourceChannels = ["Referral", "Direct", "Digital Lead", "Partner", "Walk-in"] as const;

    return {
      id: `lf-${String(index + 1).padStart(3, "0")}`,
      fileNumber: `RC-2026-${String(1000 + index)}`,
      customerId: customer.id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      customerEmail: customer.email,
      city: customer.city,
      state: customer.state,
      employmentType: customer.employmentType,
      lendingType,
      transactionType,
      loanProduct: product,
      loanAmount,
      requiredAmount,
      finalLoanAmount,
      lender,
      stage,
      stageSubStatus,
      relationshipManager: rm,
      priority,
      daysInStage,
      expectedRevenue,
      revenuePercent,
      revenueReceived,
      expectedDisbursement: disbursement.toISOString(),
      loginDate: loginDate.toISOString(),
      expectedLoginDate: expectedLogin.toISOString(),
      sanctionAmount,
      disbursementAmount,
      interestRate,
      tenure,
      status,
      progress: getStageProgress(stage),
      createdAt: created.toISOString(),
      propertyType,
      occupancyId,
      approxPropertyValue,
      businessDetails,
      coApplicant: rand() > 0.55 ? `${customer.name.split(" ")[0]} Co-applicant` : undefined,
      coApplicantId:
        rand() > 0.55
          ? CUSTOMER_SEED[(index + 3) % CUSTOMER_SEED.length]!.id
          : undefined,
      guarantor: rand() > 0.7 ? `${customer.name.split(" ")[0]} Guarantor` : undefined,
      guarantorId:
        rand() > 0.7 ? CUSTOMER_SEED[(index + 11) % CUSTOMER_SEED.length]!.id : undefined,
      source: referralCustomer ? "Referral" : pick(sourceChannels, rand),
      sourceContactId: referralCustomer?.id,
      sourceContactName: referralCustomer?.name,
      btInstitutionId: btOrg?.id,
      btInstitutionName: btOrg?.name,
      btAmount,
      topUpRequested: btAmount ? computeTopUpRequested(requiredAmount, btAmount) : undefined,
      settlementCompleted: stage === "won" && rand() > 0.5,
      documents: buildDocuments(stageIndex, rand),
      tasks: buildTasks(rm, stageIndex, rand, index, taskOffset),
      timeline: buildTimeline(stage, created, rand),
      internalNotes: `${product} with ${lender}. RM ${rm}. ${isDelayed ? "SLA breached — needs attention." : "On track."}`,
      isUrgent,
      isDelayed,
      archived: false,
    };
  });
}

export const defaultSavedViews: SavedViewPreset[] = [
  { id: "all", label: "All Files" },
  { id: "my_files", label: "My Files" },
  { id: "home_loans", label: "Home Loans" },
  { id: "business_loans", label: "Business Loans" },
  { id: "lap", label: "LAP" },
  { id: "high_revenue", label: "High Revenue" },
  { id: "delayed", label: "Delayed" },
  { id: "disbursement_today", label: "Disbursement Today" },
  { id: "urgent", label: "Urgent" },
];

export const loanFileStatusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "on_track", label: "On Track" },
  { value: "at_risk", label: "At Risk" },
  { value: "delayed", label: "Delayed" },
  { value: "completed", label: "Completed" },
] as const;

export const loanFilePriorityOptions = [
  { value: "all", label: "All Priorities" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;
