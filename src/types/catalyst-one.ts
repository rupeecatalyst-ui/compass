/** Catalyst One — Loan Operating System module types */

export type PipelineStage =
  | "raw_lead"
  | "pre_login"
  | "logged_in"
  | "credit_wip"
  | "soft_approved"
  | "final_approved"
  | "closure_wip"
  | "won";

export type LendingType = "secured" | "unsecured" | "hybrid";

export type TransactionType = "fresh" | "balance_transfer";

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
  baseValue?: number;
  priorValue?: number;
  valueType?: "currency_cr" | "currency_l" | "count";
  subValue?: string;
  trend?: { direction: "up" | "down" | "neutral"; label: string };
  sparkline?: number[];
  icon: string;
  accent?: "primary" | "accent" | "warning" | "info";
  href?: string;
  placeholder?: boolean;
}

export type LoginTrendPeriod = "week" | "month" | "quarter" | "year";

export interface LoginTrendPoint {
  label: string;
  logins: number;
  date: string;
}

export type TargetScope = "relationship_manager" | "branch_head" | "ceo";

export interface TargetGaugeData {
  id: string;
  label: string;
  target: number;
  achieved: number;
  unit: "currency_cr";
}

export interface NewArrivalRow {
  id: string;
  fileId: string;
  customerName: string;
  source: string;
  product: string;
  loanAmount: number;
  assignedRm?: string;
  currentStage?: string;
  createdAt: string;
}

export interface FocusTile {
  id: string;
  label: string;
  count: number;
  urgency: "critical" | "high" | "medium";
  href: string;
}

export interface DashboardTaskItem {
  id: string;
  title: string;
  type: "call" | "meeting" | "document" | "credit" | "disbursement";
  time: string;
  href: string;
  bucket: "overdue" | "today" | "upcoming";
}

export type DashboardPersona = "ceo" | "relationship_manager" | "credit_manager" | "operations";

export interface DashboardLayoutConfig {
  persona: DashboardPersona;
  greetingHint: string;
  showTargetGauges: boolean;
  showPerformanceChart: "revenue" | "disbursement" | false;
  kpiIds: string[];
  focusTileIds: string[];
}

export interface ExecutivePipelineStage {
  id: PipelineStage | "disbursed_executive";
  label: string;
  count: number;
  value: number;
  color: string;
  conversion?: number;
}

export interface PipelineFunnelStage extends ExecutivePipelineStage {
  conversion: number;
}

export interface LeadArrivalPoint {
  label: string;
  leads: number;
  date: string;
}

export interface PendingApproval {
  id: string;
  customerName: string;
  product: string;
  loanAmount: number;
  stage: string;
  stageVariant: "warning" | "info" | "accent" | "default";
  ageing: string;
  fileId: string;
}

export interface RmPerformanceRow {
  id: string;
  name: string;
  initials: string;
  activeFiles: number;
  sanctions: number;
  disbursements: number;
  conversion: number;
}

export interface DashboardLoanFileRow extends NewArrivalRow {
  ageing: string;
  priority: "urgent" | "high" | "medium" | "low";
}

export interface TargetProgressData {
  id: string;
  label: string;
  target: number;
  achieved: number;
  projected: number;
  unit: "currency_cr";
}

