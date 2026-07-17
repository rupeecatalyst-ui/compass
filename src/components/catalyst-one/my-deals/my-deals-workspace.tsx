"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Calendar,
  Columns3,
  LayoutList,
  Search,
  Table2,
} from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { StatusPill } from "@/components/design-system/status-pill";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MY_DEALS_BUSINESS_TABS,
  MY_DEALS_FILTERS,
  MY_DEALS_KANBAN_COLUMNS,
  MY_DEALS_OFFICIAL_NAME,
  MY_DEALS_VIEWS,
  type MyDealsBusinessTabId,
  type MyDealsFilterId,
  type MyDealsViewId,
} from "@/constants/my-deals";
import { ROUTES } from "@/constants/routes";
import { LOAN_FILE_PRIORITY_STYLES } from "@/constants/loan-status";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import {
  filterMyDealRows,
  groupDealsByKanbanColumn,
  listMyDealRows,
  resolveCurrentRmName,
  type MyDealRow,
} from "@/lib/my-deals";
import { useEcmContactRegistryVersion } from "@/hooks/use-ecm-contact-registry-version";
import { cn } from "@/lib/utils";

function openOpportunityWorkspace(router: ReturnType<typeof useRouter>, row: MyDealRow) {
  const opportunityId = row.opportunityNumber;
  setActiveOpportunityContext({
    fileId: row.id,
    opportunityId,
    customerName: row.borrower,
    product: row.product,
    label: row.opportunityNumber,
  });
  router.push(
    buildJourneyHref(ROUTES.CREDIT_BENCH, {
      fileId: row.id,
      opportunityId,
    }),
  );
}

