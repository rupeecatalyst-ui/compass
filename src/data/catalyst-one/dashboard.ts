import { ROUTES } from "@/constants/routes";
import type {
  ActivityEvent,
  DashboardLoanFileRow,
  DashboardTaskItem,
  ExecutiveKpi,
  ExecutivePipelineStage,
  FocusTile,
  LeadArrivalPoint,
  LoginTrendPoint,
  NewArrivalRow,
  PendingApproval,
  PipelineFunnelStage,
  RmPerformanceRow,
  TargetGaugeData,
  TargetProgressData,
  TargetScope,
  TodaysWorkItem,
  TrendPoint,
} from "@/types/catalyst-one";

export const executiveKpis: ExecutiveKpi[] = [
  {
    id: "total_pipeline",
    label: "Total Pipeline",
    value: "₹42.8 Cr",
    baseValue: 42.8,
    priorValue: 38.2,
    valueType: "currency_cr",
    subValue: "148 active files",
    trend: { direction: "up", label: "+12% vs last month" },
    icon: "pipeline",
    accent: "primary",
    href: `${ROUTES.MY_DEALS}?view=pipeline`,
  },
  {
    id: "sanctioned",
    label: "Sanctioned Value",
    value: "₹18.6 Cr",
    baseValue: 18.6,
    priorValue: 16.0,
    valueType: "currency_cr",
    subValue: "64 files",
    trend: { direction: "up", label: "+16% vs last month" },
    icon: "sanctioned",
    accent: "accent",
    href: `${ROUTES.MY_DEALS}?stage=final_approved`,
  },
  {
    id: "disbursed",
    label: "Disbursed Value",
    value: "₹12.4 Cr",
    baseValue: 12.4,
    priorValue: 10.5,
    valueType: "currency_cr",
    subValue: "41 files",
    trend: { direction: "up", label: "+22% vs last month" },
    icon: "disbursed",
    accent: "accent",
    href: `${ROUTES.MY_DEALS}?stage=closure_wip`,
  },
  {
    id: "expected_revenue",
    label: "Expected Revenue",
    value: "₹86.2 L",
    baseValue: 86.2,
    priorValue: 72.1,
    valueType: "currency_l",
    subValue: "Commission pipeline",
    trend: { direction: "up", label: "+22% vs last month" },
    icon: "revenue",
    accent: "warning",
    href: `${ROUTES.ACCOUNTING}?tab=revenue`,
  },
  {
    id: "new_leads",
    label: "New Leads",
    value: "32",
    baseValue: 32,
    priorValue: 24,
    valueType: "count",
    subValue: "Raw lead stage",
    trend: { direction: "up", label: "+18% vs yesterday" },
    icon: "files",
    accent: "primary",
    href: `${ROUTES.LOAN_FILES}?stage=raw_lead`,
  },
  {
    id: "tasks_due",
    label: "Pending Tasks",
    value: "17",
    baseValue: 17,
    priorValue: 22,
    valueType: "count",
    subValue: "5 high priority",
    trend: { direction: "down", label: "5 due today" },
    icon: "tasks",
    accent: "info",
    href: `${ROUTES.TASKS}?filter=due`,
  },
];

/** Executive pipeline — 7 stages for Command Centre */
export const executivePipelineStages: ExecutivePipelineStage[] = [
  { id: "raw_lead", label: "Raw Lead", count: 42, value: 8_40_00_000, color: "#64748B" },
  { id: "pre_login", label: "Pre Login", count: 28, value: 6_20_00_000, color: "#475569" },
  { id: "logged_in", label: "Logged In", count: 35, value: 9_10_00_000, color: "#3B82F6" },
  { id: "credit_wip", label: "Credit WIP", count: 22, value: 5_80_00_000, color: "#6366F1" },
  { id: "soft_approved", label: "Soft Approved", count: 18, value: 4_50_00_000, color: "#8B5CF6" },
  { id: "final_approved", label: "Final Approved", count: 14, value: 3_90_00_000, color: "#A855F7" },
  { id: "disbursed_executive", label: "Won", count: 20, value: 4_40_00_000, color: "#22C55E" },
];

