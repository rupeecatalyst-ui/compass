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

import {
  LENDER_CASE_STAGE_LABELS,
  LENDER_CASE_STAGES,
  tryCanonicalLenderCaseStage,
} from "@/constants/lender-pipeline";
import {
  buildDocumentWorkspaceHref,
  isCanonicalDocumentWorkspaceId,
} from "@/lib/document-workspace/context-lock";
import { listCanonicalProductOptions, resolveCanonicalProductCode } from "@/constants/enterprise-product-master/canonical-catalog";
import {
  OPPORTUNITY_LIFECYCLE,
  OPPORTUNITY_LIFECYCLE_FILTER_OPTIONS,
} from "@/constants/opportunity-lifecycle";
import type { LenderCaseStage } from "@/types/catalyst-one";

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
  lastActivity?: string;
  amountLabel: string;
  contactId?: string | null;
  productCode?: string | null;
  ownerUserId?: string | null;
  ownerName?: string | null;
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
  grossStage?: string | null;
  rowVersion?: number | null;
  lenderId?: string | null;
  contactId?: string | null;
  contactEmail?: string | null;
  productCode?: string | null;
  ownerUserId?: string | null;
  ownerName?: string | null;
}

/** Rows kept in one pane before the next page. */
export const DESK_VISIBLE_PAGE = 40;

export type DeskActionPanel = "closed" | "collapsed" | "open";

const OPERATIONAL_STAGE_IDS: LenderCaseStage[] = [
  "identified",
  "prelogin",
  "logged_in_wip",
  "soft_approved",
  "final_approved",
  "closure_wip",
  "disbursed",
];

/**
 * Menu of stages the existing Deal transition rules allow a person to request.
 * The transition API remains the authority and can still reject the request.
 */
export function permittedDeskStageTargets(fromStage: string | null | undefined): LenderCaseStage[] {
  const from = tryCanonicalLenderCaseStage(fromStage);
  if (from === "lost" || from === "disbursed" || from === "post_disbursement_confirmation") {
    return [];
  }
  const candidates = (from ? LENDER_CASE_STAGES.map((stage) => stage.id) : OPERATIONAL_STAGE_IDS).filter(
    (id) => id !== from && id !== "post_disbursement_confirmation",
  );
  if (from === "hold") {
    return candidates.filter((id) => OPERATIONAL_STAGE_IDS.includes(id) || id === "lost");
  }
  return candidates.filter(
    (id) => OPERATIONAL_STAGE_IDS.includes(id) || id === "lost" || id === "hold",
  );
}

export function displayDealStage(raw: string | null | undefined): {
  label: string;
  grossStage: string | null;
} {
  const canonical = tryCanonicalLenderCaseStage(raw);
  const key = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (canonical && key === canonical) {
    return { label: LENDER_CASE_STAGE_LABELS[canonical], grossStage: canonical };
  }
  return { label: raw?.trim() || "Not Specified", grossStage: canonical };
}

export function nextActionPanel(
  current: DeskActionPanel,
  command: "open" | "collapse" | "expand" | "close",
): DeskActionPanel {
  if (command === "close") return "closed";
  if (command === "open") return current === "closed" ? "open" : current;
  if (command === "collapse") return current === "open" ? "collapsed" : current;
  if (command === "expand") return current === "collapsed" ? "open" : current;
  return current;
}

export function deskFlex(
  area: DeskArea,
  panel: DeskActionPanel,
): { opportunities: number; deals: number; action: number } {
  const action = panel === "open" ? 0.35 : 0;
  const work = panel === "open" ? 0.65 : 1;
  if (area === "opportunities") return { opportunities: work, deals: 0, action };
  if (area === "deals") return { opportunities: 0, deals: work, action };
  return { opportunities: work * 0.4, deals: work * 0.6, action };
}

