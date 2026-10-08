"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaseWorkbenchActionPanel } from "@/components/catalyst-one/case-workbench/case-workbench-action-panel";
import { DeskMultiSelect } from "@/components/catalyst-one/case-workbench/desk-multi-select";
import { useAuthContext } from "@/components/providers/auth-provider";
import { searchAssignableUsers } from "@/lib/assigned-users";
import {
  LENDER_CASE_STAGE_COLORS,
  LENDER_CASE_STAGE_LABELS,
} from "@/constants/lender-pipeline";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { notifyLoanFilesUpdated } from "@/lib/loan-data-sync";
import { resolveLenderBranding } from "@/lib/enterprise-lender-registry/branding";
import {
  cycleDeskArea,
  dealTableRows,
  DESK_DEAL_STAGE_OPTIONS,
  DESK_OPPORTUNITY_STAGE_OPTIONS,
  DESK_PRODUCT_OPTIONS,
  DESK_UNASSIGNED_OWNER,
  deskFilterCatalog,
  deskFlex,
  DESK_VISIBLE_PAGE,
  filterDesk,
  forgetDeskDefaultView,
  groupDealsByOpportunity,
  nextActionPanel,
  permittedDeskStageTargets,
  projectDeskDeals,
  readDeskDefaultView,
  rememberDeskDefaultView,
  sanitizeDeskFilters,
  systemDefaultDeskFilters,
  type DeskActionPanel,
  type DeskArea,
  type DeskDeal,
  type DeskDealInput,
  type DeskFilters,
  type DeskOpportunity,
  type DeskSelection,
} from "@/lib/case-workbench/operational-desk";
import { cn } from "@/lib/utils";

function formatWhen(iso: string): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "Not Specified";
  return new Date(time).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function LenderMark({ name }: { name: string }) {
  const brand = resolveLenderBranding({ displayName: name });
  const [failed, setFailed] = useState(false);
  const initials = brand.brandName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  if (!brand.logoUrl || failed) {
    return (
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-secondary text-[9px] font-semibold text-foreground">
        {initials || "—"}
      </span>
    );
  }
  return (
    // Registry logos are arbitrary stored URLs. next/image would require a remote allow-list.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brand.logoUrl}
      alt=""
      className="h-5 w-5 shrink-0 rounded bg-white object-contain"
      onError={() => setFailed(true)}
    />
  );
}

