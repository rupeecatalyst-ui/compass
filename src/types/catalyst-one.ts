/** Catalyst One — Loan Operating System module types */

export type PipelineStage =
  | "raw_lead"
  | "pre_login"
  | "logged_in"
  | "credit_wip"
  | "soft_approval"
  | "final_approval"
  | "disbursement"
  | "invoice_raised"
  | "payout_received";

export interface PipelineStageData {
  id: PipelineStage;
  label: string;
  count: number;
  value: number;
}

export interface ExecutiveKpi {
  id: string;
  label: string;
  value: string;
  subValue?: string;
  trend?: { direction: "up" | "down" | "neutral"; label: string };
  icon: string;
  accent?: "primary" | "accent" | "warning" | "info";
}

export interface TodaysWorkItem {
  id: string;
  title: string;
  count: number;
  description: string;
  priority: "high" | "medium" | "low";
  href?: string;
}

export interface ActivityEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "loan" | "customer" | "document" | "disbursement" | "task" | "system";
  actor?: string;
}

export type CustomerStatus =
  | "active"
  | "in_progress"
  | "sanctioned"
  | "disbursed"
  | "closed"
  | "dropped";

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  city: string;
  state?: string;
  employmentType?: string;
  loanProduct: string;
  lender: string;
  loanAmount: number;
  status: CustomerStatus;
  relationshipManager: string;
  createdAt: string;
}

/** Aggregated loan stats for customer master (derived from loan files) */
export interface CustomerLoanStats {
  loanCount: number;
  totalLoanAmount: number;
  currentStage: string;
  expectedRevenue: number;
}

export type CustomerSortField = keyof Pick<
  Customer,
  "name" | "city" | "loanProduct" | "lender" | "loanAmount" | "status" | "relationshipManager" | "createdAt"
>;

export type SortDirection = "asc" | "desc";

export interface CustomerFilters {
  status: CustomerStatus | "all";
  loanProduct: string;
  lender: string;
  relationshipManager: string;
}

/** Loan File Management — Sprint 3 */

export type LoanFileView = "kanban" | "list" | "timeline" | "analytics" | "tasks";

export type LoanFilePriority = "urgent" | "high" | "medium" | "low";

export type LoanFileStatus = "on_track" | "at_risk" | "delayed" | "completed";

export type DocumentCheckStatus = "pending" | "received" | "verified" | "rejected";

export interface LoanFileDocument {
  id: string;
  name: string;
  status: DocumentCheckStatus;
}

export interface LoanFileTask {
  id: string;
  title: string;
  priority: LoanFilePriority;
  dueDate: string;
  assignedTo: string;
  completed: boolean;
}

export interface LoanFileTimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  completed: boolean;
}

export interface LoanFileProperty {
  propertyType?: string;
  builder?: string;
  project?: string;
  marketValue?: number;
  agreementValue?: number;
  address?: string;
}

export interface LoanFileBusiness {
  companyName?: string;
  constitution?: string;
  gst?: string;
  annualTurnover?: number;
  businessVintage?: number;
}

export interface LoanFile {
  id: string;
  fileNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  city: string;
  state: string;
  employmentType: string;
  loanProduct: string;
  loanAmount: number;
  requiredAmount: number;
  lender: string;
  stage: PipelineStage;
  relationshipManager: string;
  priority: LoanFilePriority;
  daysInStage: number;
  expectedRevenue: number;
  revenuePercent: number;
  revenueReceived: number;
  expectedDisbursement: string;
  loginDate: string;
  expectedLoginDate: string;
  sanctionAmount: number;
  disbursementAmount: number;
  interestRate: number;
  tenure: number;
  status: LoanFileStatus;
  progress: number;
  createdAt: string;
  property?: string;
  propertyDetails?: LoanFileProperty;
  businessDetails?: LoanFileBusiness;
  coApplicant?: string;
  documents: LoanFileDocument[];
  tasks: LoanFileTask[];
  timeline: LoanFileTimelineEvent[];
  internalNotes: string;
  isUrgent: boolean;
  isDelayed: boolean;
  archived?: boolean;
}

export interface SavedViewPreset {
  id: string;
  label: string;
  isCustom?: boolean;
}

export interface CreateLoanFileInput {
  customerId?: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  city: string;
  state: string;
  employmentType: string;
  loanProduct: string;
  loanAmount: number;
  requiredAmount: number;
  lender: string;
  relationshipManager: string;
  priority: LoanFilePriority;
  loginDate: string;
  expectedLoginDate: string;
  internalNotes: string;
  propertyDetails?: LoanFileProperty;
  businessDetails?: LoanFileBusiness;
}

export type LoanFileSortField = keyof Pick<
  LoanFile,
  | "customerName"
  | "loanProduct"
  | "loanAmount"
  | "lender"
  | "stage"
  | "relationshipManager"
  | "createdAt"
  | "expectedRevenue"
  | "status"
>;

export interface LoanFileFilters {
  stage: PipelineStage | "all";
  loanProduct: string;
  lender: string;
  relationshipManager: string;
  priority: LoanFilePriority | "all";
  status: LoanFileStatus | "all";
}

export interface LoanFileColumnStats {
  stage: PipelineStage;
  label: string;
  count: number;
  totalValue: number;
  urgentCount: number;
  delayedCount: number;
}

