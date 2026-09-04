/**
 * CO-C1-DOCUMENT-WORKSPACE-CARD-GRID-012
 * Deterministic Opportunity → Deal grouping and card-grid helpers.
 * Navigation identity stays canonical IDs. Document Registry remains SSOT.
 * Default order is Opportunity.createdAt DESC with Opportunity ID tie-break.
 */

import {
  DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_SORT,
  DOCUMENT_WORKSPACE_CARD_GRID_STATE_KEY,
} from "@/constants/document-workspace-card-grid";
import { compareOpportunityCreatedAtThenIdDesc } from "@/lib/enterprise-opportunity/search-order";
import { documentWorkspaceContextLooksLikePii } from "@/lib/document-workspace/context-lock";
import { mergeDocumentWorkspaceRows } from "@/lib/document-workspace/merge-rows";
import { countDocumentWorkspaceReviews } from "@/lib/document-workspace/review-status";
import { filterRegistryRecordsForLockedContext } from "@/lib/document-workspace/context-lock";
import type { DocumentRegistryRecord } from "@/types/document-registry";
import type { DocumentRequestItemState } from "@/types/document-requests";
import type { DocumentWorkspaceContextInput } from "@/types/document-workspace-context";
import type {
  DocumentWorkspaceCardGridFilters,
  DocumentWorkspaceCardGridPersistedState,
  DocumentWorkspaceCardGroup,
  DocumentWorkspaceCardReadiness,
  DocumentWorkspaceDealCard,
  DocumentWorkspaceDealCardInput,
  DocumentWorkspaceOpportunityCard,
  DocumentWorkspaceOpportunityGroupInput,
  DocumentWorkspaceTransactionCard,
} from "@/types/document-workspace-card-grid";

export const DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_FILTERS: DocumentWorkspaceCardGridFilters = {
  chip: "all",
};

export function documentWorkspaceCardKey(
  kind: "opportunity" | "deal",
  opportunityId: string,
  dealId?: string | null,
): string {
  return kind === "deal"
    ? `deal:${opportunityId}:${dealId || ""}`
    : `opportunity:${opportunityId}`;
}

export const compareTimestampDescThenId = compareOpportunityCreatedAtThenIdDesc;

export function sanitizeDocumentWorkspaceCardGridQuery(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (documentWorkspaceContextLooksLikePii(trimmed)) return "";
  return trimmed;
}

function cardSearchHaystack(card: DocumentWorkspaceTransactionCard): string {
  const dealNumber = card.kind === "deal" ? card.dealNumber : "";
  const lenderName = card.kind === "deal" ? card.lenderName : "";
  return [
    card.borrowerName,
    card.opportunityNumber,
    dealNumber,
    card.product,
    lenderName,
    card.assignedRc,
    card.stage,
  ]
    .join(" ")
    .toLowerCase();
}

export function cardMatchesDisplaySearch(
  card: DocumentWorkspaceTransactionCard,
  query: string,
): boolean {
  const needle = sanitizeDocumentWorkspaceCardGridQuery(query).toLowerCase();
  if (!needle) return true;
  return cardSearchHaystack(card).includes(needle);
}

function groupMatchesSearch(
  opportunity: DocumentWorkspaceOpportunityCard,
  deals: DocumentWorkspaceDealCard[],
  query: string,
): boolean {
  if (cardMatchesDisplaySearch(opportunity, query)) return true;
  return deals.some((deal) => cardMatchesDisplaySearch(deal, query));
}

function isAssignedToActor(
  group: DocumentWorkspaceOpportunityGroupInput,
  actor?: { userId?: string | null; name?: string | null },
): boolean {
  const userId = actor?.userId?.trim() || "";
  const name = actor?.name?.trim().toLowerCase() || "";
  if (userId && group.assignedUserId?.trim() === userId) return true;
  if (name && group.assignedRc.trim().toLowerCase() === name) return true;
  return false;
}

function sortDeals(deals: DocumentWorkspaceDealCardInput[]): DocumentWorkspaceDealCardInput[] {
  return [...deals].sort((a, b) =>
    compareTimestampDescThenId(a.createdAt, b.createdAt, a.dealId, b.dealId),
  );
}

