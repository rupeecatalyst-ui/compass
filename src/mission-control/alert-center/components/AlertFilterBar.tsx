"use client";

import {
  ALERT_CATEGORIES,
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  type AlertFilter,
} from "../types";

export function AlertFilterBar({
  filter,
  modules,
  onChange,
  embedded = false,
}: {
  filter: AlertFilter;
  modules: string[];
  onChange: (next: AlertFilter) => void;
  embedded?: boolean;
}) {
  return (
    <section
      className={
        embedded
          ? undefined
          : "rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 shadow-sm shadow-black/20 md:p-4"
      }
      aria-label="Alert filters"
    >
      {!embedded && (
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Alert Filters
        </p>
      )}
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <label className="block space-y-1 md:col-span-2 xl:col-span-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Search</span>
          <input
            type="search"
            value={filter.search ?? ""}
            onChange={(e) => onChange({ ...filter, search: e.target.value })}
            placeholder="Search alerts…"
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-teal-500/50"
            aria-label="Search alerts"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Severity</span>
          <select
            value={filter.severity ?? "all"}
            onChange={(e) =>
              onChange({
                ...filter,
                severity: e.target.value as AlertFilter["severity"],
              })
            }
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
            aria-label="Filter by severity"
          >
            <option value="all">All severities</option>
            {ALERT_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Category</span>
          <select
            value={filter.category ?? "all"}
            onChange={(e) =>
              onChange({
                ...filter,
                category: e.target.value as AlertFilter["category"],
              })
            }
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {ALERT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Source module</span>
          <select
            value={filter.module ?? "all"}
            onChange={(e) => onChange({ ...filter, module: e.target.value })}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
            aria-label="Filter by source module"
          >
            <option value="all">All modules</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Status</span>
          <select
            value={filter.status ?? "all"}
            onChange={(e) =>
              onChange({
                ...filter,
                status: e.target.value as AlertFilter["status"],
              })
            }
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {ALERT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Acknowledgement</span>
          <select
            value={
              filter.acknowledged === true
                ? "acked"
                : filter.acknowledged === false
                  ? "unacked"
                  : "all"
            }
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                ...filter,
                acknowledged: v === "acked" ? true : v === "unacked" ? false : "all",
              });
            }}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
            aria-label="Filter by acknowledgement"
          >
            <option value="all">Acknowledged & unacknowledged</option>
            <option value="acked">Acknowledged</option>
            <option value="unacked">Unacknowledged</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Date from</span>
          <input
            type="date"
            value={filter.dateFrom && filter.dateFrom !== "all" ? filter.dateFrom : ""}
            onChange={(e) =>
              onChange({ ...filter, dateFrom: e.target.value ? e.target.value : "all" })
            }
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
            aria-label="Filter date from"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Date to</span>
          <input
            type="date"
            value={filter.dateTo && filter.dateTo !== "all" ? filter.dateTo : ""}
            onChange={(e) =>
              onChange({ ...filter, dateTo: e.target.value ? e.target.value : "all" })
            }
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
            aria-label="Filter date to"
          />
        </label>
      </div>
    </section>
  );
}
