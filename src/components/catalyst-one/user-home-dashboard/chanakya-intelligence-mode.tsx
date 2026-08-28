"use client";

/**
 * CO-CHANAKYA-INTELLIGENCE-001 — Dashboard CHANAKYA Intelligence mode (read-only).
 */

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  Bell,
  Brain,
  FileText,
  Lightbulb,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChanakyaInappConversationPanel } from "@/components/catalyst-one/user-home-dashboard/chanakya-inapp-conversation-panel";
import {
  CHANAKYA_DASHBOARD_INTELLIGENCE_SPRINT,
  CHANAKYA_INTELLIGENCE_PARTNER_SUBTITLE,
  CHANAKYA_INTELLIGENCE_PARTNER_TITLE,
} from "@/constants/chanakya-dashboard-intelligence";
import { ROUTES } from "@/constants/routes";
import { buildDashboardHref } from "@/lib/lead-opportunity-journey/active-context";
import { composeChanakyaDashboardIntelligence } from "@/lib/chanakya-dashboard-intelligence";
import { filterDealRegistryRows } from "@/lib/my-deals/deal-registry";
import { loadMyDealsDealRegistryRows } from "@/lib/enterprise-deal/deal-registry-port";
import { subscribeLoanFilesUpdated } from "@/lib/loan-data-sync";
import { EMPTY_DEAL_REGISTRY_FILTERS, type DealRegistryRow } from "@/types/deal-registry";
import type {
  ChanakyaAlertSeverity,
  ChanakyaDashboardIntelligenceSnapshot,
} from "@/types/chanakya-dashboard-intelligence";
import { cn } from "@/lib/utils";

function bandClass(band: string): string {
  switch (band) {
    case "critical":
      return "border-rose-500/35 bg-rose-500/8";
    case "high":
      return "border-amber-500/35 bg-amber-500/8";
    case "medium":
      return "border-sky-500/30 bg-sky-500/8";
    default:
      return "border-border/70 bg-background/60";
  }
}