function uniqueDeals(deals: DocumentWorkspaceDealCardInput[]): DocumentWorkspaceDealCardInput[] {
  const seen = new Set<string>();
  const out: DocumentWorkspaceDealCardInput[] = [];
  for (const deal of deals) {
    if (!deal.dealId || seen.has(deal.dealId)) continue;
    if (deal.opportunityId && deal.dealId === deal.opportunityId) continue;
    seen.add(deal.dealId);
    out.push(deal);
  }
  return out;
}

export function sortOpportunityGroups(
  groups: DocumentWorkspaceOpportunityGroupInput[],
  _sort: typeof DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_SORT | string = DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_SORT,
): DocumentWorkspaceOpportunityGroupInput[] {
  void _sort;
  const copy = groups.map((group) => ({
    ...group,
    deals: sortDeals(uniqueDeals(group.deals.filter((d) => d.opportunityId === group.opportunityId))),
  }));
  copy.sort((a, b) =>
    compareTimestampDescThenId(a.createdAt, b.createdAt, a.opportunityId, b.opportunityId),
  );
  return copy;
}

function toOpportunityCard(
  group: DocumentWorkspaceOpportunityGroupInput,
): DocumentWorkspaceOpportunityCard {
  return {
    kind: "opportunity",
    key: documentWorkspaceCardKey("opportunity", group.opportunityId),
    opportunityId: group.opportunityId,
    contactId: group.contactId,
    companyId: group.companyId,
    borrowerName: group.borrowerName,
    opportunityNumber: group.opportunityNumber,
    product: group.product,
    amountLabel: group.amountLabel,
    stage: group.stage,
    assignedRc: group.assignedRc,
    assignedUserId: group.assignedUserId,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    linkedDealCount: group.deals.length,
    opportunityCreatedAt: group.createdAt,
  };
}

function toDealCard(
  group: DocumentWorkspaceOpportunityGroupInput,
  deal: DocumentWorkspaceDealCardInput,
): DocumentWorkspaceDealCard {
  return {
    kind: "deal",
    key: documentWorkspaceCardKey("deal", group.opportunityId, deal.dealId),
    opportunityId: group.opportunityId,
    dealId: deal.dealId,
    contactId: deal.contactId || group.contactId,
    companyId: deal.companyId || group.companyId,
    borrowerName: deal.borrowerName || group.borrowerName,
    opportunityNumber: group.opportunityNumber,
    dealNumber: deal.dealNumber,
    lenderName: deal.lenderName,
    lenderId: deal.lenderId,
    product: deal.product || group.product,
    amountLabel: deal.amountLabel,
    stage: deal.stage,
    assignedRc: deal.assignedRc || group.assignedRc,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
    opportunityCreatedAt: group.createdAt,
  };
}

export function buildDocumentWorkspaceCardGroups(
  groups: DocumentWorkspaceOpportunityGroupInput[],
  filters: DocumentWorkspaceCardGridFilters = DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_FILTERS,
  query = "",
  actor?: { userId?: string | null; name?: string | null },
): DocumentWorkspaceCardGroup[] {
  const ordered = sortOpportunityGroups(groups, DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_SORT);
  const out: DocumentWorkspaceCardGroup[] = [];
  const seen = new Set<string>();

  for (const group of ordered) {
    if (seen.has(group.opportunityId)) continue;
    seen.add(group.opportunityId);
    if (filters.chip === "assigned_to_me" && !isAssignedToActor(group, actor)) continue;

    const opportunity = toOpportunityCard(group);
    const deals = group.deals.map((deal) => toDealCard(group, deal));
    if (!groupMatchesSearch(opportunity, deals, query)) continue;

    out.push({
      opportunityId: group.opportunityId,
      opportunityCreatedAt: group.createdAt,
      opportunityUpdatedAt: group.updatedAt,
      linkedDealCount: group.deals.length,
      opportunity,
      deals,
    });
  }
  return out;
}

export function flattenDocumentWorkspaceCardGroups(
  groups: DocumentWorkspaceCardGroup[],
): DocumentWorkspaceTransactionCard[] {
  return groups.flatMap((group) => [group.opportunity, ...group.deals]);
}