export const focusTiles: FocusTile[] = [
  {
    id: "disbursement_pending",
    label: "Files Pending Disbursement",
    count: 11,
    urgency: "critical",
    href: `${ROUTES.MY_DEALS}?stage=closure_wip`,
  },
  {
    id: "credit_queries",
    label: "Credit Queries Pending",
    count: 9,
    urgency: "high",
    href: `${ROUTES.LOAN_FILES}?filter=credit_queries`,
  },
  {
    id: "expected_disbursement",
    label: "Expected Disbursement Today",
    count: 6,
    urgency: "critical",
    href: `${ROUTES.MY_DEALS}?filter=today_disbursement`,
  },
  {
    id: "compliance_due",
    label: "Compliance Due",
    count: 4,
    urgency: "high",
    href: `${ROUTES.REPORTS}?tab=compliance`,
  },
  {
    id: "followups",
    label: "Follow-ups Due Today",
    count: 24,
    urgency: "medium",
    href: `${ROUTES.TASKS}?filter=followups`,
  },
];

export const dashboardTasks: DashboardTaskItem[] = [
  { id: "t1", title: "Call — Sharma Industries disbursement", type: "call", time: "Yesterday", href: `${ROUTES.TASKS}?id=t1`, bucket: "overdue" },
  { id: "t2", title: "Collect ITR — Patel Manufacturing", type: "document", time: "Yesterday", href: `${ROUTES.DOCUMENTS}?file=patel`, bucket: "overdue" },
  { id: "t3", title: "RM meeting — HDFC rate revision", type: "meeting", time: "10:30 AM", href: `${ROUTES.TASKS}?id=t2`, bucket: "today" },
  { id: "t4", title: "Credit query — income variance", type: "credit", time: "3:30 PM", href: `${ROUTES.LOAN_FILES}?filter=credit`, bucket: "today" },
  { id: "t5", title: "Disbursement follow-up — ICICI BL", type: "disbursement", time: "5:00 PM", href: `${ROUTES.MY_DEALS}?stage=disbursement`, bucket: "today" },
  { id: "t6", title: "Site visit — Mehta Traders", type: "call", time: "Tomorrow", href: `${ROUTES.TASKS}?id=t6`, bucket: "upcoming" },
];

export const pipelineFunnelStages: PipelineFunnelStage[] = [
  { id: "raw_lead", label: "Raw Lead", count: 42, value: 8_40_00_000, color: "#64748B", conversion: 100 },
  { id: "pre_login", label: "Pre Login", count: 28, value: 6_20_00_000, color: "#475569", conversion: 67 },
  { id: "logged_in", label: "Logged In", count: 35, value: 9_10_00_000, color: "#3B82F6", conversion: 83 },
  { id: "credit_wip", label: "Credit WIP", count: 22, value: 5_80_00_000, color: "#6366F1", conversion: 63 },
  { id: "soft_approved", label: "Soft Approved", count: 18, value: 4_50_00_000, color: "#8B5CF6", conversion: 82 },
  { id: "final_approved", label: "Final Approved", count: 14, value: 3_90_00_000, color: "#A855F7", conversion: 78 },
  { id: "disbursed_executive", label: "Disbursed", count: 20, value: 4_40_00_000, color: "#14B8A6", conversion: 71 },
];

export const pendingApprovals: PendingApproval[] = [
  { id: "pa1", customerName: "Sharma Industries", product: "Business Loan", loanAmount: 1_20_00_000, stage: "Credit WIP", stageVariant: "warning", ageing: "2h", fileId: "lf-pa1" },
  { id: "pa2", customerName: "Kumar Properties", product: "LAP", loanAmount: 82_00_000, stage: "Soft Approval", stageVariant: "accent", ageing: "1d", fileId: "lf-pa2" },
  { id: "pa3", customerName: "Mehta Traders", product: "Working Capital", loanAmount: 68_00_000, stage: "Final Approval", stageVariant: "info", ageing: "3h", fileId: "lf-pa3" },
  { id: "pa4", customerName: "Reddy Exports", product: "Business Loan", loanAmount: 95_00_000, stage: "Credit WIP", stageVariant: "warning", ageing: "5h", fileId: "lf-pa4" },
];

export const rmPerformanceRows: RmPerformanceRow[] = [
  { id: "rm1", name: "Amit Sharma", initials: "AS", activeFiles: 28, sanctions: 12, disbursements: 8, conversion: 68 },
  { id: "rm2", name: "Priya Mehta", initials: "PM", activeFiles: 24, sanctions: 10, disbursements: 7, conversion: 72 },
  { id: "rm3", name: "Rahul Verma", initials: "RV", activeFiles: 22, sanctions: 9, disbursements: 6, conversion: 64 },
  { id: "rm4", name: "Neha Patel", initials: "NP", activeFiles: 19, sanctions: 8, disbursements: 5, conversion: 61 },
];

