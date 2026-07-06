import { DEMO_CURRENT_RM } from "@/constants/customer-360";
import { isLoanWon } from "@/constants/loan-pipeline";
import { getPortfolioDisbursedAmount, getRevenueBaseAmount } from "@/lib/loan-amount-utils";
import { CUSTOMER_SEED } from "@/data/catalyst-one/customer-seed";
import { getAllLoanFiles } from "@/lib/loan-files-utils";
import type {
  Customer360Metrics,
  CustomerAuditEntry,
  CustomerHealth,
  CustomerListSortField,
  CustomerProfile,
  CustomerRelationshipSummary,
  LoanFile,
  SortDirection,
} from "@/types/catalyst-one";

export function formatCustomerId(id: string): string {
  return `CUS-${id.toUpperCase()}`;
}

export function getCustomerInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function isLoanCompleted(file: LoanFile): boolean {
  return isLoanWon(file.stage) || file.status === "completed";
}

export function getCustomerLoanFiles(
  customerId: string,
  files?: LoanFile[],
): { active: LoanFile[]; completed: LoanFile[] } {
  const all = (files ?? getAllLoanFiles()).filter(
    (f) => f.customerId === customerId && !f.archived,
  );
  const active = all.filter((f) => !isLoanCompleted(f));
  const completed = all.filter((f) => isLoanCompleted(f));
  return { active, completed };
}

export function computeCustomer360Metrics(
  customerId: string,
  files?: LoanFile[],
): Customer360Metrics {
  const { active, completed } = getCustomerLoanFiles(customerId, files);
  const all = [...active, ...completed];

  const pipelineValue = active.reduce((s, f) => s + getRevenueBaseAmount(f), 0);
  const totalLoanValue = all.reduce((s, f) => s + getRevenueBaseAmount(f), 0);
  const revenueGenerated = all.reduce((s, f) => s + f.revenueReceived, 0);
  const expectedRevenue = all.reduce((s, f) => s + f.expectedRevenue, 0);
  const outstanding = active.reduce(
    (s, f) => s + Math.max(0, f.expectedRevenue - f.revenueReceived),
    0,
  );
  const pendingTasks = all.reduce(
    (s, f) => s + f.tasks.filter((t) => !t.completed).length,
    0,
  );
  const profitability =
    expectedRevenue > 0 ? Math.round((revenueGenerated / expectedRevenue) * 100) : 0;

  const crossSellOpportunities = computeCrossSellOpportunities(customerId, all);

  return {
    activeLoans: active.length,
    totalLoanValue,
    revenueGenerated,
    pipelineValue,
    completedLoans: completed.length,
    pendingTasks,
    outstanding,
    expectedRevenue,
    profitability,
    crossSellOpportunities,
  };
}

const CROSS_SELL_PRODUCTS = [
  "Home Loan",
  "Loan Against Property",
  "Business Loan",
  "Personal Loan",
  "Working Capital",
  "Insurance",
  "Mutual Fund",
] as const;

export function computeCrossSellOpportunities(customerId: string, files?: LoanFile[]): number {
  const { active, completed } = getCustomerLoanFiles(customerId, files);
  const used = new Set<string>();
  [...active, ...completed].forEach((f) => used.add(f.loanProduct));
  return CROSS_SELL_PRODUCTS.filter((p) => !used.has(p)).length;
}

export function computeRelationshipSummary(
  customerId: string,
  files?: LoanFile[],
): CustomerRelationshipSummary {
  const metrics = computeCustomer360Metrics(customerId, files);
  return {
    activeLoans: metrics.activeLoans,
    closedLoans: metrics.completedLoans,
    expectedRevenue: metrics.expectedRevenue,
    receivedRevenue: metrics.revenueGenerated,
    outstandingRevenue: metrics.outstanding,
    crossSellOpportunities: metrics.crossSellOpportunities,
  };
}

export interface CategorizedCustomerTasks {
  dueToday: ReturnType<typeof getAllCustomerTasks>;
  upcoming: ReturnType<typeof getAllCustomerTasks>;
  completed: ReturnType<typeof getAllCustomerTasks>;
  overdue: ReturnType<typeof getAllCustomerTasks>;
}

export function categorizeCustomerTasks(
  customer: CustomerProfile,
  files?: LoanFile[],
): CategorizedCustomerTasks {
  const all = getAllCustomerTasks(customer, files);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dueToday: typeof all = [];
  const upcoming: typeof all = [];
  const completed: typeof all = [];
  const overdue: typeof all = [];

  all.forEach((t) => {
    if (t.completed) {
      completed.push(t);
      return;
    }
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today) overdue.push(t);
    else if (due.getTime() === today.getTime()) dueToday.push(t);
    else upcoming.push(t);
  });

  return { dueToday, upcoming, completed, overdue };
}

