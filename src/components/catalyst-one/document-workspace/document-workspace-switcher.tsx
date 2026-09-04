"use client";

/**
 * CO-C1-DOCUMENT-WORKSPACE-CARD-GRID-012
 * Full-width Opportunity card grid with nested lender Deals.
 * Selection writes canonical IDs only. Enterprise Document Registry remains SSOT.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DocumentWorkspaceCardGridSkeleton,
  DocumentWorkspaceTransactionCardView,
} from "@/components/catalyst-one/document-workspace/document-workspace-transaction-card";
import {
  DOCUMENT_WORKSPACE_CARD_GRID_CHIPS,
  DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_SORT,
  DOCUMENT_WORKSPACE_CARD_GRID_LOAD_MORE_LABEL,
  DOCUMENT_WORKSPACE_CARD_GRID_PAGE_SIZE,
  DOCUMENT_WORKSPACE_CARD_GRID_SEARCH_PLACEHOLDER,
} from "@/constants/document-workspace-card-grid";
import { ROUTES } from "@/constants/routes";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { listDocumentsForOpportunityRuntime } from "@/lib/document-registry";
import { getDocumentRequestState } from "@/lib/document-requests";
import { isCanonicalDocumentWorkspaceId } from "@/lib/document-workspace/context-lock";
import {
  DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_FILTERS,
  buildDocumentWorkspaceCardGroups,
  buildDocumentWorkspaceCardSelectPayload,
  deriveDocumentWorkspaceCardReadiness,
  filterGroupsWithPendingDocuments,
  mergeOpportunityGroups,
  readDocumentWorkspaceCardGridState,
  sanitizeDocumentWorkspaceCardGridQuery,
  writeDocumentWorkspaceCardGridState,
} from "@/lib/document-workspace/transaction-card-grid";
import {
  displayOpportunityAmount,
  displayOpportunityRequirementStageLabel,
  displayOpportunityText,
} from "@/lib/lead-opportunity-journey/opportunity-field-display";
import { cn } from "@/lib/utils";
import type { DocumentWorkspaceContextInput } from "@/types/document-workspace-context";
import type {
  DocumentWorkspaceCardGridChipId,
  DocumentWorkspaceCardGridFilters,
  DocumentWorkspaceCardReadiness,
  DocumentWorkspaceDealCard,
  DocumentWorkspaceOpportunityCard,
  DocumentWorkspaceOpportunityGroupInput,
} from "@/types/document-workspace-card-grid";

function borrowerName(contactName?: string | null, companyName?: string | null): string {
  return displayOpportunityText(contactName || companyName);
}

function mapDeal(
  opportunity: EnterpriseOpportunityApiRecord,
  deal: EnterpriseDealApiRecord,
): DocumentWorkspaceOpportunityGroupInput["deals"][number] | null {
  if (!isCanonicalDocumentWorkspaceId(deal.id)) return null;
  if (deal.opportunityId && deal.opportunityId !== opportunity.id) return null;
  return {
    dealId: deal.id,
    dealNumber: deal.dealNumber,
    opportunityId: opportunity.id,
    opportunityNumber: opportunity.opportunityNumber,
    borrowerName: borrowerName(
      deal.primaryContactName || opportunity.primaryContactName,
      deal.companyName || opportunity.companyName,
    ),
    lenderName: displayOpportunityText(deal.primaryCounterpartyName),
    lenderId: deal.lenderId,
    product: displayOpportunityText(deal.productLabel || opportunity.productLabel),
    amountLabel: displayOpportunityAmount(deal.requestedAmount ?? opportunity.requestedAmount, {
      captured: deal.requestedAmount != null || opportunity.requirementCaptured,
    }),
    stage: displayOpportunityText(deal.grossStage),
    assignedRc: displayOpportunityText(
      deal.relationshipManagerName || opportunity.relationshipManagerName,
    ),
    createdAt: deal.createdAt || null,
    updatedAt: deal.updatedAt || null,
    contactId: deal.primaryContactId || opportunity.primaryContactId,
    companyId: deal.companyId || opportunity.companyId,
  };
}

function mapOpportunity(
  opportunity: EnterpriseOpportunityApiRecord,
  deals: EnterpriseDealApiRecord[],
): DocumentWorkspaceOpportunityGroupInput | null {
  if (!isCanonicalDocumentWorkspaceId(opportunity.id)) return null;
  return {
    opportunityId: opportunity.id,
    opportunityNumber: opportunity.opportunityNumber,
    borrowerName: borrowerName(opportunity.primaryContactName, opportunity.companyName),
    product: displayOpportunityText(opportunity.productLabel),
    amountLabel: displayOpportunityAmount(opportunity.requestedAmount, {
      captured: opportunity.requirementCaptured,
    }),
    stage: displayOpportunityRequirementStageLabel(opportunity.requirementStage),
    lifecycleStatus: opportunity.lifecycleStatus || opportunity.requirementStage || "",
    assignedRc: displayOpportunityText(opportunity.relationshipManagerName),
    assignedUserId: opportunity.relationshipManagerUserId || opportunity.primaryOwnerUserId || null,
    createdAt: opportunity.createdAt || null,
    updatedAt: opportunity.updatedAt || null,
    contactId: opportunity.primaryContactId,
    companyId: opportunity.companyId,
    deals: deals
      .map((deal) => mapDeal(opportunity, deal))
      .filter((row): row is NonNullable<typeof row> => Boolean(row)),
  };
}

export function DocumentWorkspaceSwitcher({
  onSelect,
  compact = false,
  actorUserId = null,
  actorName = "",
}: {
  onSelect: (input: DocumentWorkspaceContextInput) => void;
  compact?: boolean;
  actorUserId?: string | null;
  actorName?: string;
}) {
  const restored = useRef(readDocumentWorkspaceCardGridState());
  const [query, setQuery] = useState(restored.current?.query ?? "");
  const [filters, setFilters] = useState<DocumentWorkspaceCardGridFilters>(
    restored.current?.filters ?? DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_FILTERS,
  );
  const [groups, setGroups] = useState<DocumentWorkspaceOpportunityGroupInput[]>([]);
  const [opportunityOffset, setOpportunityOffset] = useState(0);
  const [opportunityTotal, setOpportunityTotal] = useState(0);
  const [dealSearchPage, setDealSearchPage] = useState(1);
  const [busy, setBusy] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadGen = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const restoreScroll = useRef(restored.current?.scrollTop ?? 0);
  const restoreFocusKey = useRef(restored.current?.lastCardKey ?? null);
  const didRestoreFocus = useRef(false);
  const actor = useMemo(
    () => ({ userId: actorUserId, name: actorName }),
    [actorName, actorUserId],
  );

  const persist = useCallback(
    (patch?: Partial<{
      query: string;
      filters: DocumentWorkspaceCardGridFilters;
      opportunityOffset: number;
      dealSearchPage: number;
      lastCardKey: string | null;
    }>) => {
      writeDocumentWorkspaceCardGridState({
        query: patch?.query ?? query,
        filters: patch?.filters ?? filters,
        opportunityOffset: patch?.opportunityOffset ?? opportunityOffset,
        dealSearchPage: patch?.dealSearchPage ?? dealSearchPage,
        scrollTop: compact
          ? (scrollRef.current?.scrollTop ?? restoreScroll.current)
          : (typeof window === "undefined" ? 0 : window.scrollY),
        lastCardKey: patch?.lastCardKey ?? restoreFocusKey.current,
      });
    },
    [compact, dealSearchPage, filters, opportunityOffset, query],
  );

  const loadPage = useCallback(
    async (input: {
      reset: boolean;
      query: string;
      offset: number;
      dealPage: number;
    }) => {
      const gen = ++loadGen.current;
      if (input.reset) {
        setBusy(true);
        setGroups([]);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      const q = sanitizeDocumentWorkspaceCardGridQuery(input.query);
      try {
        const page = await enterpriseOpportunityApiClient.searchOpportunities({
          q: q || undefined,
          orderBy: "createdAt",
          limit: DOCUMENT_WORKSPACE_CARD_GRID_PAGE_SIZE,
          offset: input.offset,
        });
        if (gen !== loadGen.current) return;

        const mapped = await Promise.all(
          page.items.map(async (item) => {
            try {
              const deals = await enterpriseDealApiClient.listDealsByOpportunity(item.id);
              return mapOpportunity(item, deals.items);
            } catch {
              return mapOpportunity(item, []);
            }
          }),
        );

        let incoming = mapped.filter((row): row is DocumentWorkspaceOpportunityGroupInput => Boolean(row));

        if (q) {
          try {
            const dealHits = await enterpriseDealApiClient.searchDeals({
              q,
              archived: false,
              page: input.dealPage,
              pageSize: DOCUMENT_WORKSPACE_CARD_GRID_PAGE_SIZE,
              view: "summary",
            });
            const missingIds = [
              ...new Set(
                dealHits.items
                  .map((deal) => deal.opportunityId?.trim() || "")
                  .filter((id) => isCanonicalDocumentWorkspaceId(id)),
              ),
            ].filter((id) => !incoming.some((group) => group.opportunityId === id));
            const extras = await Promise.all(
              missingIds.map(async (id) => {
                try {
                  const opportunity = await enterpriseOpportunityApiClient.getOpportunity(id);
                  const deals = await enterpriseDealApiClient.listDealsByOpportunity(id);
                  return mapOpportunity(opportunity, deals.items);
                } catch {
                  return null;
                }
              }),
            );
            incoming = incoming.concat(
              extras.filter((row): row is DocumentWorkspaceOpportunityGroupInput => Boolean(row)),
            );
          } catch {
            /* deal search is additive discovery only */
          }
        }

        if (gen !== loadGen.current) return;
        setOpportunityTotal(page.total);
        setOpportunityOffset(input.offset + page.items.length);
        setDealSearchPage(q ? input.dealPage + 1 : 1);
        setGroups((prior) => (input.reset ? incoming : mergeOpportunityGroups(prior, incoming)));
      } catch (err) {
        if (gen !== loadGen.current) return;
        setError(err instanceof Error ? err.message : "Unable to load authorised transactions.");
        if (input.reset) setGroups([]);
      } finally {
        if (gen === loadGen.current) {
          setBusy(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  const restoreOffsetTarget = useRef(restored.current?.opportunityOffset ?? 0);
  const skipRestoreOffsetReset = useRef(true);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadPage({
        reset: true,
        query,
        offset: 0,
        dealPage: 1,
      });
    }, query.trim() ? 280 : 0);
    return () => window.clearTimeout(handle);
  }, [loadPage, query]);

  useEffect(() => {
    if (skipRestoreOffsetReset.current) {
      skipRestoreOffsetReset.current = false;
      return;
    }
    restoreOffsetTarget.current = 0;
  }, [query]);

  useEffect(() => {
    if (busy || loadingMore) return;
    const target = restoreOffsetTarget.current;
    if (!target || opportunityOffset >= target || opportunityOffset >= opportunityTotal) {
      if (target && opportunityOffset >= target) restoreOffsetTarget.current = 0;
      return;
    }
    void loadPage({
      reset: false,
      query,
      offset: opportunityOffset,
      dealPage: dealSearchPage,
    });
  }, [busy, dealSearchPage, loadPage, loadingMore, opportunityOffset, opportunityTotal, query]);

  const groupedAll = useMemo(
    () => buildDocumentWorkspaceCardGroups(groups, filters, query, actor),
    [actor, filters, groups, query],
  );
  const readinessByKey = useMemo(() => {
    const map = new Map<string, DocumentWorkspaceCardReadiness>();
    for (const group of groupedAll) {
      const lodItems = getDocumentRequestState(group.opportunityId).lodItems ?? [];
      const records = listDocumentsForOpportunityRuntime(group.opportunityId, group.opportunityId);
      map.set(
        group.opportunity.key,
        deriveDocumentWorkspaceCardReadiness({
          opportunityId: group.opportunityId,
          dealId: null,
          lodItems,
          records,
        }),
      );
    }
    return map;
  }, [groupedAll]);
  const grouped = useMemo(
    () =>
      filters.chip === "pending_documents"
        ? filterGroupsWithPendingDocuments(groupedAll, readinessByKey)
        : groupedAll,
    [filters.chip, groupedAll, readinessByKey],
  );
  const hasMore = opportunityOffset < opportunityTotal;

  useEffect(() => {
    persist();
  }, [persist, grouped.length]);

  useEffect(() => {
    if (busy) return;
    if (compact) {
      const root = scrollRef.current;
      if (root && restoreScroll.current) {
        root.scrollTop = restoreScroll.current;
        restoreScroll.current = 0;
      }
    } else if (restoreScroll.current) {
      window.scrollTo(0, restoreScroll.current);
      restoreScroll.current = 0;
    }
    if (!didRestoreFocus.current && restoreFocusKey.current) {
      const root = compact ? scrollRef.current : document;
      const target = root?.querySelector<HTMLElement>(
        `[data-transaction-card-key="${restoreFocusKey.current}"] [data-open-opportunity], [data-transaction-card-key="${restoreFocusKey.current}"]`,
      );
      target?.focus();
      didRestoreFocus.current = true;
    }
  }, [busy, compact, grouped]);

  const openOpportunity = (card: DocumentWorkspaceOpportunityCard) => {
    restoreFocusKey.current = card.key;
    persist({ lastCardKey: card.key });
    onSelect(buildDocumentWorkspaceCardSelectPayload(card));
  };

  const openDeal = (card: DocumentWorkspaceDealCard) => {
    restoreFocusKey.current = card.key;
    persist({ lastCardKey: card.key });
    onSelect(buildDocumentWorkspaceCardSelectPayload(card));
  };

  const loadMore = () => {
    if (busy || loadingMore || !hasMore) return;
    void loadPage({
      reset: false,
      query,
      offset: opportunityOffset,
      dealPage: dealSearchPage,
    });
  };

  return (
    <div
      data-document-workspace-card-grid="012"
      data-default-sort={DOCUMENT_WORKSPACE_CARD_GRID_DEFAULT_SORT}
      className={cn("flex w-full min-w-0 flex-col gap-3", compact ? "max-h-[28rem]" : "")}
    >
      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={DOCUMENT_WORKSPACE_CARD_GRID_SEARCH_PLACEHOLDER}
          className="h-10 w-full pl-9"
          aria-label={DOCUMENT_WORKSPACE_CARD_GRID_SEARCH_PLACEHOLDER}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2" data-card-grid-filters="">
        {DOCUMENT_WORKSPACE_CARD_GRID_CHIPS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={filters.chip === item.id ? "default" : "outline"}
            className="h-8"
            aria-pressed={filters.chip === item.id}
            onClick={() => setFilters({ chip: item.id as DocumentWorkspaceCardGridChipId })}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {compact ? null : (
        <p className="text-[11px] text-muted-foreground">
          {busy
            ? "Loading authorised registries…"
            : "Newest Opportunities first. Open a borrower card or a nested lender Deal. Context never changes from names, mobile, or email."}
        </p>
      )}

      <div
        ref={scrollRef}
        data-card-grid-scroll=""
        onScroll={() => persist()}
        className={cn(
          "min-w-0",
          compact ? "min-h-0 max-h-64 flex-1 overflow-y-auto pr-1" : "w-full",
        )}
      >
        {busy && groups.length === 0 ? (
          <DocumentWorkspaceCardGridSkeleton compact={compact} />
        ) : grouped.length === 0 ? (
          <p data-card-grid-empty="" className="px-3 py-10 text-center text-sm text-muted-foreground">
            {error || "No authorised Opportunities match."}
          </p>
        ) : (
          <div
            data-card-grid-columns=""
            className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
          >
            {grouped.map((group) => (
              <DocumentWorkspaceTransactionCardView
                key={group.opportunityId}
                group={group}
                readiness={readinessByKey.get(group.opportunity.key) ?? { available: false }}
                onOpenOpportunity={openOpportunity}
                onOpenDeal={openDeal}
              />
            ))}
          </div>
        )}
        {loadingMore ? <div className="mt-3"><DocumentWorkspaceCardGridSkeleton compact /></div> : null}
        {busy || grouped.length === 0 ? null : (
          <div className="mt-4 flex flex-col items-center gap-2 pb-2">
            {hasMore ? (
              <Button
                type="button"
                variant="outline"
                data-card-grid-load-more=""
                className="h-9"
                disabled={loadingMore}
                onClick={loadMore}
              >
                {DOCUMENT_WORKSPACE_CARD_GRID_LOAD_MORE_LABEL}
              </Button>
            ) : (
              <p className="text-center text-[11px] text-muted-foreground">
                All authorised records in this filter are listed.
              </p>
            )}
          </div>
        )}
      </div>

      {compact ? null : (
        <p className="text-[10px] text-muted-foreground">
          Journey Documents remain at {ROUTES.DOCUMENT_CENTER}. This desk does not reopen Lead /
          Credit / LIFE. Default order is Newest Opportunities (Opportunity.createdAt DESC).
        </p>
      )}
    </div>
  );
}