export const demoLoanFileRows: DashboardLoanFileRow[] = [
  { id: "na-1", fileId: "lf-001", customerName: "Vikram Singh", source: "Website", product: "Home Loan", loanAmount: 75_00_000, assignedRm: "Amit Sharma", currentStage: "Raw Lead", createdAt: new Date(Date.now() - 6 * 3600_000).toISOString(), ageing: "6h", priority: "medium" },
  { id: "na-2", fileId: "lf-002", customerName: "Sneha Kapoor", source: "Referral", product: "Business Loan", loanAmount: 1_20_00_000, assignedRm: "Priya Mehta", currentStage: "Pre Login", createdAt: new Date(Date.now() - 18 * 3600_000).toISOString(), ageing: "18h", priority: "high" },
  { id: "na-3", fileId: "lf-003", customerName: "Arjun Pillai", source: "Partner", product: "Loan Against Property", loanAmount: 95_00_000, assignedRm: "Rahul Verma", currentStage: "Logged In", createdAt: new Date(Date.now() - 32 * 3600_000).toISOString(), ageing: "1d", priority: "high" },
  { id: "na-4", fileId: "lf-004", customerName: "Meera Joshi", source: "Digital Campaign", product: "Personal Loan", loanAmount: 12_00_000, assignedRm: "Neha Patel", currentStage: "Credit WIP", createdAt: new Date(Date.now() - 48 * 3600_000).toISOString(), ageing: "2d", priority: "urgent" },
  { id: "na-5", fileId: "lf-005", customerName: "Deepak Rao", source: "RM Outreach", product: "Working Capital", loanAmount: 68_00_000, assignedRm: "Sanjay Gupta", currentStage: "Raw Lead", createdAt: new Date(Date.now() - 60 * 3600_000).toISOString(), ageing: "2d", priority: "medium" },
];

function buildLeadArrivalTrend(count: number, base: number, variance: number): LeadArrivalPoint[] {
  const points: LeadArrivalPoint[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    points.push({
      label: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      leads: Math.max(4, Math.round(base + Math.sin(i * 0.6) * variance)),
      date: date.toISOString(),
    });
  }
  return points;
}

export const leadArrivalTrendData: LeadArrivalPoint[] = buildLeadArrivalTrend(30, 28, 8);

export const targetProgressByScope: Record<TargetScope, TargetProgressData[]> = {
  relationship_manager: [
    { id: "monthly", label: "Monthly Target", target: 2.5, achieved: 1.8, projected: 2.2, unit: "currency_cr" },
    { id: "quarterly", label: "Quarterly Target", target: 7.5, achieved: 5.2, projected: 6.8, unit: "currency_cr" },
    { id: "yearly", label: "Yearly Target", target: 28, achieved: 12.4, projected: 22, unit: "currency_cr" },
  ],
  branch_head: [
    { id: "monthly", label: "Monthly Target", target: 8.5, achieved: 6.1, projected: 7.4, unit: "currency_cr" },
    { id: "quarterly", label: "Quarterly Target", target: 24, achieved: 17.8, projected: 21, unit: "currency_cr" },
    { id: "yearly", label: "Yearly Target", target: 92, achieved: 38.6, projected: 78, unit: "currency_cr" },
  ],
  ceo: [
    { id: "monthly", label: "Monthly Target", target: 18, achieved: 12.4, projected: 15.2, unit: "currency_cr" },
    { id: "quarterly", label: "Quarterly Target", target: 52, achieved: 38.6, projected: 46, unit: "currency_cr" },
    { id: "yearly", label: "Yearly Target", target: 210, achieved: 86.2, projected: 168, unit: "currency_cr" },
  ],
};

/** Full 9-stage pipeline data (legacy / loan-pipeline-workflow) */
export const pipelineStages = [
  { id: "raw_lead" as const, label: "Raw Lead", count: 42, value: 8_40_00_000 },
  { id: "pre_login" as const, label: "Pre Login", count: 28, value: 6_20_00_000 },
  { id: "logged_in" as const, label: "Logged In", count: 35, value: 9_10_00_000 },
  { id: "credit_wip" as const, label: "Credit WIP", count: 22, value: 5_80_00_000 },
  { id: "soft_approved" as const, label: "Soft Approved", count: 18, value: 4_50_00_000 },
  { id: "final_approved" as const, label: "Final Approved", count: 14, value: 3_90_00_000 },
  { id: "closure_wip" as const, label: "Closure WIP", count: 11, value: 2_80_00_000 },
  { id: "won" as const, label: "Won", count: 7, value: 98_00_000 },
];