export function buildCustomerAuditTrail(
  customer: CustomerProfile,
  files?: LoanFile[],
): CustomerAuditEntry[] {
  const entries: CustomerAuditEntry[] = [];

  customer.auditTrail?.forEach((e) => entries.push(e));

  customer.timeline.forEach((e) => {
    entries.push({
      id: `audit-tl-${e.id}`,
      action: e.title,
      description: e.description,
      timestamp: e.timestamp,
      actor: e.actor ?? customer.relationshipManager,
      source: "user",
      loanFileId: e.loanFileId,
    });
  });

  customer.notes.forEach((n) => {
    entries.push({
      id: `audit-note-${n.id}`,
      action: n.pinned ? "Note pinned" : "Note added",
      description: n.content.slice(0, 120),
      timestamp: n.createdAt,
      actor: n.createdBy,
      source: "user",
    });
  });

  customer.documents.forEach((d) => {
    entries.push({
      id: `audit-doc-${d.id}`,
      action: `Document ${d.status}`,
      description: `${d.name} · v${d.version ?? 1}`,
      timestamp: d.uploadedAt,
      actor: d.uploadedBy ?? customer.relationshipManager,
      source: "user",
    });
  });

  const allFiles = (files ?? getAllLoanFiles()).filter((f) => f.customerId === customer.id);
  allFiles.forEach((f) => {
    f.timeline.slice(0, 3).forEach((e) => {
      entries.push({
        id: `audit-loan-${f.id}-${e.id}`,
        action: e.title,
        description: `${f.fileNumber} · ${f.loanProduct}`,
        timestamp: e.timestamp,
        actor: f.relationshipManager,
        source: "system",
        loanFileId: f.id,
      });
    });
  });

  return entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export function deriveCustomerHealth(
  customer: CustomerProfile,
  files?: LoanFile[],
): CustomerHealth {
  if (!customer.isActive) return "inactive";
  const { active } = getCustomerLoanFiles(customer.id, files);
  const all = (files ?? getAllLoanFiles()).filter(
    (f) => f.customerId === customer.id && !f.archived,
  );
  const hasRisk = all.some((f) => f.status === "delayed" || f.status === "at_risk");
  if (hasRisk) return "risk";

  const pendingDocs = customer.documents.some((d) => d.status === "pending");
  const pendingTasks = all.some((f) => f.tasks.some((t) => !t.completed));
  if (pendingDocs || (pendingTasks && active.length > 0)) return "attention_required";

  const daysSinceContact =
    (Date.now() - new Date(customer.lastContact).getTime()) / 86400000;
  if (daysSinceContact > 90 && active.length === 0) return "dormant";
  if (daysSinceContact > 60) return "dormant";

  return "healthy";
}

export function searchCustomers(
  query: string,
  customers: CustomerProfile[],
  files?: LoanFile[],
): CustomerProfile[] {
  const q = query.toLowerCase().trim();
  if (!q) return customers;

  const allFiles = files ?? getAllLoanFiles();

  return customers.filter((c) => {
    const customerHaystack = [
      c.name,
      c.mobile,
      c.email ?? "",
      c.company,
      c.pan,
      c.id,
      formatCustomerId(c.id),
      c.city,
      ...c.tags,
    ]
      .join(" ")
      .toLowerCase();

    if (customerHaystack.includes(q)) return true;

    return allFiles.some(
      (f) =>
        f.customerId === c.id &&
        (f.fileNumber.toLowerCase().includes(q) || f.id.toLowerCase().includes(q)),
    );
  });
}

export function applyCustomerSavedView(
  customers: CustomerProfile[],
  savedView: string,
  files?: LoanFile[],
): CustomerProfile[] {
  const allFiles = files ?? getAllLoanFiles();
  switch (savedView) {
    case "my_customers":
      return customers.filter((c) => c.relationshipManager === DEMO_CURRENT_RM);
    case "high_value":
      return customers.filter((c) => computeCustomer360Metrics(c.id, allFiles).pipelineValue >= 50_00_000);
    case "vip":
      return customers.filter((c) => c.tags.includes("VIP"));
    case "attention":
      return customers.filter((c) => deriveCustomerHealth(c, allFiles) === "attention_required");
    case "dormant":
      return customers.filter((c) => deriveCustomerHealth(c, allFiles) === "dormant");
    case "msme":
      return customers.filter((c) => c.tags.includes("MSME"));
    case "repeat":
      return customers.filter((c) => c.tags.includes("Repeat Customer"));
    default:
      return customers;
  }
}

export interface CustomerListFilters {
  rm: string;
  city: string;
  product: string;
  activeFilter: "all" | "active" | "inactive";
  leadSource: string;
  tags: string;
}

export function applyCustomerFilters(
  customers: CustomerProfile[],
  filters: CustomerListFilters,
): CustomerProfile[] {
  return customers.filter((c) => {
    if (filters.rm !== "all" && c.relationshipManager !== filters.rm) return false;
    if (filters.city !== "all" && c.city !== filters.city) return false;
    if (filters.product !== "all" && c.loanProduct !== filters.product) return false;
    if (filters.leadSource !== "all" && c.leadSource !== filters.leadSource) return false;
    if (filters.tags !== "all" && !c.tags.includes(filters.tags as CustomerProfile["tags"][0]))
      return false;
    if (filters.activeFilter === "active" && !c.isActive) return false;
    if (filters.activeFilter === "inactive" && c.isActive) return false;
    return true;
  });
}

export function sortCustomers(
  customers: CustomerProfile[],
  field: CustomerListSortField,
  direction: SortDirection,
  files?: LoanFile[],
): CustomerProfile[] {
  const allFiles = files ?? getAllLoanFiles();
  const sorted = [...customers].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "company":
        cmp = a.company.localeCompare(b.company);
        break;
      case "city":
        cmp = a.city.localeCompare(b.city);
        break;
      case "relationshipManager":
        cmp = a.relationshipManager.localeCompare(b.relationshipManager);
        break;
      case "activeLoans":
        cmp =
          computeCustomer360Metrics(a.id, allFiles).activeLoans -
          computeCustomer360Metrics(b.id, allFiles).activeLoans;
        break;
      case "pipelineValue":
        cmp =
          computeCustomer360Metrics(a.id, allFiles).pipelineValue -
          computeCustomer360Metrics(b.id, allFiles).pipelineValue;
        break;
      case "revenue":
        cmp =
          computeCustomer360Metrics(a.id, allFiles).revenueGenerated -
          computeCustomer360Metrics(b.id, allFiles).revenueGenerated;
        break;
      case "lastContact":
        cmp = new Date(a.lastContact).getTime() - new Date(b.lastContact).getTime();
        break;
      case "health":
        cmp = a.health.localeCompare(b.health);
        break;
      default:
        cmp = 0;
    }
    return direction === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function mergeCustomerTimeline(
  customer: CustomerProfile,
  files?: LoanFile[],
): CustomerProfile["timeline"] {
  const allFiles = (files ?? getAllLoanFiles()).filter((f) => f.customerId === customer.id);
  const loanEvents = allFiles.flatMap((f) =>
    f.timeline.map((e) => ({
      id: `loan-${f.id}-${e.id}`,
      title: e.title,
      description: e.description ?? `${f.fileNumber} · ${f.loanProduct}`,
      timestamp: e.timestamp,
      type: "stage_move" as const,
      actor: f.relationshipManager,
      loanFileId: f.id,
    })),
  );
  return [...customer.timeline, ...loanEvents].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export function getAllCustomerTasks(customer: CustomerProfile, files?: LoanFile[]) {
  const allFiles = (files ?? getAllLoanFiles()).filter((f) => f.customerId === customer.id);
  return allFiles.flatMap((f) =>
    f.tasks.map((t) => ({
      ...t,
      fileId: f.id,
      fileNumber: f.fileNumber,
      loanProduct: f.loanProduct,
    })),
  );
}

export interface PortfolioSlice {
  product: string;
  value: number;
  count: number;
}

export interface PortfolioIntelligence {
  totalRelationshipValue: number;
  totalDisbursedLoans: number;
  largestProduct: string;
  averageTicketSize: number;
  firstEngagementDate: string | null;
  latestDisbursement: string | null;
}

/** CRC-006 — completed/disbursed engagements only. */
export function computeRelationshipPortfolio(
  customerId: string,
  files?: LoanFile[],
): PortfolioSlice[] {
  const { completed } = getCustomerLoanFiles(customerId, files);
  const map = new Map<string, { value: number; count: number }>();
  completed.forEach((f) => {
    const key = f.loanProduct;
    const cur = map.get(key) ?? { value: 0, count: 0 };
    map.set(key, {
      value: cur.value + getPortfolioDisbursedAmount(f),
      count: cur.count + 1,
    });
  });
  return [...map.entries()]
    .map(([product, { value, count }]) => ({ product, value, count }))
    .sort((a, b) => b.value - a.value);
}

/** CRC-014 — compact portfolio intelligence summary. */
export function computePortfolioIntelligence(
  customerId: string,
  files?: LoanFile[],
): PortfolioIntelligence {
  const { completed } = getCustomerLoanFiles(customerId, files);
  const portfolio = computeRelationshipPortfolio(customerId, files);
  const totalRelationshipValue = portfolio.reduce((s, p) => s + p.value, 0);
  const totalDisbursedLoans = completed.length;
  const largestProduct = portfolio[0]?.product ?? "—";
  const averageTicketSize =
    totalDisbursedLoans > 0 ? Math.round(totalRelationshipValue / totalDisbursedLoans) : 0;

  const engagementDates = completed
    .map((f) => new Date(f.createdAt).getTime())
    .filter((t) => !Number.isNaN(t));
  const latestEngagementDates = completed
    .map((f) => {
      const wonEvent = f.timeline.find((e) => e.title === "Loan Won");
      return wonEvent
        ? new Date(wonEvent.timestamp).getTime()
        : new Date(f.loginDate).getTime();
    })
    .filter((t) => !Number.isNaN(t));

  return {
    totalRelationshipValue,
    totalDisbursedLoans,
    largestProduct,
    averageTicketSize,
    firstEngagementDate:
      engagementDates.length > 0
        ? new Date(Math.min(...engagementDates)).toISOString()
        : null,
    latestDisbursement:
      latestEngagementDates.length > 0
        ? new Date(Math.max(...latestEngagementDates)).toISOString()
        : null,
  };
}

export function deriveBusinessRoles(customer: CustomerProfile, files?: LoanFile[]): string[] {
  const roles = new Set<string>();
  const { active, completed } = getCustomerLoanFiles(customer.id, files);

  if (active.length + completed.length > 0) roles.add("Borrower");
  else roles.add("Prospect");

  if (
    customer.tags.includes("Priority") ||
    customer.leadSource?.toLowerCase().includes("referral")
  ) {
    roles.add("Referral Partner");
  }
  if (customer.tags.includes("VIP") || customer.loanAmount >= 50_00_000) {
    roles.add("Investor");
  }
  return [...roles];
}

export interface OrganizationAffiliationDisplay {
  organization: string;
  role: string;
  isPrimary?: boolean;
  contactId?: string;
}

export function deriveOrganizationAffiliations(
  customer: CustomerProfile,
): OrganizationAffiliationDisplay[] {
  const items: OrganizationAffiliationDisplay[] = [
    {
      organization: customer.company,
      role: customer.constitution === "Individual" ? "Proprietor" : "Managing Director",
      isPrimary: true,
    },
  ];
  customer.relationships
    .filter((r) => r.type === "director" || r.type === "partner")
    .forEach((r) => {
      items.push({
        organization: r.name.includes("Pvt") || r.name.includes("LLP") ? r.name : customer.company,
        role: r.relation ?? (r.type === "director" ? "Director" : "Partner"),
      });
    });
  if (customer.lender && customer.id.charCodeAt(2) % 5 === 0) {
    items.push({ organization: customer.lender, role: "Branch Manager" });
  }
  return items;
}

export interface PersonalRelationshipDisplay {
  name: string;
  relationship: string;
  contactId?: string;
}

export function derivePersonalRelationships(
  customer: CustomerProfile,
): PersonalRelationshipDisplay[] {
  return customer.relationships
    .filter((r) => r.type === "family" || r.type === "co_applicant" || r.type === "guarantor")
    .map((r) => ({
      name: r.name,
      relationship: r.relation ?? r.type.replace("_", " "),
      contactId: r.linkedCustomerId,
    }));
}

export function deriveProductEngagementLines(
  customerId: string,
  files?: LoanFile[],
): string[] {
  const { active, completed } = getCustomerLoanFiles(customerId, files);
  const products = new Set<string>();
  [...active, ...completed].forEach((f) => products.add(f.loanProduct));
  return [...products];
}

export interface HealthReason {
  label: string;
  impact: "positive" | "negative" | "neutral";
}

export function deriveHealthReasons(
  customer: CustomerProfile,
  files?: LoanFile[],
): HealthReason[] {
  const reasons: HealthReason[] = [];
  const daysSince =
    (Date.now() - new Date(customer.lastContact).getTime()) / 86400000;
  if (daysSince < 14) reasons.push({ label: "Recent Follow-up", impact: "positive" });
  if (customer.tags.includes("Repeat Customer"))
    reasons.push({ label: "Repeat Customer", impact: "positive" });
  const { active } = getCustomerLoanFiles(customer.id, files);
  if (active.length > 0) reasons.push({ label: "Active Opportunity", impact: "positive" });
  const pendingTasks = getAllCustomerTasks(customer, files).filter((t) => !t.completed);
  if (pendingTasks.length === 0) reasons.push({ label: "No Overdue Tasks", impact: "positive" });
  else reasons.push({ label: `${pendingTasks.length} Pending Tasks`, impact: "negative" });
  if (daysSince > 60) reasons.push({ label: "Dormant Contact", impact: "negative" });
  return reasons;
}

export { CUSTOMER_SEED };
