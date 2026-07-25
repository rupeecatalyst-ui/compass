"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { loadLoanFiles, saveLoanFiles } from "@/lib/loan-files-storage";
import { listDealRegistryRows } from "@/lib/my-deals/deal-registry";
import { loadMyDealsDealRegistryRows } from "@/lib/enterprise-deal/deal-registry-port";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { getRememberedDeal } from "@/lib/enterprise-deal/dual-write-store";
import { mapEnterpriseDealToDealRegistryRow } from "@/lib/enterprise-deal/map-deal-to-registry-row";
import { queueMyDealsShadowRead } from "@/lib/enterprise-deal/shadow-read";
import {
  buildAssignmentPatch,
  formatAssignedUsersLabel,
  writeAssignedUsersIntoExtension,
  type AssignedUserRef,
} from "@/lib/assigned-users";
import { resolveCurrentRmName } from "@/lib/my-deals";
import { readMyDealsReturnState, rememberMyDealsReturnState } from "@/lib/my-deals/view-state";
import { useEcmContactRegistryVersion } from "@/hooks/use-ecm-contact-registry-version";
import { subscribeLoanFilesUpdated } from "@/lib/loan-data-sync";
import { subscribeOpportunitiesUpdated } from "@/lib/enterprise-opportunity/opportunity-data-sync";
import type { DealRegistryFilters, DealRegistryRow } from "@/types/deal-registry";
import { WorkspaceExitNav } from "@/components/enterprise/navigation";
import { buildSimpleWorkspaceBreadcrumbs } from "@/constants/enterprise-exit-navigation";
import { cn } from "@/lib/utils";

/**
 * Certified open path: My Deals work queue → Opportunity Workspace (`/credit-bench`).
 * Strategic Workspace remains the next Continue hop from Opportunity Setup.
 */
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
    buildJourneyHref(ROUTES.CREDIT_BENCH, {
      fileId: row.id,
      opportunityId: row.opportunityNumber,
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

function removeLocalDealMirror(fileId: string) {
  const files = loadLoanFiles();
  const next = files.filter((f) => f.id !== fileId);
  if (next.length !== files.length) {
    saveLoanFiles(next);
  }
}

/**
 * CO-SPRINT-098 / CO-ARCH-002-W4 — Enterprise Deal Registry (My Deals landing).
 * CO-P0-001 — Prisma mode: Enterprise Deal Registry is operational SSOT (Port Runtime).
 * Soft Go-Live local LoanFile only when persistence=memory or flags explicitly OFF.
 * Shadow Read (optional): compare only — never replaces UI.
 */
export function MyDealsWorkspace() {
  const router = useRouter();
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
    const unsubLoan = subscribeLoanFilesUpdated(() => setTick((t) => t + 1));
    const unsubOpp = subscribeOpportunitiesUpdated(() => setTick((t) => t + 1));
    return () => {
      window.removeEventListener("storage", onStorage);
      unsubLoan();
      unsubOpp();
    };
  }, []);

  const currentRm = resolveCurrentRmName(user);

  const localRows = useMemo(() => {
    void tick;
    void registryVersion;
    return listDealRegistryRows(loadLoanFiles());
  }, [tick, registryVersion]);

  useEffect(() => {
    queueMyDealsShadowRead(loadLoanFiles());
  }, [tick, registryVersion]);

  useEffect(() => {
    let cancelled = false;
    setReadSource("loading");
    void loadMyDealsDealRegistryRows().then((result) => {
      if (cancelled) return;
      setPortRows(result.rows);
      setReadSource(result.source);
      setReadError(result.error ?? null);
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

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const handleDeleteDeal = useCallback(
    async (row: DealRegistryRow) => {
      try {
        const enterpriseId = await resolveEnterpriseDealId(row);
        if (enterpriseId) {
          await enterpriseDealApiClient.softDeleteDeal(enterpriseId);
          removeLocalDealMirror(row.id);
        } else if (readSource === "local" || readSource === "local_fallback") {
          removeLocalDealMirror(row.id);
        } else {
          throw new Error(
            "Missing: Enterprise Deal id. Reason: deal is not linked to Deal Registry. Action: open the deal once, then retry delete.",
          );
        }
        toast.success("Deal deleted successfully.");
        refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete Deal";
        toast.error(message);
        throw err;
      }
    },
    [readSource, refresh],
  );

  const handleAssignUsers = useCallback(
    async (row: DealRegistryRow, users: AssignedUserRef[]) => {
      const enterpriseId = await resolveEnterpriseDealId(row);
      if (!enterpriseId) {
        const message =
          "Missing: Enterprise Deal id. Reason: deal is not linked to Deal Registry. Action: open the deal once, then retry assignment.";
        toast.error(message);
        throw new Error(message);
      }
      if (typeof row.rowVersion !== "number") {
        const message =
          "Missing: Deal row version. Reason: registry row is incomplete. Action: refresh My Deals, then retry.";
        toast.error(message);
        throw new Error(message);
      }
      const patch = buildAssignmentPatch(users);
      const lendingExtension = writeAssignedUsersIntoExtension(
        row.lendingExtension,
        users,
      );
      try {
        const updated = await enterpriseDealApiClient.updateDeal(enterpriseId, {
          rowVersion: row.rowVersion,
          lendingExtension,
          primaryOwnerUserId: patch.primaryOwnerUserId,
          relationshipManagerUserId: patch.relationshipManagerUserId,
          relationshipManagerName: patch.relationshipManagerName,
        });
        const mapped = mapEnterpriseDealToDealRegistryRow(updated);
        setPortRows((prev) =>
          (prev ?? []).map((r) =>
            r.id === row.id || r.enterpriseDealId === enterpriseId
              ? {
                  ...mapped,
                  assignedUsers: users,
                  assignedRm: formatAssignedUsersLabel(users),
                }
              : r,
          ),
        );
        toast.success("Assigned users updated.");
        refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update assigned users";
        toast.error(message);
        throw err;
      }
    },
    [refresh],
  );

  return (
    <div
      className="flex h-[calc(100vh-3.5rem)] flex-col gap-0 overflow-hidden"
      data-sprint="CO-SPRINT-120"
      data-incident="CO-P0-001"
      data-deal-source={readSource}
    >
      <WorkspaceExitNav
        breadcrumbs={buildSimpleWorkspaceBreadcrumbs(MY_DEALS_OFFICIAL_NAME)}
        className="shrink-0"
      />
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden px-2.5 py-1.5 md:px-3 md:py-2">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <h1 className="truncate text-sm font-semibold tracking-tight md:text-[15px]">
              {MY_DEALS_OFFICIAL_NAME}
            </h1>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              · Enterprise Deal Registry
            </span>
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
          </div>
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {allRows.length} deals in pipeline
          </p>
        </header>

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

        {businessTab === "loans" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <DealRegistryTable
              rows={allRows}
              currentRm={currentRm}
              initialScope={initialScope}
              initialSearch={initialSearch}
              onFiltersChanged={handleFiltersChanged}
              onOpenDeal={(row) => openOpportunityWorkspace(router, row)}
              onEditDeal={(row) => openOpportunityWorkspace(router, row)}
              onDeleteDeal={handleDeleteDeal}
              onAssignUsers={handleAssignUsers}
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
    </div>
  );
}
