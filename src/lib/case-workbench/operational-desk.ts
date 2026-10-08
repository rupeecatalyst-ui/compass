/**
 * Case Workbench — read model (Phase B Step 1).
 *
 * Presentation and grouping only. Does not score, classify, or place Deals.
 * Parallel Deals group by the Opportunity relationship already stored on the Deal
 * (`opportunityId` when known, otherwise the Opportunity number from that relationship).
 * Customer names are never a grouping key.
 *
 * SSOT: the desk and Deal Workspace are two interfaces to the same Catalyst One
 * records. Later write steps must call the existing Deal, contact, task,
 * communication, note, activity, and document services, including their
 * permissions, concurrency, and audit. A lender Deal keeps its own identity.
 * No second table, mutation API, stage engine, or activity history.
 * A failed mutation must leave both workspaces unchanged. Bidirectional
 * consistency tests are required before any write control is enabled.
 */

import { OPPORTUNITY_LIFECYCLE } from "@/constants/opportunity-lifecycle";

const CONVERTED_OR_CLOSED = new Set<string>([
  OPPORTUNITY_LIFECYCLE.CONVERTED_TO_DEAL,
  OPPORTUNITY_LIFECYCLE.COMPLETED,
  OPPORTUNITY_LIFECYCLE.LOST,
  OPPORTUNITY_LIFECYCLE.CANCELLED,
  OPPORTUNITY_LIFECYCLE.WON,
  OPPORTUNITY_LIFECYCLE.ARCHIVED,
]);

export type DeskArea = "split" | "opportunities" | "deals";

export interface DeskOpportunity {
  id: string;
  opportunityNumber: string;
  customerName: string;
  product: string;
  stageLabel: string;
  status: string;
  updatedAt: string;
  amountLabel: string;
}

export interface DeskDealInput {
  id: string;
  enterpriseDealId?: string;
  fileId: string;
  borrower: string;
  lender: string;
  stageLabel: string;
  product: string;
  loanAmountLabel: string;
  lastActivity: string;
  lastActivityLabel: string;
  /** EnterpriseDeal.opportunityId when the registry stored it. */
  opportunityId?: string | null;
  /** Opportunity number joined on the Deal record. Legacy fallback only. */
  opportunityNumber?: string | null;
}

/** Server searchDeals caps pageSize at 100. */
export const CASE_WORKBENCH_DEAL_PAGE_SIZE = 100;
/** Server opportunity search caps limit at 200. */
export const CASE_WORKBENCH_OPPORTUNITY_PAGE_SIZE = 200;

export function pageCount(total: number, pageSize: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.ceil(total / Math.max(1, pageSize));
}

/** A page set is complete only when every authorized record was returned. */
export function joinPagedItems<T>(pages: Array<{ items: T[]; total: number }>): {
  items: T[];
  complete: boolean;
  total: number;
} {
  const items = pages.flatMap((page) => page.items);
  const total = pages[0]?.total ?? 0;
  return { items, complete: items.length === total, total };
}

/**
 * A failed reload keeps the last successful rows.
 * A successful reload replaces them with the registry result.
 */
export function applyDeskRefresh<T>(
  current: T,
  result: { ok: true; data: T } | { ok: false; message: string },
): { data: T; error: string | null } {
  if (!result.ok) return { data: current, error: result.message };
  return { data: result.data, error: null };
}

