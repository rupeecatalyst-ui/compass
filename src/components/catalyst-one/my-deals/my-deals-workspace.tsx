"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Briefcase } from "lucide-react";
import { DealRegistryTable } from "@/components/catalyst-one/my-deals/deal-registry-table";
import { useAuthContext } from "@/components/providers/auth-provider";
import {
  MY_DEALS_BUSINESS_TABS,
  MY_DEALS_OFFICIAL_NAME,
  type MyDealsBusinessTabId,
} from "@/constants/my-deals";
import { ROUTES } from "@/constants/routes";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import { listDealRegistryRows } from "@/lib/my-deals/deal-registry";
import { resolveCurrentRmName } from "@/lib/my-deals";
import { readMyDealsReturnState, rememberMyDealsReturnState } from "@/lib/my-deals/view-state";
import { useEcmContactRegistryVersion } from "@/hooks/use-ecm-contact-registry-version";
import type { DealRegistryFilters, DealRegistryRow } from "@/types/deal-registry";
import { cn } from "@/lib/utils";

/** CO-SPRINT-098 — Row opens Opportunity Workspace (existing Strategic Workspace). */
function openOpportunityWorkspace(
  router: ReturnType<typeof useRouter>,
  row: DealRegistryRow,
) {
  setActiveOpportunityContext({
    fileId: row.id,
    opportunityId: row.opportunityNumber,
    customerName: row.borrowerName,
    product: row.product,
    label: row.opportunityNumber,
  });
  router.push(
    buildJourneyHref(ROUTES.OPPORTUNITY_WORKSPACE, {
      fileId: row.id,
      opportunityId: row.opportunityNumber,
    }),
  );
}

/**
 * CO-SPRINT-098 — Enterprise Deal Registry (My Deals landing).
 * Compact header + business verticals + dense enterprise table.
 */
export function MyDealsWorkspace() {
  const router = useRouter();
  const { user } = useAuthContext();
  const registryVersion = useEcmContactRegistryVersion();
  const [businessTab, setBusinessTab] = useState<MyDealsBusinessTabId>("loans");
  const [tick, setTick] = useState(0);
  const [registryFilters, setRegistryFilters] = useState<DealRegistryFilters | null>(null);

  const saved = typeof window !== "undefined" ? readMyDealsReturnState() : null;
  const initialScope: DealRegistryFilters["scope"] =
    saved?.filterId === "my_deals" ? "my_deals" : "my_team";
  const initialSearch = saved?.search ?? "";

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
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const currentRm = resolveCurrentRmName(user);

  const allRows = useMemo(() => {
    void tick;
    void registryVersion;
    return listDealRegistryRows(loadLoanFiles());
  }, [tick, registryVersion]);

  const handleFiltersChanged = useCallback((filters: DealRegistryFilters) => {
    setRegistryFilters(filters);
  }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-2 overflow-hidden p-3 md:p-4">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight md:text-lg">
              {MY_DEALS_OFFICIAL_NAME}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Enterprise Deal Registry · locate, compare, and open loan opportunities
            </p>
          </div>
        </div>
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {allRows.length} deals in pipeline
        </p>
      </header>

      <div className="flex shrink-0 flex-wrap gap-1 border-b border-border pb-1.5">
        {MY_DEALS_BUSINESS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setBusinessTab(tab.id)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
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

      {businessTab === "loans" ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <DealRegistryTable
            rows={allRows}
            currentRm={currentRm}
            initialScope={initialScope}
            initialSearch={initialSearch}
            onFiltersChanged={handleFiltersChanged}
            onOpenDeal={(row) => openOpportunityWorkspace(router, row)}
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
    </div>
  );
}