export function filterGroupsWithPendingDocuments(
  groups: DocumentWorkspaceCardGroup[],
  readinessByKey: Map<string, DocumentWorkspaceCardReadiness>,
): DocumentWorkspaceCardGroup[] {
  return groups.filter((group) => {
    const readiness = readinessByKey.get(group.opportunity.key);
    if (!readiness?.available) return false;
    return readiness.pending > 0 || readiness.reviewPending || readiness.rejected > 0 || readiness.expired > 0;
  });
}

export function buildDocumentWorkspaceCardSelectPayload(
  card: DocumentWorkspaceTransactionCard,
): DocumentWorkspaceContextInput {
  return {
    opportunityId: card.opportunityId,
    dealId: card.kind === "deal" ? card.dealId : null,
    contactId: card.contactId || null,
    companyId: card.companyId || null,
  };
}

export function deriveDocumentWorkspaceCardReadiness(input: {
  opportunityId: string;
  dealId?: string | null;
  lodItems: DocumentRequestItemState[];
  records: DocumentRegistryRecord[];
}): DocumentWorkspaceCardReadiness {
  if (!input.lodItems.length) return { available: false };
  const scoped = filterRegistryRecordsForLockedContext({
    records: input.records,
    opportunityId: input.opportunityId,
    dealId: input.dealId,
  });
  const rows = mergeDocumentWorkspaceRows({
    records: scoped,
    lodItems: input.lodItems,
    participants: [],
  });
  if (!rows.length) return { available: false };
  const counts = countDocumentWorkspaceReviews(rows);
  const received = counts.received + counts.under_review + counts.accepted;
  return {
    available: true,
    percent: Math.round((received / rows.length) * 100),
    required: rows.length,
    received: counts.received,
    accepted: counts.accepted,
    pending: counts.pending,
    rejected: counts.rejected,
    expired: counts.expired,
    reviewPending: counts.received > 0 || counts.under_review > 0,
    replacementOrRejection: counts.rejected > 0 || counts.replacement_requested > 0,
  };
}

export function mergeOpportunityGroups(
  existing: DocumentWorkspaceOpportunityGroupInput[],
  incoming: DocumentWorkspaceOpportunityGroupInput[],
): DocumentWorkspaceOpportunityGroupInput[] {
  const byId = new Map<string, DocumentWorkspaceOpportunityGroupInput>();
  for (const group of [...existing, ...incoming]) {
    const prior = byId.get(group.opportunityId);
    if (!prior) {
      byId.set(group.opportunityId, {
        ...group,
        deals: uniqueDeals(group.deals),
      });
      continue;
    }
    byId.set(group.opportunityId, {
      ...prior,
      ...group,
      deals: uniqueDeals([...prior.deals, ...group.deals]),
    });
  }
  return [...byId.values()];
}

function sanitizePersistedFilters(value: unknown): DocumentWorkspaceCardGridFilters {
  const chip =
    value && typeof value === "object" && "chip" in value
      ? String((value as { chip?: unknown }).chip)
      : "all";
  if (
    chip === "pending_documents" ||
    chip === "recently_created" ||
    chip === "assigned_to_me"
  ) {
    return { chip };
  }
  return { ...DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_FILTERS };
}

export function readDocumentWorkspaceCardGridState(): DocumentWorkspaceCardGridPersistedState | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DOCUMENT_WORKSPACE_CARD_GRID_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DocumentWorkspaceCardGridPersistedState;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      query: typeof parsed.query === "string" ? parsed.query : "",
      filters: sanitizePersistedFilters(parsed.filters),
      opportunityOffset: Number(parsed.opportunityOffset) || 0,
      dealSearchPage: Number(parsed.dealSearchPage) || 1,
      scrollTop: Number(parsed.scrollTop) || 0,
      lastCardKey: parsed.lastCardKey || null,
    };
  } catch {
    return null;
  }
}

export function writeDocumentWorkspaceCardGridState(
  state: DocumentWorkspaceCardGridPersistedState,
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(DOCUMENT_WORKSPACE_CARD_GRID_STATE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}
