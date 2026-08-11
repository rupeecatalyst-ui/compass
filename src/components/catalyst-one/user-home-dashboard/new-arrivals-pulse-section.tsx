"use client";

/**
 * CO-C1-DASH-001 — New Arrivals KPI pulse (Partners + Contacts).
 * Not a scrolling feed — creation-timestamp KPIs only.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Handshake, TrendingDown, TrendingUp, Users } from "lucide-react";
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
  COMMAND_CENTER_DATE_PRESETS,
  NEW_ARRIVALS_DEFAULT_PRESET,
} from "@/constants/user-home-dashboard/new-arrivals";
import {
  defaultNewArrivalsDateRange,
  resolveNewArrivalsDateRange,
} from "@/lib/user-home-dashboard/new-arrivals/date-range";
import { loadNewArrivalsPulse } from "@/lib/user-home-dashboard/command-center";
import { useEcmContactRegistryVersion } from "@/hooks/use-ecm-contact-registry-version";
import { cn } from "@/lib/utils";
import type { NewArrivalsPulseCard } from "@/types/dashboard-command-center";
import type { NewArrivalsDatePresetId } from "@/types/user-home-new-arrivals";

export function NewArrivalsPulseSection() {
  const registryVersion = useEcmContactRegistryVersion();
  const [preset, setPreset] = useState<NewArrivalsDatePresetId>(NEW_ARRIVALS_DEFAULT_PRESET);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<NewArrivalsPulseCard[]>([]);

  const range = useMemo(
    () => resolveNewArrivalsDateRange({ preset, customFrom, customTo }),
    [preset, customFrom, customTo],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCards(await loadNewArrivalsPulse(range));
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void refresh();
  }, [refresh, registryVersion]);

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
      data-widget-slot="new_arrivals_pulse"
      data-sprint="CO-C1-DASH-001"
      className="space-y-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">New Arrivals</h2>
          <p className="text-[12px] text-muted-foreground">
            Newly registered Partners and Contacts for the selected period (creation timestamp).
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Select value={preset} onValueChange={onPresetChange}>
            <SelectTrigger className="h-9 w-[min(100%,11.5rem)] text-xs" aria-label="New Arrivals period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMAND_CENTER_DATE_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {preset === "custom" ? (
            <>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 w-[9.5rem] text-xs"
                aria-label="From date"
              />
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 w-[9.5rem] text-xs"
                aria-label="To date"
              />
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(["new_partners", "new_contacts"] as const).map((id) => {
          const card = cards.find((c) => c.id === id);
          const Icon = id === "new_partners" ? Handshake : Users;
          const delta = card?.deltaVsPrevious ?? null;
          return (
            <Link
              key={id}
              href={card?.href ?? "#"}
              className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-muted/20">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    {delta != null ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px]",
                          delta >= 0
                            ? "border-emerald-600/30 text-emerald-800 dark:text-emerald-200"
                            : "border-rose-600/30 text-rose-800 dark:text-rose-200",
                        )}
                      >
                        {delta >= 0 ? (
                          <TrendingUp className="h-3 w-3" aria-hidden />
                        ) : (
                          <TrendingDown className="h-3 w-3" aria-hidden />
                        )}
                        {delta >= 0 ? "+" : ""}
                        {delta} vs previous
                      </span>
                    ) : null}
                  </div>
                  {loading && !card ? (
                    <span className="h-8 w-16 animate-pulse rounded bg-muted" />
                  ) : (
                    <p className="text-3xl font-semibold tabular-nums">{card?.count ?? 0}</p>
                  )}
                  <p className="text-sm font-medium">
                    {id === "new_partners" ? "New Partners" : "New Contacts"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{range.label}</p>
                  {card && card.breakdown.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                      {card.breakdown.map((slice) => (
                        <li key={slice.id} className="flex justify-between gap-2">
                          <span className="truncate">{slice.label}</span>
                          <span className="tabular-nums">{slice.count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
