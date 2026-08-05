"use client";

/**
 * CO-MC-002 — CHANAKYA Intelligence workspace (Mission Control).
 * Answers: “Why is the business heading there?”
 * Additive — does not modify Radar or Executive Briefing implementations.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  WidgetRenderer,
  createWidgetLayoutManager,
  buildDefaultLayoutPlan,
} from "@/mission-control/shared/widget-framework";
import { WorkspaceLoadingState } from "@/mission-control/shared/ui";
import { MC_GHOST_CONTROL, MC_PAGE_EYEBROW } from "@/mission-control/shared/ui/patterns";
import {
  DEFAULT_CHANAKYA_INTELLIGENCE_FILTERS,
  CHANAKYA_INTELLIGENCE_HEAT_DIMENSIONS,
} from "@/constants/chanakya-intelligence";
import {
  loadChanakyaIntelligenceModel,
  composeChanakyaIntelligenceModelSync,
} from "@/lib/chanakya-intelligence";
import { subscribeRadarDealSource } from "@/lib/chanakya-radar";
import type {
  ChanakyaIntelligenceFilters,
  ChanakyaIntelligenceHeatDimension,
  ChanakyaIntelligenceModel,
} from "@/types/chanakya-intelligence";
import { createChanakyaIntelligenceWidgets } from "./widget-registry";
import { cn } from "@/mission-control/shared/cn";

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex min-w-[7.5rem] flex-col gap-1">
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      <select
        className={cn(MC_GHOST_CONTROL, "h-8 min-w-0 truncate px-2 text-[11px]")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="all">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ChanakyaIntelligencePage() {
  const router = useRouter();
  const [model, setModel] = useState<ChanakyaIntelligenceModel | null>(null);
  const [filters, setFilters] = useState<ChanakyaIntelligenceFilters>({
    ...DEFAULT_CHANAKYA_INTELLIGENCE_FILTERS,
  });
  const [heatDimension, setHeatDimension] =
    useState<ChanakyaIntelligenceHeatDimension>("branch_product");
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [selectedHeatCell, setSelectedHeatCell] = useState<string | null>(null);

  const widgets = useMemo(() => createChanakyaIntelligenceWidgets(), []);
  const layoutManager = useMemo(() => {
    const plan = buildDefaultLayoutPlan(widgets, "chanakya-intelligence-2x2");
    return createWidgetLayoutManager(plan);
  }, [widgets]);

  const refresh = useCallback(async () => {
    try {
      const next = await loadChanakyaIntelligenceModel({ filters, heatDimension });
      setModel(next);
    } catch {
      setModel(composeChanakyaIntelligenceModelSync({ filters, heatDimension }));
    }
  }, [filters, heatDimension]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await loadChanakyaIntelligenceModel({ filters, heatDimension });
        if (!cancelled) setModel(next);
      } catch {
        if (!cancelled) {
          setModel(composeChanakyaIntelligenceModelSync({ filters, heatDimension }));
        }
      }
    })();
    const unsub = subscribeRadarDealSource(() => {
      void refresh();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [filters, heatDimension, refresh]);

  const patchFilter = (key: keyof ChanakyaIntelligenceFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setSelectedCluster(null);
    setSelectedHeatCell(null);
  };

  if (!model) {
    return <WorkspaceLoadingState label="Preparing CHANAKYA Intelligence…" />;
  }

  const payload = {
    model,
    heatDimension,
    setHeatDimension,
    selectedCluster,
    setSelectedCluster,
    selectedHeatCell,
    setSelectedHeatCell,
    onOpenDeal: (href: string) => router.push(href),
  };

  return (
    <div
      className="space-y-4 md:space-y-5"
      aria-label="CHANAKYA Intelligence — Enterprise Intelligence Centre"
    >
      <header className="relative overflow-hidden rounded-2xl border border-zinc-800/90 bg-gradient-to-br from-zinc-900 via-zinc-950 to-teal-950/40 p-4 shadow-lg shadow-black/30 md:p-5">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 20% 0%, rgba(45,212,191,0.18), transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(56,189,248,0.12), transparent 45%)",
          }}
        />
        <div className="relative">
          <p className={`${MC_PAGE_EYEBROW} text-teal-300/90`}>CHANAKYA Intelligence</p>
          <h1 className="mt-1 font-serif text-xl font-semibold tracking-tight text-zinc-50 md:text-2xl">
            Why is the business heading there?
          </h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-400 md:text-sm">
            Enterprise Intelligence Centre — Galaxy · River · Heat · Pulse. Radar shows
            direction; this desk explains the operational causes behind it.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 backdrop-blur-md">
        <FilterSelect
          label="Product"
          value={filters.product}
          options={model.filterOptions.products}
          onChange={(v) => patchFilter("product", v)}
        />
        <FilterSelect
          label="Branch"
          value={filters.branch}
          options={model.filterOptions.branches}
          onChange={(v) => patchFilter("branch", v)}
        />
        <FilterSelect
          label="Team"
          value={filters.team}
          options={model.filterOptions.teams}
          onChange={(v) => patchFilter("team", v)}
        />
        <FilterSelect
          label="Employee"
          value={filters.employee}
          options={model.filterOptions.employees}
          onChange={(v) => patchFilter("employee", v)}
        />
        <FilterSelect
          label="Partner"
          value={filters.partner}
          options={model.filterOptions.partners}
          onChange={(v) => patchFilter("partner", v)}
        />
        <FilterSelect
          label="Stage"
          value={filters.stage}
          options={model.filterOptions.stages}
          onChange={(v) => patchFilter("stage", v)}
        />
        <div className="ml-auto flex flex-col gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Heat Map
          </span>
          <select
            className={cn(MC_GHOST_CONTROL, "h-8 px-2 text-[11px]")}
            value={heatDimension}
            onChange={(e) =>
              setHeatDimension(e.target.value as ChanakyaIntelligenceHeatDimension)
            }
          >
            {CHANAKYA_INTELLIGENCE_HEAT_DIMENSIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <WidgetRenderer
        widgets={widgets}
        layoutManager={layoutManager}
        resolvePayload={() => payload}
        className="gap-4 md:gap-5"
      />
    </div>
  );
}
