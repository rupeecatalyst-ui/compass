"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutPanelLeft, PanelRight, X } from "lucide-react";
import { buildOpportunityWorkspaceStageHref } from "@/constants/opportunity-workspace-stages";
import {
  cycleDeskArea,
  deskFilterOptions,
  EMPTY_DESK_FILTERS,
  filterDesk,
  groupDealsByOpportunity,
  projectDeskDeals,
  type DeskArea,
  type DeskDeal,
  type DeskDealInput,
  type DeskFilters,
  type DeskOpportunity,
  type DeskSelection,
} from "@/lib/case-workbench/operational-desk";
import { buildDealWorkspaceHref } from "@/lib/loan-journey/adr-018-routing";
import { cn } from "@/lib/utils";

function PaneHeader({
  title,
  count,
  expanded,
  onToggle,
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2">
      <div className="min-w-0">
        <h2 className="truncate text-[13px] font-semibold text-zinc-50">{title}</h2>
        <p className="text-[11px] text-zinc-500">{count}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white"
      >
        {expanded ? "Split view" : "Expand"}
      </button>
    </header>
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
  const [filters, setFilters] = useState<DeskFilters>(EMPTY_DESK_FILTERS);
  const [area, setArea] = useState<DeskArea>("split");
  const [mobilePane, setMobilePane] = useState<"opportunities" | "deals">("opportunities");
  const [selection, setSelection] = useState<DeskSelection | null>(null);

  const groups = useMemo(
    () => groupDealsByOpportunity(projectDeskDeals(deals)),
    [deals],
  );
  const options = useMemo(
    () => deskFilterOptions(opportunities, groups),
    [opportunities, groups],
  );
  const visible = useMemo(
    () => filterDesk(opportunities, groups, filters),
    [opportunities, groups, filters],
  );

  const selectedOpportunity =
    selection?.kind === "opportunity"
      ? opportunities.find((row) => row.id === selection.id) ?? null
      : null;
  const selectedDeal =
    selection?.kind === "deal"
      ? groups.flatMap((group) => group.deals).find((deal) => deal.id === selection.id) ?? null
      : null;
  const selectedGroup = selectedDeal
    ? groups.find((group) => group.relationshipKey === selectedDeal.relationshipKey) ?? null
    : selectedOpportunity
      ? groups.find((group) => group.opportunityId === selectedOpportunity.id) ?? null
      : null;

  const showOpportunities = area !== "deals";
  const showDeals = area !== "opportunities";

  return (
    <section className="flex min-h-[70vh] flex-col gap-2" aria-label="Operational Desk">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2">
        <label className="min-w-[12rem] flex-1 text-[11px] text-zinc-400">
          Search
          <input
            value={filters.query}
            onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
            placeholder="Customer, product, lender, or stage"
            className="mt-1 h-8 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-[12px] text-zinc-100 outline-none focus:ring-2 focus:ring-violet-500"
          />
        </label>
        <label className="text-[11px] text-zinc-400">
          Stage
          <select
            value={filters.stage}
            onChange={(event) => setFilters((prev) => ({ ...prev, stage: event.target.value }))}
            className="mt-1 h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-[12px] text-zinc-100"
          >
            <option value="all">All stages</option>
            {options.stages.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-zinc-400">
          Product
          <select
            value={filters.product}
            onChange={(event) => setFilters((prev) => ({ ...prev, product: event.target.value }))}
            className="mt-1 h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-[12px] text-zinc-100"
          >
            <option value="all">All products</option>
            {options.products.map((product) => (
              <option key={product} value={product}>
                {product}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-1 md:hidden">
          <button
            type="button"
            onClick={() => setMobilePane("opportunities")}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-semibold",
              mobilePane === "opportunities" ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-300",
            )}
          >
            Opportunities
          </button>
          <button
            type="button"
            onClick={() => setMobilePane("deals")}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-semibold",
              mobilePane === "deals" ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-300",
            )}
          >
            Active Deals
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {area === "deals" ? (
            <button
              type="button"
              onClick={() => setArea("opportunities")}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-left text-[12px] font-semibold text-zinc-100 hover:bg-zinc-900"
            >
              Opportunities
              <span className="text-[11px] font-medium text-zinc-400">
                {visible.opportunities.length} · Expand
              </span>
            </button>
          ) : null}
          {area === "opportunities" ? (
            <button
              type="button"
              onClick={() => setArea("deals")}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-left text-[12px] font-semibold text-zinc-100 hover:bg-zinc-900"
            >
              Active Deals
              <span className="text-[11px] font-medium text-zinc-400">
                {visible.groups.reduce((n, group) => n + group.deals.length, 0)} · Expand
              </span>
            </button>
          ) : null}
          <div
            className={cn(
              "grid min-h-0 flex-1 gap-2",
              area === "split" && "md:grid-cols-[2fr_3fr]",
            )}
          >
            {showOpportunities ? (
              <div className={cn("min-w-0", area === "split" && mobilePane !== "opportunities" && "hidden md:block")}>
                <OpportunityPane
                  rows={visible.opportunities}
                  loading={loading}
                  error={error}
                  expanded={area === "opportunities"}
                  selectedId={selectedOpportunity?.id ?? null}
                  onToggle={() => setArea((current) => cycleDeskArea(current, "opportunities"))}
                  onSelect={(id) => setSelection({ kind: "opportunity", id })}
                />
              </div>
            ) : null}
            {showDeals ? (
              <div className={cn("min-w-0", area === "split" && mobilePane !== "deals" && "hidden md:block")}>
                <DealPane
                  groups={visible.groups}
                  expanded={area === "deals"}
                  selectedId={selectedDeal?.id ?? null}
                  onToggle={() => setArea((current) => cycleDeskArea(current, "deals"))}
                  onSelect={(id) => setSelection({ kind: "deal", id })}
                />
              </div>
            ) : null}
          </div>
        </div>
        {selection ? (
          <DeskDrawer
            opportunity={selectedOpportunity}
            deal={selectedDeal}
            parallelCount={selectedGroup?.deals.length ?? 0}
            onClose={() => setSelection(null)}
          />
        ) : null}
      </div>
    </section>
  );
}

function OpportunityPane({
  rows,
  loading,
  error,
  expanded,
  selectedId,
  onToggle,
  onSelect,
}: {
  rows: DeskOpportunity[];
  loading: boolean;
  error: string | null;
  expanded: boolean;
  selectedId: string | null;
  onToggle: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex h-full min-h-[24rem] flex-col rounded-xl border border-zinc-800 bg-zinc-950/80">
      <PaneHeader title="Opportunities" count={rows.length} expanded={expanded} onToggle={onToggle} />
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {loading ? <li className="px-2 py-3 text-[12px] text-zinc-500">Loading opportunities…</li> : null}
        {error ? <li className="px-2 py-3 text-[12px] text-rose-300">{error}</li> : null}
        {!loading && !error && rows.length === 0 ? (
          <li className="px-2 py-3 text-[12px] text-zinc-500">No active unconverted opportunities.</li>
        ) : null}
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onSelect(row.id)}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-left",
                selectedId === row.id
                  ? "border-violet-500 bg-violet-950/40"
                  : "border-zinc-800 bg-zinc-950 hover:border-zinc-600",
              )}
            >
              <p className="truncate text-[13px] font-semibold text-zinc-50">{row.customerName}</p>
              <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                {row.product} · {row.stageLabel}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">{row.amountLabel}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DealPane({
  groups,
  expanded,
  selectedId,
  onToggle,
  onSelect,
}: {
  groups: ReturnType<typeof filterDesk>["groups"];
  expanded: boolean;
  selectedId: string | null;
  onToggle: () => void;
  onSelect: (id: string) => void;
}) {
  const count = groups.reduce((n, group) => n + group.deals.length, 0);
  return (
    <div className="flex h-full min-h-[24rem] flex-col rounded-xl border border-zinc-800 bg-zinc-950/80">
      <PaneHeader title="Active Deals" count={count} expanded={expanded} onToggle={onToggle} />
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {groups.length === 0 ? (
          <li className="px-2 py-3 text-[12px] text-zinc-500">No active deals in this view.</li>
        ) : null}
        {groups.map((group) => (
          <li key={group.relationshipKey} className="rounded-lg border border-zinc-800">
            <div className="border-b border-zinc-800 px-3 py-2">
              <p className="truncate text-[13px] font-semibold text-zinc-50">{group.customerName}</p>
              <p className="truncate text-[11px] text-zinc-500">{group.product}</p>
            </div>
            <ul>
              {group.deals.map((deal) => (
                <li key={deal.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(deal.id)}
                    className={cn(
                      "w-full px-3 py-2 text-left",
                      selectedId === deal.id ? "bg-violet-950/40" : "hover:bg-zinc-900",
                    )}
                  >
                    <p className="truncate text-[12px] font-semibold text-zinc-100">{deal.lenderName}</p>
                    <p className="truncate text-[11px] text-zinc-400">
                      {deal.stageLabel} · {deal.amountLabel}
                    </p>
                    <p className="text-[11px] text-zinc-500">{deal.lastActivityLabel}</p>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeskDrawer({
  opportunity,
  deal,
  parallelCount,
  onClose,
}: {
  opportunity: DeskOpportunity | null;
  deal: DeskDeal | null;
  parallelCount: number;
  onClose: () => void;
}) {
  const customer = deal?.customerName ?? opportunity?.customerName ?? "Not Specified";
  const product = deal?.product ?? opportunity?.product ?? "Not Specified";
  const stage = deal?.stageLabel ?? opportunity?.stageLabel ?? "Not Specified";
  const amount = deal?.amountLabel ?? opportunity?.amountLabel ?? "Not Specified";
  const opportunityId = deal?.opportunityId ?? opportunity?.id ?? null;
  const dealHref = deal
    ? buildDealWorkspaceHref({
        dealId: deal.id,
        fileId: deal.fileId,
        opportunityId,
      })
    : null;
  const opportunityHref = opportunityId
    ? buildOpportunityWorkspaceStageHref("opportunity_creation", { opportunityId })
    : null;

  return (
    <aside
      className="fixed inset-0 z-40 flex flex-col border-zinc-800 bg-zinc-950 md:static md:inset-auto md:z-auto md:w-[22rem] md:shrink-0 md:rounded-xl md:border"
      aria-label="Transaction context"
    >
      <header className="flex items-start justify-between gap-2 border-b border-zinc-800 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300">
            {deal ? "Deal" : "Opportunity"}
          </p>
          <h2 className="truncate text-sm font-semibold text-zinc-50">{customer}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close transaction context"
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <dl className="space-y-2 overflow-y-auto px-3 py-3 text-[12px]">
        <Fact label="Product" value={product} />
        <Fact label="Stage" value={stage} />
        <Fact label="Lender" value={deal?.lenderName ?? "Not Specified"} />
        <Fact label="Amount" value={amount} />
        <Fact label="Last activity" value={deal?.lastActivityLabel ?? "Not Specified"} />
        {parallelCount > 1 ? (
          <Fact label="Lender negotiations" value={String(parallelCount)} />
        ) : null}
      </dl>
      <div className="mt-auto space-y-2 border-t border-zinc-800 px-3 py-3">
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Stage changes, email, lender contacts, tasks, notes, and documents stay in the existing workspace.
        </p>
        {opportunityHref ? (
          <Link
            href={opportunityHref}
            className="flex items-center gap-2 rounded-md border border-zinc-700 px-2 py-1.5 text-[12px] font-semibold text-zinc-100 hover:bg-zinc-900"
          >
            <LayoutPanelLeft className="h-3.5 w-3.5" />
            Open Opportunity Workspace
          </Link>
        ) : null}
        {dealHref ? (
          <Link
            href={dealHref}
            className="flex items-center gap-2 rounded-md bg-violet-600 px-2 py-1.5 text-[12px] font-semibold text-white hover:bg-violet-500"
          >
            <PanelRight className="h-3.5 w-3.5" />
            Open Deal Workspace
          </Link>
        ) : null}
      </div>
    </aside>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="text-zinc-100">{value}</dd>
    </div>
  );
}
