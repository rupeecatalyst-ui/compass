"use client";

/**
 * CO-SPRINT-119 — New Arrivals KPI section (User Home Dashboard only).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Handshake,
  LineChart,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NEW_ARRIVALS_DATE_PRESETS,
  NEW_ARRIVALS_DEFAULT_PRESET,
  NEW_ARRIVALS_KPI_CARDS,
} from "@/constants/user-home-dashboard/new-arrivals";
import { useEcmContactRegistryVersion } from "@/hooks/use-ecm-contact-registry-version";
import {
  defaultNewArrivalsDateRange,
  loadNewArrivalsCounts,
  resolveNewArrivalsDateRange,
  buildNewArrivalsDrillDownHref,
} from "@/lib/user-home-dashboard/new-arrivals";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { seedEcmContactsDemoIfEmpty } from "@/lib/demo-seed";
import { cn } from "@/lib/utils";
import type { NewArrivalsDatePresetId } from "@/types/user-home-new-arrivals";

const ICON_MAP: Record<string, LucideIcon> = {
  user: UserRound,
  line_chart: LineChart,
  handshake: Handshake,
};

export function NewArrivalsSection() {
  const registryVersion = useEcmContactRegistryVersion();
  const [preset, setPreset] = useState<NewArrivalsDatePresetId>(NEW_ARRIVALS_DEFAULT_PRESET);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [countsById, setCountsById] = useState<Record<string, number>>({});

  const range = useMemo(
    () =>
      resolveNewArrivalsDateRange({
        preset,
        customFrom,
        customTo,
      }),
    [preset, customFrom, customTo],
  );

  const cards = useMemo(() => NEW_ARRIVALS_KPI_CARDS.filter((c) => c.enabled), []);

  const refreshCounts = useCallback(async () => {
    setLoading(true);
    try {
      if (!isEnterprisePersistencePrisma()) {
        seedEcmContactsDemoIfEmpty();
      }
      // CO-ARCH-003 — Do not re-hydrate ECM (Tier 2 cache warm) on every New Arrivals refresh.
      // Dashboard layout already hydrates once; this KPI strip must stay Tier 1.
      const result = await loadNewArrivalsCounts(range);
      const next: Record<string, number> = {};
      for (const row of result.counts) next[row.id] = row.count;
      setCountsById(next);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts, registryVersion]);

  const onPresetChange = (value: string) => {
    const next = value as NewArrivalsDatePresetId;
    setPreset(next);
    if (next === "custom") {
      const fallback = defaultNewArrivalsDateRange();
      setCustomFrom((prev) => prev || fallback.from);
      setCustomTo((prev) => prev || fallback.to);
    }
  };

  return (
    <section
      aria-label="New Arrivals"
      data-widget-slot="new_arrivals"
      data-sprint="CO-SPRINT-119"
      className="space-y-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">New Arrivals</h2>
          <p className="text-[12px] text-muted-foreground">
            Newly created enterprise records for the selected period.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label
              htmlFor="new-arrivals-period"
              className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Period
            </label>
            <Select value={preset} onValueChange={onPresetChange}>
              <SelectTrigger
                id="new-arrivals-period"
                className="h-9 w-[min(100%,11.5rem)] text-xs"
                aria-label="New Arrivals date filter"
              >
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {NEW_ARRIVALS_DATE_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preset === "custom" ? (
            <>
              <div className="space-y-1">
                <label
                  htmlFor="new-arrivals-from"
                  className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  From
                </label>
                <Input
                  id="new-arrivals-from"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-9 w-[9.5rem] text-xs"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="new-arrivals-to"
                  className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  To
                </label>
                <Input
                  id="new-arrivals-to"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-9 w-[9.5rem] text-xs"
                />
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = ICON_MAP[card.icon] ?? UserRound;
          const href = buildNewArrivalsDrillDownHref(card, range);
          const count = countsById[card.id];
          return (
            <Link
              key={card.id}
              href={href}
              className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
              aria-label={`${card.title}: ${count ?? "…"} — ${range.label}. Open registry.`}
            >
              <Card
                className={cn(
                  "h-full transition-colors group-hover:border-primary/40 group-hover:bg-muted/20",
                )}
              >
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <span
                      className="inline-flex items-center gap-0.5 rounded-md border border-border/80 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      title="Trend placeholder"
                    >
                      <TrendingUp className="h-3 w-3" aria-hidden />
                      —
                    </span>
                  </div>

                  <div>
                    {loading && count === undefined ? (
                      <div className="flex h-9 items-center" aria-busy>
                        <span
                          aria-hidden
                          className="h-7 w-16 animate-pulse rounded-md bg-muted"
                        />
                        <span className="sr-only">Loading count</span>
                      </div>
                    ) : (
                      <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                        {count ?? 0}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-medium text-foreground">{card.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{range.label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