export const todaysWork: TodaysWorkItem[] = [
  {
    id: "followups",
    title: "Pending Follow-ups",
    count: 24,
    description: "Customer callbacks and lender updates scheduled for today",
    priority: "high",
    href: "/tasks",
  },
  {
    id: "documents",
    title: "Pending Documents",
    count: 16,
    description: "KYC, bank statements, and property papers awaiting upload",
    priority: "high",
    href: "/documents",
  },
  {
    id: "credit_queries",
    title: "Credit Queries",
    count: 9,
    description: "Open queries from credit team requiring RM response",
    priority: "medium",
    href: "/loan-files",
  },
  {
    id: "disbursements",
    title: "Today's Disbursements",
    count: 6,
    description: "Files scheduled for disbursement today across 4 lenders",
    priority: "high",
    href: "/my-deals",
  },
  {
    id: "sanctions",
    title: "Upcoming Sanctions",
    count: 11,
    description: "Expected sanction decisions in the next 48 hours",
    priority: "medium",
    href: "/my-deals",
  },
];

export const activityTimeline: ActivityEvent[] = [
  {
    id: "1",
    title: "Disbursement completed",
    description: "₹45 L Business Loan disbursed for Sharma Industries, Pune",
    timestamp: new Date(Date.now() - 15 * 60_000).toISOString(),
    type: "disbursement",
    actor: "Priya Mehta",
    fileId: "lf-demo-1",
  },
  {
    id: "2",
    title: "Final approval received",
    description: "HDFC Bank approved ₹82 L LAP for Rajesh Kumar, Mumbai",
    timestamp: new Date(Date.now() - 45 * 60_000).toISOString(),
    type: "loan",
    actor: "Amit Sharma",
    fileId: "lf-demo-2",
  },
  {
    id: "3",
    title: "Documents verified",
    description: "Complete KYC pack verified for Mehta Traders Working Capital file",
    timestamp: new Date(Date.now() - 2 * 3600_000).toISOString(),
    type: "document",
    actor: "Neha Patel",
  },
  {
    id: "4",
    title: "New customer onboarded",
    description: "Kavitha Reddy added — Personal Loan enquiry, Hyderabad",
    timestamp: new Date(Date.now() - 3 * 3600_000).toISOString(),
    type: "customer",
    actor: "Rahul Verma",
  },
  {
    id: "5",
    title: "Credit query resolved",
    description: "Income variance query closed for Patel Manufacturing BL file",
    timestamp: new Date(Date.now() - 5 * 3600_000).toISOString(),
    type: "task",
    actor: "Sanjay Gupta",
  },
  {
    id: "6",
    title: "Invoice raised",
    description: "Commission invoice #RC-2026-1842 raised for ICICI disbursement",
    timestamp: new Date(Date.now() - 8 * 3600_000).toISOString(),
    type: "loan",
    actor: "System",
  },
  {
    id: "7",
    title: "Pipeline sync complete",
    description: "Catalyst One synced 248 loan files across all stages",
    timestamp: new Date(Date.now() - 24 * 3600_000).toISOString(),
    type: "system",
    actor: "COMPASS",
  },
];

const LEAD_SOURCES = ["Website", "Referral", "RM Outreach", "Partner", "Walk-in", "Digital Campaign"] as const;

export function deriveLeadSource(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * (i + 1)) % LEAD_SOURCES.length;
  return LEAD_SOURCES[hash]!;
}

/** Demo new arrivals — always includes recent entries for dashboard preview */
export const demoNewArrivals: NewArrivalRow[] = [
  {
    id: "na-1",
    fileId: "lf-001",
    customerName: "Vikram Singh",
    source: "Website",
    product: "Home Loan",
    loanAmount: 75_00_000,
    assignedRm: "Amit Sharma",
    currentStage: "Raw Lead",
    createdAt: new Date(Date.now() - 6 * 3600_000).toISOString(),
  },
  {
    id: "na-2",
    fileId: "lf-002",
    customerName: "Sneha Kapoor",
    source: "Referral",
    product: "Business Loan",
    loanAmount: 1_20_00_000,
    assignedRm: "Priya Mehta",
    currentStage: "Pre Login",
    createdAt: new Date(Date.now() - 18 * 3600_000).toISOString(),
  },
  {
    id: "na-3",
    fileId: "lf-003",
    customerName: "Arjun Pillai",
    source: "Partner",
    product: "Loan Against Property",
    loanAmount: 95_00_000,
    assignedRm: "Rahul Verma",
    currentStage: "Logged In",
    createdAt: new Date(Date.now() - 32 * 3600_000).toISOString(),
  },
  {
    id: "na-4",
    fileId: "lf-004",
    customerName: "Meera Joshi",
    source: "Digital Campaign",
    product: "Personal Loan",
    loanAmount: 12_00_000,
    assignedRm: "Neha Patel",
    currentStage: "Credit WIP",
    createdAt: new Date(Date.now() - 48 * 3600_000).toISOString(),
  },
  {
    id: "na-5",
    fileId: "lf-005",
    customerName: "Deepak Rao",
    source: "RM Outreach",
    product: "Working Capital",
    loanAmount: 68_00_000,
    assignedRm: "Sanjay Gupta",
    currentStage: "Raw Lead",
    createdAt: new Date(Date.now() - 60 * 3600_000).toISOString(),
  },
];

