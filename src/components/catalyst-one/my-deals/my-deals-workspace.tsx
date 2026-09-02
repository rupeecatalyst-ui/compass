"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DealLenderJourneyBoard } from "@/components/catalyst-one/my-deals/deal-lender-journey-board";
import { MyDealsKanbanBoard } from "@/components/catalyst-one/my-deals/my-deals-kanban-board";
import { MyDealsRegistryToolbar } from "@/components/catalyst-one/my-deals/my-deals-registry-toolbar";
import { EnterpriseRegistryWorkspaceShell } from "@/components/catalyst-one/shared/enterprise-registry-workspace-shell";
import { useAuthContext } from "@/components/providers/auth-provider";
import {
  MY_DEALS_OFFICIAL_NAME,
  MY_DEALS_WORKSPACE_VIEWS,
  type MyDealsWorkspaceViewId,
} from "@/constants/my-deals";
import type { MyDealsKanbanFieldId } from "@/constants/my-deals-kanban";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import {
  overlayDealRowsWithEarLastActivity,
} from "@/lib/enterprise-activity-registry/latest-opportunity-activity";
import {
  listSessionEarEvents,
  subscribeEarUpdated,
} from "@/lib/enterprise-activity-registry/session-registry";
import {
  enrichMyDealsDealRegistryRows,
  loadMyDealsDealRegistryRows,
  resolveMyDealsDisplayRows,
} from "@/lib/enterprise-deal/deal-registry-port";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { getRememberedDeal } from "@/lib/enterprise-deal/dual-write-store";
import { bindSessionDeal } from "@/lib/enterprise-session";
import { enterpriseAccountingCaseClient } from "@/lib/enterprise-accounting-case/client";
import {
  buildDealWorkspaceHref,
  buildOpportunityWorkspaceEntryHref,
} from "@/lib/loan-journey/adr-018-routing";
import { resolveCurrentRmName } from "@/lib/my-deals";
import { filterDealRegistryRows } from "@/lib/my-deals/deal-registry";
import { filterLoanDealRegistryRows } from "@/lib/my-deals/loan-deals";
import {
  groupDealRowsByOpportunity,
  pickPreferredDealForOpportunity,
  type OpportunityRegistryGroup,
} from "@/lib/my-deals/group-opportunities";
import {
  readMyDealsKanbanPrefs,
  rememberMyDealsKanbanPrefs,
} from "@/lib/my-deals/kanban-prefs";
import {
  readMyDealsReturnState,
  rememberMyDealsReturnState,
  readMyDealsUiPrefs,
  rememberMyDealsUiPrefs,
} from "@/lib/my-deals/view-state";
import { useEcmContactRegistryVersion } from "@/hooks/use-ecm-contact-registry-version";
import { subscribeLoanFilesUpdated } from "@/lib/loan-data-sync";
import {
  EMPTY_DEAL_REGISTRY_FILTERS,
  type DealRegistryFilters,
  type DealRegistryRow,
} from "@/types/deal-registry";
import { buildSimpleWorkspaceBreadcrumbs } from "@/constants/enterprise-exit-navigation";
import { cn } from "@/lib/utils";

function groupFromDealRow(row: DealRegistryRow): OpportunityRegistryGroup {
  return groupDealRowsByOpportunity([row])[0]!;
}

function openOpportunityWorkspace(
  router: ReturnType<typeof useRouter>,
  group: OpportunityRegistryGroup,
) {
  const opportunityId = group.opportunityId?.trim();
  if (!opportunityId) {
    void openDealWorkspace(router, pickPreferredDealForOpportunity(group.deals), group);
    return;
  }
  const preferred = group.deals[0];
  setActiveOpportunityContext({
    fileId: preferred?.id,
    opportunityId,
    customerName: group.borrowerName,
    product: group.product,
    label: group.opportunityNumber,
  });
  router.push(
    buildOpportunityWorkspaceEntryHref({
      id: opportunityId,
      legacyLoanFileId: preferred?.id ?? null,
    }),
  );
}