export interface TrendPoint {
  label: string;
  value: number;
  date: string;
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
  fileId?: string;
  href?: string;
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

/** Customer Relationship Centre — Sprint 10 */

export type CustomerHealth =
  | "healthy"
  | "attention_required"
  | "dormant"
  | "inactive"
  | "risk";

export type CustomerTag =
  | "VIP"
  | "Repeat Customer"
  | "High Value"
  | "MSME"
  | "Builder"
  | "Doctor"
  | "CA"
  | "NRI"
  | "Priority";

export type CustomerListView = "list" | "card" | "compact";

export type CustomerActiveFilter = "all" | "active" | "inactive";

export type DocumentCheckStatus = "pending" | "requested" | "received" | "verified" | "rejected";

export type ExecutionTaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type LenderExecutionStatus = "active" | "closed";

export interface LoanLenderExecution {
  id: string;
  lender: string;
  branch?: string;
  relationshipManager?: string;
  loginDate?: string;
  applicationNumber?: string;
  status: LenderExecutionStatus;
  subStatus?: string;
  remarks?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type CustomerRelationshipType =
  | "co_applicant"
  | "guarantor"
  | "director"
  | "partner"
  | "family";

export interface CustomerRelationship {
  id: string;
  type: CustomerRelationshipType;
  name: string;
  mobile?: string;
  relation?: string;
  linkedCustomerId?: string;
}

export interface CustomerAddress {
  type: "registered" | "correspondence" | "office";
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface CustomerDocument {
  id: string;
  name: string;
  status: DocumentCheckStatus;
  uploadedAt: string;
  category: string;
  uploadedBy?: string;
  version?: number;
}

export interface CustomerAuditEntry {
  id: string;
  action: string;
  description?: string;
  timestamp: string;
  actor: string;
  source: "system" | "user";
  loanFileId?: string;
}

export interface CustomerTimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  type: "call" | "email" | "meeting" | "stage_move" | "note" | "task" | "document";
  actor?: string;
  loanFileId?: string;
}

export interface CustomerNote {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
  pinned: boolean;
}

export interface Customer360Detail {
  company: string;
  pan: string;
  aadhaar: string;
  gst?: string;
  constitution?: string;
  occupation: string;
  incomeBand: string;
  leadSource: string;
  tags: CustomerTag[];
  health: CustomerHealth;
  relationshipScore: number;
  isActive: boolean;
  lastContact: string;
  customerSince: string;
  addresses: CustomerAddress[];
  relationships: CustomerRelationship[];
  documents: CustomerDocument[];
  timeline: CustomerTimelineEvent[];
  notes: CustomerNote[];
  annualTurnover?: number;
  businessVintage?: number;
  creditScore?: number;
  riskRating?: "low" | "medium" | "high";
  kycStatus?: "pending" | "partial" | "verified" | "expired";
  auditTrail?: CustomerAuditEntry[];
}

export interface CustomerProfile extends Customer, Customer360Detail {}

export interface Customer360Metrics {
  activeLoans: number;
  totalLoanValue: number;
  revenueGenerated: number;
  pipelineValue: number;
  completedLoans: number;
  pendingTasks: number;
  outstanding: number;
  expectedRevenue: number;
  profitability: number;
  crossSellOpportunities: number;
}

export interface CustomerRelationshipSummary {
  activeLoans: number;
  closedLoans: number;
  expectedRevenue: number;
  receivedRevenue: number;
  outstandingRevenue: number;
  crossSellOpportunities: number;
}

export type CustomerListColumnKey =
  | "customer"
  | "mobile"
  | "company"
  | "city"
  | "rm"
  | "activeLoans"
  | "pipelineValue"
  | "revenue"
  | "lastContact"
  | "status";

export type CustomerListSortField =
  | "name"
  | "company"
  | "city"
  | "relationshipManager"
  | "activeLoans"
  | "pipelineValue"
  | "revenue"
  | "lastContact"
  | "health";

/** Loan File Management — Sprint 3 */

export type LoanFileView = "kanban" | "list" | "timeline" | "analytics" | "tasks";

export type LoanFilePriority = "urgent" | "high" | "medium" | "low";

export type LoanFileStatus = "on_track" | "at_risk" | "delayed" | "completed";

export interface LoanFileDocument {
  id: string;
  name: string;
  status: DocumentCheckStatus;
  /** GL-03 — Loan Execution Workspace */
  category?: string;
  assignedTo?: string;
  requestedDate?: string;
  receivedDate?: string;
  verifiedDate?: string;
  remarks?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoanFileTask {
  id: string;
  title: string;
  priority: LoanFilePriority;
  dueDate: string;
  assignedTo: string;
  completed: boolean;
  /** GL-03 — richer task execution states (keeps `completed` for legacy UIs). */
  status?: ExecutionTaskStatus;
  reminder?: string;
  remarks?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoanFileTimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  completed: boolean;
}

export interface LoanFileBusiness {
  companyName?: string;
  constitution?: string;
  gst?: string;
  annualTurnover?: number;
  businessVintage?: number;
  /** UX-02 — Employment income fields */
  monthlySalary?: number;
  annualProfit?: number;
  annualGrossReceipts?: number;
  annualProfessionalIncome?: number;
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
  lendingType: LendingType;
  transactionType: TransactionType;
  loanProduct: string;
  loanAmount: number;
  requiredAmount: number;
  finalLoanAmount?: number;
  /** UX-01A — Final approved terms (editable from Final Approved stage onward). */
  finalRoi?: number;
  finalTenure?: number;
  finalApprovalDate?: string;
  lender: string;
  stage: PipelineStage;
  stageSubStatus?: string;
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
  /** CRC-10.2C — Secured product qualification (LTV / eligibility ready). */
  propertyType?: string;
  /** CRC-10.3 — Occupancy master id (Decision Engine: property acceptance, LTV, eligibility). */
  occupancyId?: string;
  approxPropertyValue?: number;
  businessDetails?: LoanFileBusiness;
  coApplicant?: string;
  coApplicantId?: string;
  guarantor?: string;
  guarantorId?: string;
  source?: string;
  sourceContactId?: string;
  sourceContactName?: string;
  btInstitutionId?: string;
  btInstitutionName?: string;
  btAmount?: number;
  topUpRequested?: number;
  /** UX-02 — Manual top-up flag for balance transfer cases */
  topUpRequired?: boolean;
  /** UX-02 — Unified loan participants (max 9 additional entities) */
  participants?: import("@/types/loan-participant").LoanParticipant[];
  /** RC Revenue / Accounting only — not a loan stage. */
  settlementCompleted?: boolean;
  documents: LoanFileDocument[];
  tasks: LoanFileTask[];
  timeline: LoanFileTimelineEvent[];
  internalNotes: string;
  isUrgent: boolean;
  isDelayed: boolean;
  archived?: boolean;
  /** GL-03 — Loan Execution: lender assignments & history. */
  lenders?: LoanLenderExecution[];
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
  lendingType: LendingType;
  transactionType?: TransactionType;
  loanProduct: string;
  loanAmount: number;
  requiredAmount: number;
  lender: string;
  relationshipManager: string;
  priority: LoanFilePriority;
  loginDate: string;
  expectedLoginDate: string;
  internalNotes: string;
  propertyType?: string;
  occupancyId?: string;
  approxPropertyValue?: number;
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
  avgAgeing?: number;
}