export function dealTableRows(groups: DeskDealGroup[]): Array<{ deal: DeskDeal; customerSpan: number }> {
  const rows: Array<{ deal: DeskDeal; customerSpan: number }> = [];
  for (const group of groups) {
    group.deals.forEach((deal, index) => {
      rows.push({ deal, customerSpan: index === 0 ? group.deals.length : 0 });
    });
  }
  return rows;
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
  primaryContactId?: string | null;
  primaryContactEmail?: string | null;
  primaryCounterpartyName?: string | null;
  lenderId?: string | null;
  rowVersion?: number | null;
  productCode?: string | null;
  productLabel?: string | null;
  primaryOwnerUserId?: string | null;
  relationshipManagerUserId?: string | null;
  relationshipManagerName?: string | null;
  productFamily?: string | null;
  grossStage?: string | null;
  requestedAmount?: number | null;
  approvedAmount?: number | null;
  lastActivityAt?: string | null;
  updatedAt?: string | null;
  stageEnteredAt?: string | null;
  createdAt?: string | null;
  archived?: boolean;
  isDeleted?: boolean;
}): DeskDealInput | null {
  if (deal.isDeleted || deal.archived) return null;
  const fallbackActivity = deal.stageEnteredAt || deal.createdAt || "";
  const lastActivity = deal.lastActivityAt && Date.parse(deal.lastActivityAt) > Date.parse(fallbackActivity || "1970-01-01") ? deal.lastActivityAt : fallbackActivity;
  const amount = deal.approvedAmount ?? deal.requestedAmount ?? null;
  const stage = displayDealStage(deal.grossStage);
  return {
    id: deal.id,
    enterpriseDealId: deal.id,
    fileId: deal.legacyLoanFileId?.trim() || deal.id,
    borrower: deal.primaryContactName?.trim() || "Not Specified",
    lender: deal.primaryCounterpartyName?.trim() || "Not Specified",
    stageLabel: stage.label,
    grossStage: stage.grossStage,
    rowVersion: deal.rowVersion ?? null,
    lenderId: deal.lenderId?.trim() || null,
    contactId: deal.primaryContactId?.trim() || null,
    contactEmail: deal.primaryContactEmail?.trim() || null,
    productCode: resolveCanonicalProductCode(deal.productCode || deal.productLabel),
    ownerUserId: deal.primaryOwnerUserId?.trim() || deal.relationshipManagerUserId?.trim() || null,
    ownerName: !deal.primaryOwnerUserId || deal.primaryOwnerUserId === deal.relationshipManagerUserId ? deal.relationshipManagerName?.trim() || null : null,
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
  grossStage?: string | null;
  rowVersion?: number | null;
  lenderId?: string | null;
  contactId?: string | null;
  contactEmail?: string | null;
  productCode?: string | null;
  ownerUserId?: string | null;
  ownerName?: string | null;
}

export interface DeskDealGroup {
  relationshipKey: string;
  opportunityId: string | null;
  customerName: string;
  product: string;
  newestActivity: string;
  deals: DeskDeal[];
}

/** Records with no internal employee owner. Not a person id. */
export const DESK_UNASSIGNED_OWNER = "unassigned";

export const DESK_OPPORTUNITY_STAGE_OPTIONS = OPPORTUNITY_LIFECYCLE_FILTER_OPTIONS.filter(
  (option) => !CONVERTED_OR_CLOSED.has(option.value),
);

export const DESK_DEAL_STAGE_OPTIONS = LENDER_CASE_STAGES.map((stage) => ({
  id: stage.id,
  label: stage.label,
}));

export const DESK_PRODUCT_OPTIONS = listCanonicalProductOptions().map((product) => ({
  id: product.code,
  label: product.label,
}));

export interface DeskFilters {
  query: string;
  opportunityStages: string[];
  dealStages: string[];
  products: string[];
  owners: string[];
}

export interface DeskFilterCatalog {
  opportunityStages: string[];
  dealStages: string[];
  products: string[];
  owners: string[];
}

export function deskFilterCatalog(ownerIds: string[]): DeskFilterCatalog {
  return {
    opportunityStages: DESK_OPPORTUNITY_STAGE_OPTIONS.map((option) => option.value),
    dealStages: DESK_DEAL_STAGE_OPTIONS.map((option) => option.id),
    products: DESK_PRODUCT_OPTIONS.map((option) => option.id),
    owners: [...new Set([...ownerIds.filter(Boolean), DESK_UNASSIGNED_OWNER])],
  };
}

export function systemDefaultDeskFilters(catalog: DeskFilterCatalog): DeskFilters {
  return {
    query: "",
    opportunityStages: [...catalog.opportunityStages],
    dealStages: [...catalog.dealStages],
    products: [...catalog.products],
    owners: [...catalog.owners],
  };
}

export const EMPTY_DESK_FILTERS: DeskFilters = {
  query: "",
  opportunityStages: [],
  dealStages: [],
  products: [],
  owners: [],
};

function knownIds(selected: string[] | undefined, allowed: string[]): string[] {
  const allow = new Set(allowed);
  return [...new Set((selected ?? []).filter((id) => allow.has(id)))];
}

/** Drop saved ids the user can no longer use. An empty list stays empty. */
export function sanitizeDeskFilters(
  saved: Partial<DeskFilters> | null | undefined,
  catalog: DeskFilterCatalog,
): DeskFilters {
  if (!saved) return systemDefaultDeskFilters(catalog);
  return {
    query: typeof saved.query === "string" ? saved.query : "",
    opportunityStages: knownIds(saved.opportunityStages, catalog.opportunityStages),
    dealStages: knownIds(saved.dealStages, catalog.dealStages),
    products: knownIds(saved.products, catalog.products),
    owners: knownIds(saved.owners, catalog.owners),
  };
}

const PREFERENCE_PREFIX = "catalyst-one:case-workbench:default-view:";

export function readDeskDefaultView(userId: string): Partial<DeskFilters> | null {
  if (typeof window === "undefined" || !userId.trim()) return null;
  try {
    const raw = window.localStorage.getItem(`${PREFERENCE_PREFIX}${userId.trim()}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DeskFilters>;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function rememberDeskDefaultView(userId: string, filters: DeskFilters): void {
  if (typeof window === "undefined" || !userId.trim()) return;
  const saved = {
    opportunityStages: filters.opportunityStages,
    dealStages: filters.dealStages,
    products: filters.products,
    owners: filters.owners,
  };
  window.localStorage.setItem(`${PREFERENCE_PREFIX}${userId.trim()}`, JSON.stringify(saved));
}

export function forgetDeskDefaultView(userId: string): void {
  if (typeof window === "undefined" || !userId.trim()) return;
  window.localStorage.removeItem(`${PREFERENCE_PREFIX}${userId.trim()}`);
}

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
      grossStage: row.grossStage ?? null,
      rowVersion: row.rowVersion ?? null,
      lenderId: row.lenderId ?? null,
      contactId: row.contactId ?? null,
      contactEmail: row.contactEmail ?? null,
      productCode: row.productCode ?? resolveCanonicalProductCode(row.product),
      ownerUserId: row.ownerUserId ?? null,
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

function opportunityFilterId(status: string): string {
  const key = status.trim().toLowerCase();
  if (key === OPPORTUNITY_LIFECYCLE.DRAFT) return OPPORTUNITY_LIFECYCLE.DIALOGUE;
  if (key === OPPORTUNITY_LIFECYCLE.ACTIVE) return OPPORTUNITY_LIFECYCLE.IN_PROGRESS;
  return key;
}

function selectedOrAllUnknown(
  selected: string[],
  universe: string[],
  id: string | null | undefined,
): boolean {
  if (selected.length === 0) return false;
  if (!id) return selected.length === universe.length;
  return selected.includes(id);
}

export function filterDesk(
  opportunities: DeskOpportunity[],
  groups: DeskDealGroup[],
  filters: DeskFilters,
  catalog: DeskFilterCatalog = deskFilterCatalog([]),
): { opportunities: DeskOpportunity[]; groups: DeskDealGroup[] } {
  const nextOpportunities = opportunities
    .filter((row) => isActiveUnconvertedOpportunity(row.status))
    .filter((row) =>
      selectedOrAllUnknown(
        filters.opportunityStages,
        catalog.opportunityStages,
        opportunityFilterId(row.status),
      ),
    )
    .filter((row) =>
      selectedOrAllUnknown(
        filters.products,
        catalog.products,
        row.productCode ?? resolveCanonicalProductCode(row.product),
      ),
    )
    .filter((row) =>
      selectedOrAllUnknown(
        filters.owners,
        catalog.owners,
        row.ownerUserId?.trim() || DESK_UNASSIGNED_OWNER,
      ),
    )
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
        if (
          !selectedOrAllUnknown(filters.dealStages, catalog.dealStages, deal.grossStage)
        ) {
          return false;
        }
        if (
          !selectedOrAllUnknown(
            filters.products,
            catalog.products,
            deal.productCode ?? resolveCanonicalProductCode(deal.product),
          )
        ) {
          return false;
        }
        if (
          !selectedOrAllUnknown(
            filters.owners,
            catalog.owners,
            deal.ownerUserId?.trim() || DESK_UNASSIGNED_OWNER,
          )
        ) {
          return false;
        }
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

/** Light blue in light mode; deep navy with white text in dark mode. */
export const DESK_CUSTOMER_GROUP_CLASS =
  "bg-blue-100 text-blue-950 dark:bg-[#071428] dark:text-white";

export const DESK_CUSTOMER_CARD_CLASS =
  "overflow-hidden rounded-md border border-blue-300 bg-card dark:bg-[#071428] dark:border-[#1e3a5f]";

export const DESK_DEAL_ROW_SEPARATOR_CLASS = "border-t border-blue-200 dark:border-[#1e3a5f]";

/** Document Workspace mailbox. Not a second composer or send API. */
export const DESK_EMAIL_COMPOSER = "document-workspace-mailbox";

export function deskEmailLaunch(input: {
  opportunityId: string | null;
  dealId?: string | null;
  kind: "custom" | "template";
}): {
  composer: typeof DESK_EMAIL_COMPOSER;
  opportunityId: string | null;
  dealId: string | null;
  kind: "custom" | "template";
} {
  return {
    composer: DESK_EMAIL_COMPOSER,
    opportunityId: input.opportunityId,
    dealId: input.dealId?.trim() || null,
    kind: input.kind,
  };
}

/** Document Workspace focused by canonical ids. Never the Opportunity stage editor. */
export function deskDocumentWorkspaceHref(input: {
  opportunityId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
}): string | null {
  const opportunityId = input.opportunityId?.trim() || "";
  if (!isCanonicalDocumentWorkspaceId(opportunityId)) return null;
  const dealId = input.dealId?.trim() || "";
  const contactId = input.contactId?.trim() || "";
  return buildDocumentWorkspaceHref({
    opportunityId,
    dealId: isCanonicalDocumentWorkspaceId(dealId) ? dealId : null,
    contactId: isCanonicalDocumentWorkspaceId(contactId) ? contactId : null,
  });
}

export interface DeskLenderContact {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  designation: string | null;
}

function readAssociatedLenderContact(
  raw: Record<string, unknown>,
  fallbackId: string,
): DeskLenderContact | null {
  const name = String(raw.lenderSalesContactName ?? "").trim();
  const email = String(raw.lenderSalesContactOfficialEmail ?? "").trim();
  const mobile = String(raw.lenderSalesContactMobile ?? "").trim();
  const designation = String(raw.lenderSalesContactDesignationLabel ?? "").trim();
  if (!name && !email && !mobile) return null;
  return {
    id: String(raw.lenderSalesContactId ?? "").trim() || fallbackId,
    name: name || "Not Specified",
    email: email || null,
    mobile: mobile || null,
    designation: designation || null,
  };
}

/**
 * Sales contacts stored on this Deal's snapshot only.
 * Another lender card in the same snapshot is not this Deal's contact.
 */
export function associatedLenderContacts(deal: {
  id: string;
  lenderId?: string | null;
  snapshot?: unknown;
}): DeskLenderContact[] {
  const snap =
    deal.snapshot && typeof deal.snapshot === "object"
      ? (deal.snapshot as Record<string, unknown>)
      : null;
  if (!snap) return [];
  const lenders = Array.isArray(snap.lenders) ? snap.lenders : [];
  const matched = lenders.filter((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const card = raw as Record<string, unknown>;
    const cardDeal = String(card.enterpriseDealId ?? "").trim();
    const cardLender = String(card.lenderRegistryId ?? card.lenderId ?? "").trim();
    if (cardDeal && cardDeal === deal.id) return true;
    if (!cardDeal && deal.lenderId && cardLender === deal.lenderId) return true;
    return false;
  });
  const sources = matched.length > 0 ? matched : lenders.length === 0 ? [snap] : [];
  const seen = new Set<string>();
  const contacts: DeskLenderContact[] = [];
  sources.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") return;
    const contact = readAssociatedLenderContact(raw as Record<string, unknown>, `${deal.id}:${index}`);
    if (!contact || seen.has(contact.id)) return;
    seen.add(contact.id);
    contacts.push(contact);
  });
  return contacts;
}

/** Read projection from a server-confirmed conversation; never modifies stages or siblings. */
export function applyPersistedDeskActivity(
  deals: DeskDealInput[], opportunities: DeskOpportunity[],
  activity: import("@/types/enterprise-conversation-activity").EnterpriseConversationActivity,
): { deals: DeskDealInput[]; opportunities: DeskOpportunity[] } {
  if (activity.status !== "saved" || !activity.savedAt || !Number.isFinite(Date.parse(activity.recordedAt))) return { deals, opportunities };
  const timestamp = activity.recordedAt;
  return {
    deals: deals.map(deal => deal.id === activity.dealId && (!deal.lastActivity || Date.parse(timestamp) > Date.parse(deal.lastActivity)) ? {
      ...deal, lastActivity: timestamp,
      lastActivityLabel: new Date(timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    } : deal),
    opportunities: opportunities.map(opportunity => opportunity.id === activity.opportunityId && (!opportunity.lastActivity || timestamp > opportunity.lastActivity) ? { ...opportunity, lastActivity: timestamp } : opportunity),
  };
}