export function OperationalDesk({
  opportunities,
  deals,
  loading,
  error,
}: {
  opportunities: DeskOpportunity[];
  deals: DeskDealInput[];
  loading: boolean;
  error: string | null;
}) {
  const { user } = useAuthContext();
  const [ownerOptions, setOwnerOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [ownersLoaded, setOwnersLoaded] = useState(false);
  const hydrated = useRef(false);
  const catalog = useMemo(
    () => deskFilterCatalog([...ownerOptions.map((owner) => owner.id), user?.id ?? ""]),
    [ownerOptions, user?.id],
  );
  const [filters, setFilters] = useState<DeskFilters>(() =>
    systemDefaultDeskFilters(deskFilterCatalog([])),
  );
  const [area, setArea] = useState<DeskArea>("split");
  const [mobilePane, setMobilePane] = useState<"opportunities" | "deals">("opportunities");
  const [selection, setSelection] = useState<DeskSelection | null>(null);
  const [panel, setPanel] = useState<DeskActionPanel>("closed");
  const [dirty, setDirty] = useState(false);
  const [page, setPage] = useState(0);
  const [stageError, setStageError] = useState<string | null>(null);
  const [stageMenuId, setStageMenuId] = useState<string | null>(null);
  const [stageBusy, setStageBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void searchAssignableUsers("", { authorised: true })
      .then((users) => {
        if (cancelled) return;
        setOwnerOptions(users.map((person) => ({ id: person.id, label: person.fullName })));
      })
      .catch(() => {
        if (!cancelled) setOwnerOptions([]);
      })
      .finally(() => {
        if (!cancelled) setOwnersLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.id || !ownersLoaded || hydrated.current) return;
    hydrated.current = true;
    setFilters(sanitizeDeskFilters(readDeskDefaultView(user.id), catalog));
  }, [user?.id, ownersLoaded, catalog]);

  const groups = useMemo(() => groupDealsByOpportunity(projectDeskDeals(deals)), [deals]);
  const visible = useMemo(
    () => filterDesk(opportunities, groups, filters, catalog),
    [opportunities, groups, filters, catalog],
  );
  const dealPages = useMemo(() => {
    const pages: typeof visible.groups[] = [];
    let bucket: typeof visible.groups = [];
    let count = 0;
    for (const group of visible.groups) {
      const size = Math.max(1, group.deals.length);
      if (bucket.length > 0 && count + size > DESK_VISIBLE_PAGE) {
        pages.push(bucket);
        bucket = [];
        count = 0;
      }
      bucket.push(group);
      count += size;
    }
    if (bucket.length > 0) pages.push(bucket);
    return pages.length > 0 ? pages : [[]];
  }, [visible]);
  const pageCount = dealPages.length;
  const safePage = Math.min(page, pageCount - 1);
  const pagedDeals = dealTableRows(dealPages[safePage] ?? []);
  const oppPageCount = Math.max(1, Math.ceil(visible.opportunities.length / DESK_VISIBLE_PAGE));
  const pagedOpps = visible.opportunities.slice(
    Math.min(page, oppPageCount - 1) * DESK_VISIBLE_PAGE,
    (Math.min(page, oppPageCount - 1) + 1) * DESK_VISIBLE_PAGE,
  );
  const dealRows = dealTableRows(visible.groups);
  const flex = deskFlex(area, panel);
  const selectedDeal =
    selection?.kind === "deal"
      ? groups.flatMap((group) => group.deals).find((deal) => deal.id === selection.id) ?? null
      : null;
  const selectedOpportunity =
    selection?.kind === "opportunity"
      ? opportunities.find((row) => row.id === selection.id) ?? null
      : selectedDeal?.opportunityId
        ? opportunities.find((row) => row.id === selectedDeal.opportunityId) ?? null
        : null;

  function keepOrDiscard(next: () => void) {
    if (dirty && !window.confirm("Discard unsaved activity on this transaction?")) return;
    setDirty(false);
    next();
  }

  function selectRow(next: DeskSelection) {
    if (selection && (selection.kind !== next.kind || selection.id !== next.id)) {
      keepOrDiscard(() => {
        setSelection(next);
        setPanel((current) => nextActionPanel(current, "open"));
      });
      return;
    }
    setSelection(next);
    setPanel((current) => nextActionPanel(current, "open"));
  }

  async function changeStage(deal: DeskDeal, toGrossStage: string) {
    setStageMenuId(null);
    if (deal.rowVersion == null) {
      setStageError("This Deal has no current version. Refresh Case Workbench before changing stage.");
      return;
    }
    setStageBusy(true);
    setStageError(null);
    try {
      await enterpriseDealApiClient.transitionDeal(deal.id, {
        rowVersion: deal.rowVersion,
        toGrossStage,
        reason: "case_workbench_stage",
      });
      notifyLoanFilesUpdated();
    } catch (err) {
      setStageError(err instanceof Error ? err.message : "Stage change was rejected.");
    } finally {
      setStageBusy(false);
    }
  }

  const showOpportunities = area !== "deals";
  const showDeals = area !== "opportunities";

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Case Workbench">
      <div className="flex flex-wrap items-end gap-2 border-b border-border px-3 py-2">
        <div className="mr-2">
          <h1 className="text-sm font-semibold text-foreground">Case Workbench</h1>
        </div>
        <label className="min-w-[10rem] flex-1 text-[11px] text-muted-foreground">
          Search
          <input
            value={filters.query}
            onChange={(event) => {
              setPage(0);
              setFilters((prev) => ({ ...prev, query: event.target.value }));
            }}
            placeholder="Customer, product, lender, or stage"
            className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[12px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <DeskMultiSelect
          label="Opportunity Stage"
          options={DESK_OPPORTUNITY_STAGE_OPTIONS.map((option) => ({ id: option.value, label: option.label }))}
          selected={filters.opportunityStages}
          onChange={(opportunityStages) => {
            setPage(0);
            setFilters((prev) => ({ ...prev, opportunityStages }));
          }}
        />
        <DeskMultiSelect
          label="Deal Work Stage"
          options={DESK_DEAL_STAGE_OPTIONS}
          selected={filters.dealStages}
          onChange={(dealStages) => {
            setPage(0);
            setFilters((prev) => ({ ...prev, dealStages }));
          }}
        />
        <DeskMultiSelect
          label="Product"
          options={DESK_PRODUCT_OPTIONS}
          selected={filters.products}
          onChange={(products) => {
            setPage(0);
            setFilters((prev) => ({ ...prev, products }));
          }}
        />
        <DeskMultiSelect
          label="Transaction Owner"
          options={[
            ...ownerOptions,
            ...(user?.id && !ownerOptions.some((owner) => owner.id === user.id)
              ? [{ id: user.id, label: "Me" }]
              : []),
            { id: DESK_UNASSIGNED_OWNER, label: "Unassigned" },
          ]}
          selected={filters.owners}
          onChange={(owners) => {
            setPage(0);
            setFilters((prev) => ({ ...prev, owners }));
          }}
          extraAction={
            user?.id
              ? {
                  label: "My Transactions",
                  active: filters.owners.length === 1 && filters.owners[0] === user.id,
                  onToggle: () => {
                    setPage(0);
                    setFilters((prev) => ({
                      ...prev,
                      owners:
                        prev.owners.length === 1 && prev.owners[0] === user.id
                          ? catalog.owners
                          : [user.id],
                    }));
                  },
                }
              : undefined
          }
        />
        <button
          type="button"
          onClick={() => {
            if (user?.id) rememberDeskDefaultView(user.id, filters);
          }}
          className="h-8 rounded-md border border-input bg-secondary px-2 text-[11px] font-semibold text-secondary-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Save as Default View
        </button>
        <button
          type="button"
          onClick={() => {
            if (user?.id) forgetDeskDefaultView(user.id);
            setPage(0);
            setFilters(systemDefaultDeskFilters(catalog));
          }}
          className="h-8 rounded-md px-2 text-[11px] font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Reset to System Default
        </button>
        <div className="flex gap-1 md:hidden">
          <button type="button" onClick={() => setMobilePane("opportunities")} className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-foreground">
            Opportunities
          </button>
          <button type="button" onClick={() => setMobilePane("deals")} className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-foreground">
            Deals
          </button>
        </div>
      </div>
      {error || stageError ? (
        <p className="px-3 py-1 text-[11px] text-destructive">{stageError || error}</p>
      ) : null}
      <div className="flex min-h-0 flex-1">
        {showOpportunities ? (
          <div
            className={cn(
              "min-h-0 min-w-0 flex-col border-r border-border",
              mobilePane === "opportunities" ? "flex" : "hidden md:flex",
            )}
            style={{ flex: flex.opportunities }}
          >
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-3 py-1.5">
              <h2 className="text-[12px] font-semibold text-foreground">Opportunities · {visible.opportunities.length}</h2>
              <button
                type="button"
                onClick={() => setArea((current) => cycleDeskArea(current, "opportunities"))}
                className="rounded-md border border-input px-2 py-0.5 text-[11px] font-semibold text-foreground hover:bg-secondary"
              >
                {area === "opportunities" ? "Split view" : "Expand"}
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead className="sticky top-0 z-10 bg-muted text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 font-semibold">Customer</th>
                    <th className="px-2 py-1.5 font-semibold">Product</th>
                    <th className="px-2 py-1.5 font-semibold">Amount</th>
                    <th className="px-2 py-1.5 font-semibold">Stage</th>
                    <th className="px-2 py-1.5 font-semibold">Activity</th>
                    <th className="px-2 py-1.5 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && pagedOpps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-2 py-3 text-foreground0">Loading opportunities…</td>
                    </tr>
                  ) : null}
                  {pagedOpps.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-t border-border",
                        selection?.kind === "opportunity" && selection.id === row.id && "bg-accent/50",
                      )}
                    >
                      <td className="px-2 py-1.5 font-semibold text-foreground">{row.customerName}</td>
                      <td className="px-2 py-1.5 text-foreground">{row.product}</td>
                      <td className="px-2 py-1.5 text-foreground">{row.amountLabel}</td>
                      <td className="px-2 py-1.5 text-foreground">{row.stageLabel}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{formatWhen(row.updatedAt)}</td>
                      <td className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => selectRow({ kind: "opportunity", id: row.id })}
                          className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-accent hover:text-accent-foreground"
                        >
                          Action
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        {showDeals ? (
          <div
            className={cn(
              "min-h-0 min-w-0 flex-col",
              mobilePane === "deals" ? "flex" : "hidden md:flex",
            )}
            style={{ flex: flex.deals }}
          >
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-3 py-1.5">
              <h2 className="text-[12px] font-semibold text-foreground">Active Deals · {dealRows.length}</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage === 0}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  className="rounded-md border border-input px-2 py-0.5 text-[11px] font-semibold text-foreground disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-[11px] text-muted-foreground">{safePage + 1}/{pageCount}</span>
                <button
                  type="button"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-md border border-input px-2 py-0.5 text-[11px] font-semibold text-foreground disabled:opacity-40"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={() => setArea((current) => cycleDeskArea(current, "deals"))}
                  className="rounded-md border border-input px-2 py-0.5 text-[11px] font-semibold text-foreground hover:bg-secondary"
                >
                  {area === "deals" ? "Split view" : "Expand"}
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead className="sticky top-0 z-10 bg-muted text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 font-semibold">Customer</th>
                    <th className="px-2 py-1.5 font-semibold">Lender</th>
                    <th className="px-2 py-1.5 font-semibold">Last activity</th>
                    <th className="px-2 py-1.5 font-semibold">Stage</th>
                    <th className="px-2 py-1.5 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedDeals.map((row) => {
                    const stageId = row.deal.grossStage;
                    const color = stageId ? LENDER_CASE_STAGE_COLORS[stageId as keyof typeof LENDER_CASE_STAGE_COLORS] : "#94A3B8";
                    const targets = permittedDeskStageTargets(stageId);
                    return (
                      <tr
                        key={row.deal.id}
                        className={cn(
                          "border-t border-border",
                          selection?.kind === "deal" && selection.id === row.deal.id && "bg-accent/40",
                        )}
                      >
                        {row.customerSpan > 0 ? (
                          <td
                            rowSpan={row.customerSpan}
                            className="align-top bg-blue-50 px-2 py-2 text-blue-950 dark:bg-blue-950 dark:text-blue-50"
                          >
                            <p className="font-semibold">{row.deal.customerName}</p>
                            <p className="text-[11px]">{row.deal.product}</p>
                            <p className="text-[11px]">{row.deal.amountLabel}</p>
                          </td>
                        ) : null}
                        <td className="px-2 py-1.5">
                          <span className="flex items-center gap-1.5 text-foreground">
                            <LenderMark name={row.deal.lenderName} />
                            {row.deal.lenderName}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">{row.deal.lastActivityLabel}</td>
                        <td className="relative px-2 py-1.5">
                          <button
                            type="button"
                            disabled={stageBusy || targets.length === 0}
                            onClick={() => setStageMenuId((current) => (current === row.deal.id ? null : row.deal.id))}
                            className="rounded-full border px-2 py-0.5 text-[11px] font-semibold text-foreground disabled:opacity-70"
                            style={{ borderColor: color, backgroundColor: `${color}33` }}
                          >
                            {row.deal.stageLabel}
                          </button>
                          {stageMenuId === row.deal.id ? (
                            <div className="absolute z-20 mt-1 max-h-48 w-44 overflow-y-auto rounded-md border border-input bg-background p-1 shadow-lg">
                              {targets.map((target) => (
                                <button
                                  key={target}
                                  type="button"
                                  onClick={() => void changeStage(row.deal, target)}
                                  className="block w-full rounded px-2 py-1 text-left text-[11px] text-foreground hover:bg-secondary"
                                >
                                  {LENDER_CASE_STAGE_LABELS[target]}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() => selectRow({ kind: "deal", id: row.deal.id })}
                            className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-accent hover:text-accent-foreground"
                          >
                            Action
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        {panel !== "closed" ? (
          <div
            className={cn(
              "min-h-0",
              panel === "open" ? "fixed inset-0 z-40 md:static md:inset-auto md:z-auto" : "w-10 shrink-0",
            )}
            style={panel === "open" ? { flex: flex.action } : undefined}
          >
            <CaseWorkbenchActionPanel
              opportunity={selectedOpportunity}
              deal={selectedDeal}
              collapsed={panel === "collapsed"}
              dirty={dirty}
              onDirty={setDirty}
              onCollapse={() => setPanel((current) => nextActionPanel(current, "collapse"))}
              onExpand={() => setPanel((current) => nextActionPanel(current, "expand"))}
              onRequestClose={() =>
                keepOrDiscard(() => {
                  setPanel("closed");
                })
              }
            />
          </div>
        ) : null}
      </div>
      {oppPageCount > 1 ? (
        <p className="px-3 py-1 text-[10px] text-foreground0">
          Showing page {safePage + 1} of {Math.max(pageCount, oppPageCount)}. Filters stay in place when the layout changes.
        </p>
      ) : null}
    </section>
  );
}