function alertClass(severity: ChanakyaAlertSeverity): string {
  if (severity === "critical") return "border-rose-500/40 bg-rose-500/10";
  if (severity === "warning") return "border-amber-500/40 bg-amber-500/10";
  return "border-border/70 bg-muted/20";
}

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-3 flex items-start gap-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ei-teal)]/10 text-[var(--ei-teal)]">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-[var(--ei-ink)]">{title}</h2>
        <p className="text-[12px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export function ChanakyaIntelligenceMode() {
  const { user } = useAuthContext();
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "";
  const [dealRows, setDealRows] = useState<DealRegistryRow[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);

  const refreshDeals = useCallback(async () => {
    setDealsLoading(true);
    try {
      const result = await loadMyDealsDealRegistryRows();
      const mine = filterDealRegistryRows(
        result.rows,
        { ...EMPTY_DEAL_REGISTRY_FILTERS, scope: "my_deals" },
        displayName || undefined,
      );
      setDealRows(mine);
    } catch {
      setDealRows([]);
    } finally {
      setDealsLoading(false);
    }
  }, [displayName]);

  useEffect(() => {
    void refreshDeals();
    return subscribeLoanFilesUpdated(() => {
      void refreshDeals();
    });
  }, [refreshDeals]);

  const model: ChanakyaDashboardIntelligenceSnapshot = useMemo(
    () =>
      composeChanakyaDashboardIntelligence({
        user,
        dealRows,
      }),
    [user, dealRows],
  );

  return (
    <div
      className="space-y-6"
      data-dashboard="chanakya-intelligence"
      data-sprint={CHANAKYA_DASHBOARD_INTELLIGENCE_SPRINT}
      data-read-only="true"
    >
      {/* Top CHANAKYA header */}
      <section
        aria-label="CHANAKYA Intelligence header"
        className="relative overflow-hidden rounded-2xl border border-[var(--ei-teal)]/20 bg-gradient-to-br from-white/90 via-[var(--ei-mist)]/80 to-teal-50/40 p-5 shadow-[var(--ei-depth-1)] md:p-6 dark:from-[var(--ei-panel)] dark:via-[var(--ei-panel)] dark:to-teal-950/30"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="ei-eyebrow">{CHANAKYA_INTELLIGENCE_PARTNER_TITLE}</p>
            <h1 className="ei-display text-2xl text-[var(--ei-ink)] md:text-3xl">
              {CHANAKYA_INTELLIGENCE_PARTNER_SUBTITLE}
            </h1>
            <p className="max-w-2xl text-sm text-[var(--ei-ink-soft)]">
              {model.executiveStatement}
            </p>
            <p className="text-sm font-medium text-[var(--ei-teal)]">{model.attentionSummary}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-[11px] text-muted-foreground">
            <p className="font-semibold uppercase tracking-wide text-[var(--ei-teal)]">
              Read-only
            </p>
            <p className="mt-0.5 max-w-[14rem]">
              Analyse · prioritise · recommend. Never mutate Catalyst One records.
            </p>
          </div>
        </div>
      </section>

      {/* Conversation — CO-CHANAKYA-037 interactive Ask CHANAKYA */}
      <section aria-label="Ask CHANAKYA" className="space-y-3">
        <SectionHeading
          icon={MessageSquare}
          title="Ask CHANAKYA"
          subtitle="Free-form multi-turn conversation inside your Catalyst One authorization boundary."
        />
        <Card className="border-[var(--ei-teal)]/25 bg-background/70 shadow-[var(--ei-depth-1)]">
          <CardContent className="p-4 md:p-5">
            <ChanakyaInappConversationPanel prompts={model.conversationPrompts} />
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        {/* Needs attention — primary */}
        <section aria-label="Needs Your Attention" className="space-y-3 xl:col-span-7">
          <SectionHeading
            icon={Lightbulb}
            title="Needs Your Attention"
            subtitle="WHAT · WHY · HOW LONG · WHAT CHANAKYA recommends — from ETE priorities."
          />
          {model.attention.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                No attention items in your queue right now.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {model.attention.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href || ROUTES.TASKS}
                    className={cn(
                      "block rounded-xl border px-4 py-3 transition-colors hover:bg-muted/30",
                      bandClass(item.band),
                    )}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-[var(--ei-ink)]">{item.title}</p>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {item.band}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      <span className="font-medium text-foreground/80">Why: </span>
                      {item.whyItMatters}
                    </p>
                    {item.pendingLabel ? (
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        <span className="font-medium text-foreground/80">Pending: </span>
                        {item.pendingLabel}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[12px] text-[var(--ei-teal)]">
                      Recommend: {item.recommendation}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recommendations + Alerts */}
        <div className="space-y-6 xl:col-span-5">
          <section aria-label="CHANAKYA Recommendations" className="space-y-3">
            <SectionHeading
              icon={Brain}
              title="CHANAKYA Recommendations"
              subtitle="What should I do now? Advisory only — never auto-applies."
            />
            <ol className="space-y-2">
              {model.recommendations.map((rec) => (
                <li
                  key={rec.id}
                  className="rounded-xl border border-border/70 bg-background/70 px-4 py-3 shadow-[var(--ei-depth-1)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ei-gold)]">
                    {rec.rank === 1
                      ? "Highest priority"
                      : rec.rank === 2
                        ? "Second priority"
                        : rec.rank === 3
                          ? "Third priority"
                          : `Priority ${rec.rank}`}
                  </p>
                  <p className="mt-1 text-sm font-medium">{rec.title}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">Reason: {rec.reason}</p>
                  <p className="mt-1 text-[12px] text-[var(--ei-teal)]">
                    Next: {rec.nextStep}
                  </p>
                  {rec.href ? (
                    <Link
                      href={rec.href}
                      className="mt-2 inline-block text-[12px] font-medium text-primary hover:underline"
                    >
                      Open context →
                    </Link>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          <section aria-label="CHANAKYA Alerts" className="space-y-3">
            <SectionHeading
              icon={Bell}
              title="CHANAKYA Alerts"
              subtitle="Foundation feed for proactive intelligence — in-app now; voice later."
            />
            {model.alerts.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  No active alerts derived from your desk right now.
                </CardContent>
              </Card>
            ) : (
              <ul className="space-y-2">
                {model.alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className={cn("rounded-xl border px-4 py-3", alertClass(alert.severity))}
                  >
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">{alert.detail}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Channels: {alert.channels.join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Nearing completion */}
      <section aria-label="Nearing Completion" className="space-y-3">
        <SectionHeading
          icon={TrendingUp}
          title="Nearing Completion"
          subtitle="Deals in Soft Approved · Final Approved · Closure WIP — intervene to accelerate."
        />
        {dealsLoading ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              Loading deal journey milestones…
            </CardContent>
          </Card>
        ) : model.nearingCompletion.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              No assigned deals currently in Soft Approved, Final Approved, or Closure WIP.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {model.nearingCompletion.map((item) => (
              <Link
                key={item.id}
                href={item.href || ROUTES.MY_DEALS}
                className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 transition-colors hover:bg-emerald-500/10"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  {item.milestoneLabel}
                </p>
                <p className="mt-1 truncate text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                  {item.product} · {item.lender}
                </p>
                <p className="mt-1 text-[12px] tabular-nums text-muted-foreground">
                  {item.amountLabel} · {item.stageLabel}
                </p>
                <p className="mt-2 text-[12px] text-[var(--ei-teal)]">{item.interventionHint}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Business Intelligence */}
      <section aria-label="Business Intelligence" className="space-y-3">
        <SectionHeading
          icon={TrendingUp}
          title="Business Intelligence"
          subtitle="Sourced signals only — EBI / RM productivity. No demo metrics."
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {model.businessIntelligence.map((signal) => (
            <Card key={signal.id} className="bg-background/70 shadow-[var(--ei-depth-1)]">
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">{signal.label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--ei-ink)]">
                  {signal.valueLabel}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{signal.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Document intelligence — reserved */}
      <section aria-label="Transaction and Document Intelligence" className="space-y-3">
        <SectionHeading
          icon={FileText}
          title="Transaction & Document Intelligence"
          subtitle="Document Center → EDIE → structured facts → CHANAKYA. No direct file exposure."
        />
        <Card className="border-dashed border-border/80 bg-muted/15">
          <CardContent className="space-y-3 p-4 md:p-5">
            <p className="text-sm text-[var(--ei-ink-soft)]">
              {model.documentIntelligence.summary}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {model.documentIntelligence.permittedContext.map((ctx) => (
                <span
                  key={ctx}
                  className="rounded-md border border-border/60 bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {ctx}
                </span>
              ))}
            </div>
            <p className="text-[11px] font-medium text-muted-foreground">
              Financial document families (future analysis):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {model.documentIntelligence.documentFamilies.map((fam) => (
                <span
                  key={fam}
                  className="rounded-md bg-[var(--ei-teal)]/8 px-2 py-0.5 text-[11px] text-[var(--ei-teal)]"
                >
                  {fam}
                </span>
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground">
              {model.documentIntelligence.gapNote}
            </p>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href={buildDashboardHref(ROUTES.DOCUMENT_CENTER)}>
                Open Document Center
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
