"use client";

/**
 * CO-UX-006 — Today's Fresh Logins KPI strip (User Home Dashboard).
 * Opportunity-centric counts · one-click drill-down to My Opportunities.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Handshake,
  Share2,
  TrendingUp,
  Users,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  FRESH_LOGIN_KPI_CARDS,
  buildFreshLoginDrillDownHref,
  type FreshLoginKpiBucketId,
} from "@/constants/opportunity-business-source";
import { loadFreshLoginKpiCounts } from "@/lib/user-home-dashboard/fresh-logins";
import { subscribeOpportunitiesUpdated } from "@/lib/enterprise-opportunity/opportunity-data-sync";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<Exclude<FreshLoginKpiBucketId, "total"> | "total", LucideIcon> = {
  direct: UserRound,
  channel_partner: Handshake,
  referral: Share2,
  other: Users,
  total: TrendingUp,
};

export function FreshLoginsSection() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<FreshLoginKpiBucketId, number>>({
    direct: 0,
    channel_partner: 0,
    referral: 0,
    other: 0,
    total: 0,
  });
  const [asOfLabel, setAsOfLabel] = useState("Today");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadFreshLoginKpiCounts();
      setCounts({
        direct: result.counts.direct,
        channel_partner: result.counts.channel_partner,
        referral: result.counts.referral,
        other: result.counts.other,
        total: result.counts.total,
      });
      try {
        const d = new Date(result.asOf);
        setAsOfLabel(
          Number.isNaN(d.getTime())
            ? "Today"
            : d.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }),
        );
      } catch {
        setAsOfLabel("Today");
      }
    } catch {
      setCounts({
        direct: 0,
        channel_partner: 0,
        referral: 0,
        other: 0,
        total: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return subscribeOpportunitiesUpdated(() => {
      void refresh();
    });
  }, [refresh]);

  return (
    <section
      aria-label="Today's Fresh Logins"
      data-widget-slot="fresh_logins"
      data-sprint="CO-UX-006"
      className="space-y-3"
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight">Today&apos;s Fresh Logins</h2>
        <p className="text-[12px] text-muted-foreground">
          Opportunities that reached Login today — by Business Source. Click a card to open the
          filtered Opportunity list.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        {FRESH_LOGIN_KPI_CARDS.map((card) => {
          const Icon = ICON_MAP[card.id] ?? UserRound;
          const href = buildFreshLoginDrillDownHref(card.id);
          const count = counts[card.id];
          return (
            <Link
              key={card.id}
              href={href}
              className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
              aria-label={`${card.title}: ${count} fresh logins today. Open Opportunity list.`}
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
                      title="Trend vs prior day — not yet available"
                    >
                      <TrendingUp className="h-3 w-3" aria-hidden />
                      —
                    </span>
                  </div>

                  <div>
                    {loading ? (
                      <div className="flex h-9 items-center" aria-busy="true">
                        <span className="h-2 w-16 animate-pulse rounded bg-muted" />
                        <span className="sr-only">Loading count</span>
                      </div>
                    ) : (
                      <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                        {count}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-medium text-foreground">{card.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{asOfLabel}</p>
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
