"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DealLenderJourneyBoard } from "@/components/catalyst-one/my-deals/deal-lender-journey-board";
import { EnterpriseRegistryWorkspaceShell } from "@/components/catalyst-one/shared/enterprise-registry-workspace-shell";
import { useAuthContext } from "@/components/providers/auth-provider";
import {
  MY_DEALS_BUSINESS_TABS,
  MY_DEALS_OFFICIAL_NAME,
  type MyDealsBusinessTabId,
} from "@/constants/my-deals";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import {
  enrichMyDealsDealRegistryRows,
  loadMyDealsDealRegistryRows,
  resolveMyDealsDisplayRows,
} from "@/lib/enterprise-deal/deal-registry-port";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { getRememberedDeal } from "@/lib/enterprise-deal/dual-write-store";
import { bindSessionDeal } from "@/lib/enterprise-session";
import {
  buildDealWorkspaceHref,
  buildOpportunityWorkspaceEntryHref,
} from "@/lib/loan-journey/adr-018-routing";
import { resolveCurrentRmName } from "@/lib/my-deals";
import {
  pickPreferredDealForOpportunity,
  type OpportunityRegistryGroup,
} from "@/lib/my-deals/group-opportunities";
import { readMyDealsReturnState, rememberMyDealsReturnState } from "@/lib/my-deals/view-state";
import { useEcmContactRegistryVersion } from "@/hooks/use-ecm-contact-registry-version";
import { subscribeLoanFilesUpdated } from "@/lib/loan-data-sync";
import type { DealRegistryFilters, DealRegistryRow } from "@/types/deal-registry";
import { buildSimpleWorkspaceBreadcrumbs } from "@/constants/enterprise-exit-navigation";
import { cn } from "@/lib/utils";

/**
 * CO-C1-DEALS-JOURNEY-001 — Customer / Opportunity header → Opportunity Workspace.
 */
