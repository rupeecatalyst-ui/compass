"use client";

/**
 * Today's New Opportunities (by Business Source) + Today's New Deals.
 * Opportunity and Deal counts are independent SSOTs.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Handshake,
  Share2,
  TrendingUp,
  Users,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  TODAY_NEW_OPPORTUNITY_KPI_CARDS,
  buildTodayNewDealsDrillDownHref,
  buildTodayNewOpportunityDrillDownHref,
  type FreshLoginKpiBucketId,
} from "@/constants/opportunity-business-source";
import {
  loadTodayNewDealKpiCounts,
  loadTodayNewOpportunityKpiCounts,
} from "@/lib/user-home-dashboard/today-new-kpis";
import { subscribeOpportunitiesUpdated } from "@/lib/enterprise-opportunity/opportunity-data-sync";
import { subscribeLoanFilesUpdated } from "@/lib/loan-data-sync";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<Exclude<FreshLoginKpiBucketId, "total"> | "total", LucideIcon> = {
  direct: UserRound,
  channel_partner: Handshake,
  referral: Share2,
  other: Users,
  total: TrendingUp,
};

function formatAsOf(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Today";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Today";
  }
}

export function TodayNewCreationSection() {
  const [loadingOpp, setLoadingOpp] = useState(true);
  const [loadingDeal, setLoadingDeal] = useState(true);
  const [oppCounts, setOppCounts] = useState<Record<FreshLoginKpiBucketId, number>>({
    direct: 0,
    channel_partner: 0,
    referral: 0,
    other: 0,
    total: 0,
  });
  const [dealTotal, setDealTotal] = useState(0);
  const [asOfLabel, setAsOfLabel] = useState("Today");

  const refreshOpps = useCallback(async () => {
    setLoadingOpp(true);
    try {
      const result = await loadTodayNewOpportunityKpiCounts();
      setOppCounts({
        direct: result.counts.direct,
        channel_partner: result.counts.channel_partner,
        referral: result.counts.referral,
        other: result.counts.other,
        total: result.counts.total,
      });
      setAsOfLabel(formatAsOf(result.asOf));
    } catch {
      setOppCounts({
        direct: 0,
        channel_partner: 0,
        referral: 0,
        other: 0,
        total: 0,
      });
    } finally {
      setLoadingOpp(false);
    }
  }, []);

  const refreshDeals = useCallback(async () => {
    setLoadingDeal(true);
    try {
      const result = await loadTodayNewDealKpiCounts();
      setDealTotal(result.counts.total);
      setAsOfLabel(formatAsOf(result.asOf));
    } catch {
      setDealTotal(0);
    } finally {
      setLoadingDeal(false);
    }
  }, []);

  useEffect(() => {
    void refreshOpps();
    void refreshDeals();
    const unsubOpp = subscribeOpportunitiesUpdated(() => {
      void refreshOpps();
    });
    const unsubDeal = subscribeLoanFilesUpdated(() => {
      void refreshDeals();
    });
    return () => {
      unsubOpp();
      unsubDeal();
    };
  }, [refreshOpps, refreshDeals]);

  return (
    <div className="space-y-5">
      <section
        aria-label="Today's New Opportunities"
        data-widget-slot="today_new_opportunities"
        className="space-y-3"
      >
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">
            Today&apos;s New Opportunities
          </h2>
          <p className="text-[12px] text-muted-foreground">
            Opportunities created today after Customer Requirement save — by Business Source.
            Documents are not required. Dialogue Opportunities are included when created today.
          </p>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
          {TODAY_NEW_OPPORTUNITY_KPI_CARDS.map((card) => {
            const Icon = ICON_MAP[card.id] ?? UserRound;
            const href = buildTodayNewOpportunityDrillDownHref(card.id);
            const count = oppCounts[card.id];
            return (
              <Link
                key={card.id}
                href={href}
                className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`${card.title}: ${count} new opportunities today.`}
              >
                <Card
                  className={cn(
                    "h-full transition-colors group-hover:border-teal-600/40 group-hover:bg-muted/20",
                  )}
                >
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600/10 text-teal-800 dark:text-teal-200">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div>
                      {loadingOpp ? (
                        <div className="flex h-9 items-center" aria-busy="true">
                          <span className="h-2 w-16 animate-pulse rounded bg-muted" />
                        </div>
                      ) : (
                        <p className="text-3xl font-semibold tabular-nums tracking-tight">
                          {count}
                        </p>
                      )}
                      <p className="mt-1 text-sm font-medium">{card.title}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{asOfLabel}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section
        aria-label="Today's New Deals"
        data-widget-slot="today_new_deals"
        className="space-y-3"
      >
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Today&apos;s New Deals</h2>
          <p className="text-[12px] text-muted-foreground">
            Deals created today when a lender is identified. Independent from Opportunity
            counts — no Deal exists until the first lender is identified.
          </p>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
          <Link
            href={buildTodayNewDealsDrillDownHref()}
            className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`Total: ${dealTotal} new deals today.`}
          >
            <Card className="h-full transition-colors group-hover:border-violet-600/40 group-hover:bg-muted/20">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600/10 text-violet-800 dark:text-violet-200">
                  <Briefcase className="h-4 w-4" aria-hidden />
                </div>
                <div>
                  {loadingDeal ? (
                    <div className="flex h-9 items-center" aria-busy="true">
                      <span className="h-2 w-16 animate-pulse rounded bg-muted" />
                    </div>
                  ) : (
                    <p className="text-3xl font-semibold tabular-nums tracking-tight">
                      {dealTotal}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-medium">Total</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{asOfLabel}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}