export function formatDeskAmount(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return "Not Specified";
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function mapRegistryDealToDeskInput(deal: {
  id: string;
  opportunityId?: string | null;
  opportunityNumber?: string | null;
  legacyLoanFileId?: string | null;
  primaryContactName?: string | null;
  primaryCounterpartyName?: string | null;
  productLabel?: string | null;
  productFamily?: string | null;
  grossStage?: string | null;
  requestedAmount?: number | null;
  approvedAmount?: number | null;
  updatedAt?: string | null;
  stageEnteredAt?: string | null;
  createdAt?: string | null;
  archived?: boolean;
  isDeleted?: boolean;
}): DeskDealInput | null {
  if (deal.isDeleted || deal.archived) return null;
  const lastActivity = deal.updatedAt || deal.stageEnteredAt || deal.createdAt || "";
  const amount = deal.approvedAmount ?? deal.requestedAmount ?? null;
  return {
    id: deal.id,
    enterpriseDealId: deal.id,
    fileId: deal.legacyLoanFileId?.trim() || deal.id,
    borrower: deal.primaryContactName?.trim() || "Not Specified",
    lender: deal.primaryCounterpartyName?.trim() || "Not Specified",
    stageLabel: deal.grossStage?.trim() || "Not Specified",
    product: deal.productLabel?.trim() || deal.productFamily?.trim() || "Not Specified",
    loanAmountLabel: formatDeskAmount(amount),
    lastActivity,
    lastActivityLabel: lastActivity
      ? new Date(lastActivity).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Not Specified",
    opportunityId: deal.opportunityId?.trim() || null,
    opportunityNumber: deal.opportunityNumber?.trim() || null,
  };
}

export interface DeskDeal {
  id: string;
  fileId: string;
  /** Authoritative relationship key. Never a customer name. */
  relationshipKey: string;
  opportunityId: string | null;
  customerName: string;
  lenderName: string;
  product: string;
  stageLabel: string;
  amountLabel: string;
  lastActivity: string;
  lastActivityLabel: string;
}

export interface DeskDealGroup {
  relationshipKey: string;
  opportunityId: string | null;
  customerName: string;
  product: string;
  newestActivity: string;
  deals: DeskDeal[];
}

export interface DeskFilters {
  query: string;
  stage: string;
  product: string;
}

export const EMPTY_DESK_FILTERS: DeskFilters = {
  query: "",
  stage: "all",
  product: "all",
};

export type DeskSelection =
  | { kind: "opportunity"; id: string }
  | { kind: "deal"; id: string };

export function isActiveUnconvertedOpportunity(status: string | null | undefined): boolean {
  const key = (status || "").trim().toLowerCase();
  if (!key) return false;
  return !CONVERTED_OR_CLOSED.has(key);
}

function activityTime(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Group by EnterpriseDeal.opportunityId when the Deal stores it.
 * Legacy rows without that id may share an Opportunity number already on the Deal.
 * Customer name is never the key. A Deal with neither stays alone.
 */
export function projectDeskDeals(rows: DeskDealInput[]): DeskDeal[] {
  return rows.map((row) => {
    const opportunityId = row.opportunityId?.trim() || "";
    const opportunityNumber = row.opportunityNumber?.trim() || "";
    const relationshipKey = opportunityId
      ? `opportunity:${opportunityId}`
      : opportunityNumber
        ? `opportunity-number:${opportunityNumber}`
        : `deal:${row.enterpriseDealId || row.id}`;
    const lender = row.lender.trim();
    return {
      id: row.enterpriseDealId || row.id,
      fileId: row.fileId,
      relationshipKey,
      opportunityId: opportunityId || null,
      customerName: row.borrower.trim() || "Not Specified",
      lenderName: lender || "Not Specified",
      product: row.product.trim() || "Not Specified",
      stageLabel: row.stageLabel.trim() || "Not Specified",
      amountLabel: row.loanAmountLabel.trim() || "Not Specified",
      lastActivity: row.lastActivity,
      lastActivityLabel: row.lastActivityLabel.trim() || "Not Specified",
    };
  });
}

export function groupDealsByOpportunity(deals: DeskDeal[]): DeskDealGroup[] {
  const groups = new Map<string, DeskDealGroup>();
  for (const deal of deals) {
    const existing = groups.get(deal.relationshipKey);
    if (!existing) {
      groups.set(deal.relationshipKey, {
        relationshipKey: deal.relationshipKey,
        opportunityId: deal.opportunityId,
        customerName: deal.customerName,
        product: deal.product,
        newestActivity: deal.lastActivity,
        deals: [deal],
      });
      continue;
    }
    existing.deals.push(deal);
    if (activityTime(deal.lastActivity) > activityTime(existing.newestActivity)) {
      existing.newestActivity = deal.lastActivity;
    }
  }
  const list = [...groups.values()];
  for (const group of list) {
    group.deals.sort((a, b) => activityTime(b.lastActivity) - activityTime(a.lastActivity));
    const newest = group.deals[0];
    if (newest) {
      group.customerName = newest.customerName;
      group.product = newest.product;
    }
  }
  list.sort((a, b) => activityTime(b.newestActivity) - activityTime(a.newestActivity));
  return list;
}

function matchesQuery(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack.toLowerCase().includes(q);
}

export function filterDesk(
  opportunities: DeskOpportunity[],
  groups: DeskDealGroup[],
  filters: DeskFilters,
): { opportunities: DeskOpportunity[]; groups: DeskDealGroup[] } {
  const stage = filters.stage;
  const product = filters.product;
  const nextOpportunities = opportunities
    .filter((row) => isActiveUnconvertedOpportunity(row.status))
    .filter((row) => (stage === "all" ? true : row.stageLabel === stage))
    .filter((row) => (product === "all" ? true : row.product === product))
    .filter((row) =>
      matchesQuery(
        [row.customerName, row.product, row.stageLabel, row.amountLabel].join(" "),
        filters.query,
      ),
    )
    .sort((a, b) => activityTime(b.updatedAt) - activityTime(a.updatedAt));

  const nextGroups = groups
    .map((group) => {
      const deals = group.deals.filter((deal) => {
        if (stage !== "all" && deal.stageLabel !== stage) return false;
        if (product !== "all" && deal.product !== product) return false;
        return matchesQuery(
          [deal.customerName, deal.lenderName, deal.product, deal.stageLabel, deal.amountLabel].join(" "),
          filters.query,
        );
      });
      if (deals.length === 0) return null;
      const newestDeal = [...deals].sort(
        (a, b) => activityTime(b.lastActivity) - activityTime(a.lastActivity),
      )[0];
      return {
        ...group,
        customerName: newestDeal?.customerName ?? group.customerName,
        product: newestDeal?.product ?? group.product,
        deals,
        newestActivity: deals.reduce(
          (newest, deal) =>
            activityTime(deal.lastActivity) > activityTime(newest) ? deal.lastActivity : newest,
          deals[0]?.lastActivity ?? "",
        ),
      };
    })
    .filter((group): group is DeskDealGroup => group !== null)
    .sort((a, b) => activityTime(b.newestActivity) - activityTime(a.newestActivity));

  return { opportunities: nextOpportunities, groups: nextGroups };
}

export function deskFilterOptions(
  opportunities: DeskOpportunity[],
  groups: DeskDealGroup[],
): { stages: string[]; products: string[] } {
  const stages = new Set<string>();
  const products = new Set<string>();
  for (const row of opportunities) {
    if (isActiveUnconvertedOpportunity(row.status)) {
      if (row.stageLabel) stages.add(row.stageLabel);
      if (row.product) products.add(row.product);
    }
  }
  for (const group of groups) {
    if (group.product) products.add(group.product);
    for (const deal of group.deals) {
      if (deal.stageLabel) stages.add(deal.stageLabel);
      if (deal.product) products.add(deal.product);
    }
  }
  return {
    stages: [...stages].sort((a, b) => a.localeCompare(b)),
    products: [...products].sort((a, b) => a.localeCompare(b)),
  };
}

/** Strings rendered in the transaction grid. Technical ids must not appear here. */
export function deskGridLabels(
  opportunities: DeskOpportunity[],
  groups: DeskDealGroup[],
): string[] {
  const labels: string[] = [];
  for (const row of opportunities) {
    labels.push(row.customerName, row.product, row.stageLabel, row.amountLabel);
  }
  for (const group of groups) {
    labels.push(group.customerName, group.product);
    for (const deal of group.deals) {
      labels.push(deal.lenderName, deal.stageLabel, deal.amountLabel, deal.lastActivityLabel);
    }
  }
  return labels;
}

export function cycleDeskArea(current: DeskArea, target: "opportunities" | "deals"): DeskArea {
  return current === target ? "split" : target;
}