function openOpportunityWorkspace(
  router: ReturnType<typeof useRouter>,
  group: OpportunityRegistryGroup,
) {
  const opportunityId = group.opportunityId?.trim();
  if (!opportunityId) {
    // No Opportunity id — fall back to preferred Deal Workspace (legacy rows).
    void openDealWorkspace(
      router,
      pickPreferredDealForOpportunity(group.deals),
      group,
    );
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

/** Open exact lender Deal Workspace. */
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

/**
 * CO-SPRINT-098 / CO-ARCH-002-W4 / CO-UX-003 — Enterprise Deal Registry.
 * CO-ARCH-005 — Enterprise Deal Registry only (no Soft Go-Live LoanFile list).
 * CO-C1-DEALS-JOURNEY-001 — Lender Journey board replaces tabular grouped registry.
 */
export function MyDealsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const registryVersion = useEcmContactRegistryVersion();
  const [businessTab, setBusinessTab] = useState<MyDealsBusinessTabId>("loans");
  const [tick, setTick] = useState(0);
  const [registryFilters, setRegistryFilters] = useState<DealRegistryFilters | null>(null);
  const [portRows, setPortRows] = useState<DealRegistryRow[] | null>(null);
  const [readSource, setReadSource] = useState<
    "local" | "enterprise_deal" | "local_fallback" | "loading"
  >("loading");
  const [readError, setReadError] = useState<string | null>(null);

  const saved = typeof window !== "undefined" ? readMyDealsReturnState() : null;
  const initialScope: DealRegistryFilters["scope"] =
    saved?.filterId === "my_deals" ? "my_deals" : "my_team";
  const initialSearch = saved?.search ?? "";
  // CO-UX-002 — Loan Journey Disbursement → Deal Registry with disbursed stage seed.
  const filterParam = searchParams.get("filter")?.trim() || null;
  const initialGrossStage =
    filterParam === "disbursed" || filterParam === "won" ? "won" : "all";

  useEffect(() => {
    const filterId =
      registryFilters?.scope === "my_deals"
        ? "my_deals"
        : registryFilters?.scope === "all"
          ? "my_team"
          : "my_team";
    rememberMyDealsReturnState({
      view: "table",
      filterId,
      search: registryFilters?.search ?? initialSearch,
      businessTab,
    });
  }, [businessTab, registryFilters, initialSearch]);

  useEffect(() => {
    const onStorage = () => setTick((t) => t + 1);
    window.addEventListener("storage", onStorage);
    // CO-ARCH-003 — Deal list refreshes on Deal/LoanFile notify only (not Opportunity storm).
    const unsubLoan = subscribeLoanFilesUpdated(() => setTick((t) => t + 1));
    return () => {
      window.removeEventListener("storage", onStorage);
      unsubLoan();
    };
  }, []);

  const currentRm = resolveCurrentRmName(user);

  const localRows = useMemo((): DealRegistryRow[] => {
    void tick;
    void registryVersion;
    return [];
  }, [tick, registryVersion]);

  useEffect(() => {
    let cancelled = false;
    const generation = tick;
    setReadSource((prev) => (prev === "enterprise_deal" ? prev : "loading"));
    // CO-PERF-002 Phase 1 — summary paint first.
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
      void generation;

      // Phase 2 — progressive enrich (lenders / history / chips fields) without blocking paint.
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

  const allRows = portRows ?? localRows;
  const sourceLabel =
    readSource === "enterprise_deal"
      ? "SSOT: Enterprise DB"
      : readSource === "local_fallback"
        ? "Fallback: local (API error)"
        : readSource === "local"
          ? "SSOT: local browser"
          : "Loading…";

  const handleFiltersChanged = useCallback((filters: DealRegistryFilters) => {
    setRegistryFilters(filters);
  }, []);

  return (
    <EnterpriseRegistryWorkspaceShell
      title={MY_DEALS_OFFICIAL_NAME}
      subtitle="Lender Journey · Enterprise Deal Registry"
      count={allRows.length}
      countNoun="Deals"
      breadcrumbs={buildSimpleWorkspaceBreadcrumbs(MY_DEALS_OFFICIAL_NAME)}
      data-sprint="CO-C1-DEALS-JOURNEY-001"
      data-surface="deal-lender-journey"
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
        <>
          {readError && readSource === "local_fallback" ? (
            <p className="shrink-0 text-[11px] text-amber-800 dark:text-amber-200" role="status">
              Enterprise Deal API unavailable — showing local cache. {readError}
            </p>
          ) : null}
          <div className="flex shrink-0 flex-wrap gap-0.5 border-b border-border pb-1">
            {MY_DEALS_BUSINESS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setBusinessTab(tab.id)}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                  businessTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  !tab.live && "opacity-70",
                )}
              >
                {tab.label}
                {!tab.live ? (
                  <span className="ml-1 text-[9px] uppercase tracking-wide opacity-80">Soon</span>
                ) : null}
              </button>
            ))}
          </div>
        </>
      }
    >
      {businessTab === "loans" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DealLenderJourneyBoard
            rows={allRows}
            currentRm={currentRm}
            initialScope={initialScope}
            initialSearch={initialSearch}
            initialGrossStage={initialGrossStage}
            onFiltersChanged={handleFiltersChanged}
            onOpenOpportunity={(group) => openOpportunityWorkspace(router, group)}
            onOpenDeal={(row, group) => void openDealWorkspace(router, row, group)}
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <div>
            <p className="text-sm font-medium">
              {MY_DEALS_BUSINESS_TABS.find((t) => t.id === businessTab)?.label} registry
            </p>
            <p className="mt-1 max-w-sm text-[12px] text-muted-foreground">
              This business vertical will use the same Enterprise Deal Registry pattern when
              enabled. Loans is live today.
            </p>
          </div>
        </div>
      )}
    </EnterpriseRegistryWorkspaceShell>
  );
}