async function openDealWorkspace(
  router: ReturnType<typeof useRouter>,
  row: DealRegistryRow,
  group: OpportunityRegistryGroup,
) {
  const dealId = (await resolveEnterpriseDealId(row)) || row.id;
  let opportunityId = group.opportunityId?.trim() || row.opportunityId?.trim() || undefined;
  try {
    const deal = await enterpriseDealApiClient.getDeal(dealId);
    bindSessionDeal(deal);
    opportunityId = deal.opportunityId?.trim() || opportunityId;
  } catch {
    bindSessionDeal(dealId);
  }
  setActiveOpportunityContext({
    fileId: row.id,
    opportunityId,
    customerName: group.borrowerName,
    product: group.product,
    label: group.opportunityNumber,
  });
  router.push(
    buildDealWorkspaceHref({
      dealId,
      fileId: row.id,
      opportunityId,
      tab: "lenders",
    }),
  );
}

async function resolveEnterpriseDealId(row: DealRegistryRow): Promise<string | null> {
  if (row.enterpriseDealId?.trim()) return row.enterpriseDealId.trim();
  const remembered = getRememberedDeal(row.id);
  if (remembered?.dealId) return remembered.dealId;
  try {
    const found = await enterpriseDealApiClient.searchByLegacyLoanFileId(row.id);
    return found?.id ?? null;
  } catch {
    return null;
  }
}

function overlayAccountingCases(
  rows: DealRegistryRow[],
  cases: Array<{ id: string; dealId: string; status?: unknown }>,
): DealRegistryRow[] {
  if (cases.length === 0) return rows;
  const byDeal = new Map<string, { id: string; status?: unknown }>();
  for (const item of cases) {
    if (item.dealId) byDeal.set(item.dealId, item);
  }
  return rows.map((row) => {
    const hit = byDeal.get(row.enterpriseDealId || row.id);
    if (!hit) return row;
    return {
      ...row,
      accountingCaseId: hit.id,
      accountingStatus: typeof hit.status === "string" ? hit.status : undefined,
    };
  });
}

/**
 * Loan Deal Registry — Deals list + end-to-end Deal Kanban.
 * Enterprise Deal Registry is the only SSOT.
 */