function buildLoginTrend(count: number, base: number, variance: number): LoginTrendPoint[] {
  const points: LoginTrendPoint[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const logins = Math.max(8, Math.round(base + Math.sin(i * 0.8) * variance + (count - i) * 0.3));
    points.push({
      label: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      logins,
      date: date.toISOString(),
    });
  }
  return points;
}

export const loginTrendData: Record<"week" | "month" | "quarter" | "year", LoginTrendPoint[]> = {
  week: buildLoginTrend(7, 42, 12),
  month: buildLoginTrend(30, 38, 10),
  quarter: buildLoginTrend(12, 820, 90).map((p, i) => ({
    ...p,
    label: `W${i + 1}`,
  })),
  year: Array.from({ length: 12 }, (_, i) => ({
    label: new Date(2026, i, 1).toLocaleDateString("en-IN", { month: "short" }),
    logins: 920 + i * 45 + Math.round(Math.sin(i) * 80),
    date: new Date(2026, i, 15).toISOString(),
  })),
};

function buildTrend(base: number, count: number, variance: number): TrendPoint[] {
  const points: TrendPoint[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    points.push({
      label: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      value: Math.max(1, Math.round(base + Math.sin(i * 0.7) * variance)),
      date: date.toISOString(),
    });
  }
  return points;
}

export const revenueTrendData: TrendPoint[] = buildTrend(6.2, 14, 1.8).map((p) => ({
  ...p,
  value: Math.round(p.value * 10) / 10,
}));

export const disbursementTrendData: TrendPoint[] = buildTrend(0.8, 14, 0.4).map((p) => ({
  ...p,
  value: Math.round(p.value * 10) / 10,
}));

export const targetGaugeByScope: Record<TargetScope, TargetGaugeData[]> = {
  relationship_manager: [
    { id: "monthly", label: "Monthly Target", target: 2.5, achieved: 1.8, unit: "currency_cr" },
    { id: "quarterly", label: "Quarterly Target", target: 7.5, achieved: 5.2, unit: "currency_cr" },
    { id: "yearly", label: "Yearly Target", target: 28, achieved: 12.4, unit: "currency_cr" },
  ],
  branch_head: [
    { id: "monthly", label: "Monthly Target", target: 8.5, achieved: 6.1, unit: "currency_cr" },
    { id: "quarterly", label: "Quarterly Target", target: 24, achieved: 17.8, unit: "currency_cr" },
    { id: "yearly", label: "Yearly Target", target: 92, achieved: 38.6, unit: "currency_cr" },
  ],
  ceo: [
    { id: "monthly", label: "Monthly Target", target: 18, achieved: 12.4, unit: "currency_cr" },
    { id: "quarterly", label: "Quarterly Target", target: 52, achieved: 38.6, unit: "currency_cr" },
    { id: "yearly", label: "Yearly Target", target: 210, achieved: 86.2, unit: "currency_cr" },
  ],
};

export const TARGET_SCOPE_LABELS: Record<TargetScope, string> = {
  relationship_manager: "Relationship Manager · Own Target",
  branch_head: "Branch Head · Branch",
  ceo: "CEO · Company Consolidated",
};

export const LENDER_INITIALS: Record<string, string> = {
  "HDFC Bank": "HD",
  "ICICI Bank": "IC",
  "Axis Bank": "AX",
  "SBI": "SB",
  "Kotak Mahindra": "KM",
  "IndusInd Bank": "IN",
  "Bajaj Finserv": "BJ",
  "Federal Bank": "FB",
  "IDFC First Bank": "ID",
  "PNB Housing": "PN",
  "Tata Capital": "TC",
  "LIC Housing": "LH",
};

export function getLenderInitials(lender: string): string {
  return LENDER_INITIALS[lender] ?? lender.slice(0, 2).toUpperCase();
}

export function getRmInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
