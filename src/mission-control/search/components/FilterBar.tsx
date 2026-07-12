"use client";

import { cn } from "../../shared/cn";
import type { SearchFilter } from "../types";

const SOURCE_OPTIONS = [
  "Customer 360",
  "Opportunity Lifecycle",
  "Loan Workspace",
  "Partner Management",
  "Document Intelligence",
  "Product Intelligence",
  "Mission Control",
  "Horizon",
  "Security",
  "Configuration",
  "Workflow Engine",
] as const;

export function FilterBar({
  filter,
  onChange,
  className,
}: {
  filter: SearchFilter;
  onChange: (next: SearchFilter) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-2.5",
        className,
      )}
      aria-label="Quick filters"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
        Quick filters
      </span>
      <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
        Updated
        <select
          value={filter.updatedWithin ?? "any"}
          onChange={(e) =>
            onChange({
              ...filter,
              updatedWithin: e.target.value as SearchFilter["updatedWithin"],
            })
          }
          className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 outline-none"
        >
          <option value="any">Any time</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-1">
        {SOURCE_OPTIONS.map((module) => {
          const active = filter.sourceModules.includes(module);
          return (
            <button
              key={module}
              type="button"
              onClick={() => {
                const next = active
                  ? filter.sourceModules.filter((m) => m !== module)
                  : [...filter.sourceModules, module];
                onChange({ ...filter, sourceModules: next });
              }}
              className={cn(
                "rounded-md border px-2 py-1 text-[10px] transition",
                active
                  ? "border-cyan-500/35 bg-cyan-500/10 text-cyan-100"
                  : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
              )}
            >
              {module}
            </button>
          );
        })}
      </div>
    </div>
  );
}