export function MyDealsWorkspace() {
  const router = useRouter();
  const { user } = useAuthContext();
  const registryVersion = useEcmContactRegistryVersion();
  const [businessTab, setBusinessTab] = useState<MyDealsBusinessTabId>("loans");
  const [view, setView] = useState<MyDealsViewId>("kanban");
  const [filterId, setFilterId] = useState<MyDealsFilterId>("my_deals");
  const [search, setSearch] = useState("");
  const [tick, setTick] = useState(0);

  const currentRm = resolveCurrentRmName(user);

  const allRows = useMemo(() => {
    void tick;
    void registryVersion;
    return listMyDealRows(loadLoanFiles());
  }, [tick, registryVersion]);

  const rows = useMemo(
    () =>
      filterMyDealRows(allRows, filterId, {
        currentRm,
        search,
      }),
    [allRows, filterId, currentRm, search],
  );

  const kanban = useMemo(() => groupDealsByKanbanColumn(rows), [rows]);

  const liveTab = MY_DEALS_BUSINESS_TABS.find((t) => t.id === businessTab);

  return (
    <div className="space-y-5">
      <PageHeader
        title={MY_DEALS_OFFICIAL_NAME}
        description="Your enterprise work queue — open a deal and continue where you left off."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setTick((t) => t + 1)}
          >
            Refresh
          </Button>
        }
      />

      {/* Business vertical tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-border/70 pb-2">
        {MY_DEALS_BUSINESS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setBusinessTab(tab.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              businessTab === tab.id
                ? "bg-teal-600 text-white"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              !tab.live && businessTab !== tab.id && "opacity-70",
            )}
          >
            {tab.label}
            {!tab.live ? (
              <span className="ml-1.5 text-[9px] uppercase tracking-wide opacity-80">Soon</span>
            ) : null}
          </button>
        ))}
      </div>

      {!liveTab?.live ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium text-foreground">{liveTab?.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This business vertical will appear here without redesigning My Deals.
          </p>
        </div>
      ) : (
        <>
          {/* Views + search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {MY_DEALS_VIEWS.map((v) => {
                const Icon =
                  v.id === "list"
                    ? LayoutList
                    : v.id === "kanban"
                      ? Columns3
                      : v.id === "table"
                        ? Table2
                        : Calendar;
                return (
                  <Button
                    key={v.id}
                    type="button"
                    size="sm"
                    variant={view === v.id ? "default" : "outline"}
                    className="h-8 gap-1.5"
                    disabled={!v.available}
                    onClick={() => v.available && setView(v.id)}
                    title={v.available ? v.label : `${v.label} — coming soon`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {v.label.replace(" View", "")}
                  </Button>
                );
              })}
            </div>
            <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 rounded-lg pl-9 text-sm"
                placeholder="Search customer, OPP#, loan#, company, mobile…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-1.5">
            {MY_DEALS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterId(f.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                  filterId === f.id
                    ? "border-teal-500/40 bg-teal-500/10 text-teal-900 dark:text-teal-100"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{rows.length}</span> deals
            {filterId === "my_deals" ? ` for ${currentRm}` : ""} · Double-click a row to open
            Opportunity Workspace
          </p>

          {view === "list" ? (
            <MyDealsListView rows={rows} onOpen={(row) => openOpportunityWorkspace(router, row)} />
          ) : view === "table" ? (
            <MyDealsTableView rows={rows} onOpen={(row) => openOpportunityWorkspace(router, row)} />
          ) : (
            <MyDealsKanbanView
              groups={kanban}
              onOpen={(row) => openOpportunityWorkspace(router, row)}
            />
          )}
        </>
      )}
    </div>
  );
}

function MyDealsListView({
  rows,
  onOpen,
}: {
  rows: MyDealRow[];
  onOpen: (row: MyDealRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 font-medium">Opportunity #</th>
              <th className="px-3 py-2.5 font-medium">Borrower</th>
              <th className="px-3 py-2.5 font-medium">Product</th>
              <th className="px-3 py-2.5 font-medium">Loan Amount</th>
              <th className="px-3 py-2.5 font-medium">Stage</th>
              <th className="px-3 py-2.5 font-medium">Sub Stage</th>
              <th className="px-3 py-2.5 font-medium">Assigned RM</th>
              <th className="px-3 py-2.5 font-medium">Priority</th>
              <th className="px-3 py-2.5 font-medium">Last Activity</th>
              <th className="px-3 py-2.5 font-medium">Next Follow-up</th>
              <th className="px-3 py-2.5 font-medium">Ageing</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-t border-border/70 transition-colors hover:bg-muted/30"
                onDoubleClick={() => onOpen(row)}
                title="Double-click to open Opportunity Workspace"
              >
                <td className="px-3 py-2.5 font-medium tabular-nums text-teal-800 dark:text-teal-200">
                  {row.opportunityNumber}
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-medium">{row.borrower}</div>
                  {row.customerMobile ? (
                    <div className="text-[10px] text-muted-foreground">{row.customerMobile}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{row.product}</td>
                <td className="px-3 py-2.5 tabular-nums">{row.loanAmountLabel}</td>
                <td className="px-3 py-2.5">{row.stageLabel}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{row.subStage}</td>
                <td className="px-3 py-2.5">{row.assignedRm}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-[10px] capitalize",
                      LOAN_FILE_PRIORITY_STYLES[row.priority]?.className,
                    )}
                  >
                    {row.priority}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{row.lastActivityLabel}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{row.nextFollowUp}</td>
                <td className="px-3 py-2.5 tabular-nums">{row.ageingDays}d</td>
                <td className="px-3 py-2.5">
                  <StatusPill
                    variant={
                      row.status === "on_track"
                        ? "success"
                        : row.status === "delayed" || row.status === "at_risk"
                          ? "warning"
                          : "muted"
                    }
                  >
                    {row.statusLabel}
                  </StatusPill>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No deals match this filter. Try My Team or clear search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Dense operational grid — same fields as List, tighter density for power users. */
function MyDealsTableView({
  rows,
  onOpen,
}: {
  rows: MyDealRow[];
  onOpen: (row: MyDealRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-[12px]">
          <thead className="sticky top-0 border-b border-border bg-muted/50 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-2 py-2 font-medium">OPP#</th>
              <th className="px-2 py-2 font-medium">Borrower</th>
              <th className="px-2 py-2 font-medium">Product</th>
              <th className="px-2 py-2 font-medium">Amount</th>
              <th className="px-2 py-2 font-medium">Stage</th>
              <th className="px-2 py-2 font-medium">RM</th>
              <th className="px-2 py-2 font-medium">Priority</th>
              <th className="px-2 py-2 font-medium">Age</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="px-2 py-2 font-medium">Next</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={cn(
                  "cursor-pointer border-t border-border/60 transition-colors hover:bg-teal-500/[0.04]",
                  i % 2 === 1 && "bg-muted/15",
                )}
                onDoubleClick={() => onOpen(row)}
                onClick={() => onOpen(row)}
                title="Open Opportunity Workspace"
              >
                <td className="px-2 py-1.5 font-semibold tabular-nums text-teal-800 dark:text-teal-200">
                  {row.opportunityNumber}
                </td>
                <td className="max-w-[160px] truncate px-2 py-1.5 font-medium">{row.borrower}</td>
                <td className="max-w-[120px] truncate px-2 py-1.5 text-muted-foreground">{row.product}</td>
                <td className="px-2 py-1.5 tabular-nums">{row.loanAmountLabel}</td>
                <td className="px-2 py-1.5">{row.stageLabel}</td>
                <td className="max-w-[100px] truncate px-2 py-1.5">{row.assignedRm}</td>
                <td className="px-2 py-1.5 capitalize">{row.priority}</td>
                <td className="px-2 py-1.5 tabular-nums">{row.ageingDays}d</td>
                <td className="px-2 py-1.5">{row.statusLabel}</td>
                <td className="max-w-[120px] truncate px-2 py-1.5 text-muted-foreground">
                  {row.nextFollowUp}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No deals match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MyDealsKanbanView({
  groups,
  onOpen,
}: {
  groups: Record<string, MyDealRow[]>;
  onOpen: (row: MyDealRow) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {MY_DEALS_KANBAN_COLUMNS.map((col) => {
        const items = groups[col.id] ?? [];
        return (
          <div
            key={col.id}
            className="flex w-[240px] shrink-0 flex-col rounded-xl border border-border/70 bg-muted/20"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: col.tone }}
                  aria-hidden
                />
                <p className="text-xs font-semibold tracking-tight">{col.label}</p>
              </div>
              <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] tabular-nums">
                {items.length}
              </span>
            </div>
            <div className="flex max-h-[min(70vh,560px)] flex-col gap-2 overflow-y-auto p-2">
              {items.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onDoubleClick={() => onOpen(row)}
                  onClick={() => onOpen(row)}
                  className="rounded-lg border border-border/70 bg-card p-2.5 text-left shadow-sm transition-colors hover:border-teal-500/30 hover:bg-teal-500/[0.03]"
                >
                  <p className="text-[10px] font-semibold tabular-nums text-teal-800 dark:text-teal-200">
                    {row.opportunityNumber}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium">{row.borrower}</p>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {row.product} · {row.loanAmountLabel}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span>{row.assignedRm}</span>
                    <span className="tabular-nums">{row.ageingDays}d</span>
                  </div>
                </button>
              ))}
              {items.length === 0 ? (
                <p className="px-1 py-6 text-center text-[11px] text-muted-foreground">
                  {col.stages.length === 0 ? "Future column" : "No deals"}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