export function MyDealsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const registryVersion = useEcmContactRegistryVersion();
  const [tick, setTick] = useState(0);
  const [portRows, setPortRows] = useState<DealRegistryRow[] | null>(null);
  const [readSource, setReadSource] = useState<
    "local" | "enterprise_deal" | "local_fallback" | "loading"
  >("loading");
  const [readError, setReadError] = useState<string | null>(null);
  const [accountingCases, setAccountingCases] = useState<
    Array<{ id: string; dealId: string; status?: unknown }>
  >([]);

  const savedReturn = typeof window !== "undefined" ? readMyDealsReturnState() : null;
  const savedUi = useMemo(() => readMyDealsUiPrefs(), []);
  const kanbanPrefs = useMemo(
    () => readMyDealsKanbanPrefs(user?.id, user?.organizationId),
    [user?.id, user?.organizationId],
  );

  const initialScope: DealRegistryFilters["scope"] =
    savedReturn?.filterId === "my_deals" ? "my_deals" : "my_team";
  const filterParam = searchParams.get("filter")?.trim() || null;
  const initialGrossStage =
    filterParam === "disbursed" || filterParam === "won" ? "won" : "all";

  const [workspaceView, setWorkspaceView] = useState<MyDealsWorkspaceViewId>(
    kanbanPrefs.view,
  );
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>(
    kanbanPrefs.selectedStageIds,
  );
  const [visibleFieldIds, setVisibleFieldIds] = useState<MyDealsKanbanFieldId[]>(
    kanbanPrefs.visibleOptionalFieldIds,
  );
  const [boardScrollLeft, setBoardScrollLeft] = useState(kanbanPrefs.boardScrollLeft);
  const [columnScrollTops, setColumnScrollTops] = useState<Record<string, number>>(
    kanbanPrefs.columnScrollTops,
  );
  const [filtersVisible, setFiltersVisible] = useState(savedUi.filtersVisible);
  const [filters, setFilters] = useState<DealRegistryFilters>(() => ({
    ...EMPTY_DEAL_REGISTRY_FILTERS,
    scope: initialScope,
    search: savedReturn?.search ?? "",
    grossStage: initialGrossStage,
    activity: savedUi.activityFilter ?? (kanbanPrefs.view === "kanban" ? "all" : "active"),
  }));

  useEffect(() => {
    rememberMyDealsReturnState({
      view: workspaceView === "kanban" ? "kanban" : "table",
      filterId: filters.scope === "my_deals" ? "my_deals" : "my_team",
      search: filters.search,
      businessTab: "loans",
    });
  }, [workspaceView, filters]);

  useEffect(() => {
    const onStorage = () => setTick((t) => t + 1);
    window.addEventListener("storage", onStorage);
    const unsubLoan = subscribeLoanFilesUpdated(() => setTick((t) => t + 1));
    const unsubEar = subscribeEarUpdated(() => {
      setPortRows((previous) => {
        if (!previous?.length) return previous;
        return overlayDealRowsWithEarLastActivity(previous, listSessionEarEvents()).sort(
          (a, b) => b.lastActivity.localeCompare(a.lastActivity),
        );
      });
    });
    return () => {
      window.removeEventListener("storage", onStorage);
      unsubLoan();
      unsubEar();
    };
  }, []);

  const currentRm = resolveCurrentRmName(user);

  useEffect(() => {
    let cancelled = false;
    setReadSource((prev) => (prev === "enterprise_deal" ? prev : "loading"));
    void loadMyDealsDealRegistryRows().then((result) => {
      if (cancelled) return;
      setPortRows((previous) =>
        resolveMyDealsDisplayRows({
          previous,
          incoming: result.rows,
          source: result.source,
          localRows: [],
        }),
      );
      if (result.source === "enterprise_deal" && result.rows.length === 0) {
        setReadSource((prev) => (prev === "enterprise_deal" ? prev : result.source));
      } else {
        setReadSource(result.source);
      }
      setReadError(result.error ?? null);

      if (result.source === "enterprise_deal" && result.projection === "summary") {
        void enrichMyDealsDealRegistryRows().then((enriched) => {
          if (cancelled || enriched.source !== "enterprise_deal") return;
          if (enriched.rows.length === 0) return;
          setPortRows(enriched.rows);
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tick, registryVersion]);

  useEffect(() => {
    let cancelled = false;
    void enterpriseAccountingCaseClient
      .list({ pageSize: 200 })
      .then((result) => {
        if (cancelled) return;
        setAccountingCases(result.items ?? []);
      })
      .catch(() => {
        /* Accounting overlay is optional; Deal Registry remains SSOT. */
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const loanRows = useMemo(
    () => overlayAccountingCases(filterLoanDealRegistryRows(portRows ?? []), accountingCases),
    [portRows, accountingCases],
  );

  const filteredRows = useMemo(
    () =>
      filterDealRegistryRows(loanRows, filters, currentRm, {
        actorUserId: user?.id,
        role: user?.role,
        downlineUserIds: user?.id ? [user.id] : [],
      }),
    [loanRows, filters, currentRm, user?.id, user?.role],
  );

  const opportunityCount = useMemo(
    () => groupDealRowsByOpportunity(filteredRows).length,
    [filteredRows],
  );

  const patchFilters = useCallback((patch: Partial<DealRegistryFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      if (patch.activity) {
        rememberMyDealsUiPrefs({ activityFilter: patch.activity });
      }
      return next;
    });
  }, []);

  const persistKanban = useCallback(
    (patch: Parameters<typeof rememberMyDealsKanbanPrefs>[1]) => {
      const next = rememberMyDealsKanbanPrefs(user?.id, patch, user?.organizationId);
      if (patch.view) setWorkspaceView(next.view);
      if (patch.selectedStageIds) setSelectedStageIds(next.selectedStageIds);
      if (patch.visibleOptionalFieldIds) setVisibleFieldIds(next.visibleOptionalFieldIds);
      if (patch.boardScrollLeft != null) setBoardScrollLeft(next.boardScrollLeft);
      if (patch.columnScrollTops) setColumnScrollTops(next.columnScrollTops);
    },
    [user?.id, user?.organizationId],
  );

  const sourceLabel =
    readSource === "enterprise_deal"
      ? "SSOT: Enterprise DB"
      : readSource === "local_fallback"
        ? "Fallback: local (API error)"
        : readSource === "local"
          ? "SSOT: local browser"
          : "Loading…";

  return (
    <EnterpriseRegistryWorkspaceShell
      title={MY_DEALS_OFFICIAL_NAME}
      subtitle="Loan Deal Registry · Enterprise Deal Registry"
      count={loanRows.length}
      countNoun="Loan Deals"
      breadcrumbs={buildSimpleWorkspaceBreadcrumbs(MY_DEALS_OFFICIAL_NAME)}
      data-sprint="CO-C1-MY-DEALS-KANBAN-001"
      data-surface="loan-deal-registry"
      statusSlot={
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
            readSource === "enterprise_deal"
              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
              : readSource === "local_fallback"
                ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                : "bg-muted text-muted-foreground",
          )}
          title={readError ?? undefined}
        >
          {sourceLabel}
        </span>
      }
      banner={
        readError && readSource === "local_fallback" ? (
          <p className="shrink-0 text-[11px] text-amber-800 dark:text-amber-200" role="status">
            Enterprise Deal API unavailable — showing local cache. {readError}
          </p>
        ) : null
      }
      toolbar={
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1 px-2 pt-1.5">
            {MY_DEALS_WORKSPACE_VIEWS.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => {
                  persistKanban({ view: view.id });
                  if (view.id === "kanban" && filters.activity === "active") {
                    patchFilters({ activity: "all" });
                  }
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                  workspaceView === view.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {view.label}
              </button>
            ))}
          </div>
          <MyDealsRegistryToolbar
            allRows={loanRows}
            filteredCount={filteredRows.length}
            opportunityCount={opportunityCount}
            filters={filters}
            onPatchFilters={patchFilters}
            onResetFilters={() => {
              rememberMyDealsUiPrefs({ activityFilter: "active" });
              setFilters({
                ...EMPTY_DEAL_REGISTRY_FILTERS,
                scope: initialScope,
                activity: workspaceView === "kanban" ? "all" : "active",
              });
            }}
            filtersVisible={filtersVisible}
            onToggleFiltersVisible={setFiltersVisible}
            showStageSelect={workspaceView === "deals"}
          />
        </div>
      }
    >
      {workspaceView === "kanban" ? (
        <MyDealsKanbanBoard
          rows={filteredRows}
          selectedStageIds={selectedStageIds}
          visibleFieldIds={visibleFieldIds}
          role={user?.role}
          boardScrollLeft={boardScrollLeft}
          columnScrollTops={columnScrollTops}
          onStageIdsChange={(next) => persistKanban({ selectedStageIds: next })}
          onFieldsApply={(next) => persistKanban({ visibleOptionalFieldIds: next })}
          onScrollPersist={(patch) => persistKanban(patch)}
          onOpenDeal={(row) => void openDealWorkspace(router, row, groupFromDealRow(row))}
          onOpenHref={(href, row) => {
            if (href.startsWith("/accounting")) {
              router.push(href);
              return;
            }
            void openDealWorkspace(router, row, groupFromDealRow(row));
          }}
        />
      ) : (
        <DealLenderJourneyBoard
          rows={filteredRows}
          onOpenOpportunity={(group) => openOpportunityWorkspace(router, group)}
          onOpenDeal={(row, group) => void openDealWorkspace(router, row, group)}
        />
      )}
    </EnterpriseRegistryWorkspaceShell>
  );
}
