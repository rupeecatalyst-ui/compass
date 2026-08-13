"use client";

/**
 * CO-MARKETING-MKT-10 — Marketing Analytics dashboard.
 * Derives from execution/engagement records. No audience-row mirror. No invented metrics.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  ENTERPRISE_MARKETING_SAFETY,
  MARKETING_ANALYTICS_DEFAULT_PRESET,
  MARKETING_ANALYTICS_RANGE_LABELS,
  MARKETING_CAMPAIGN_STATUS_LABELS,
  MARKETING_CHANNELS,
  type MarketingChannel,
} from "@/constants/enterprise-marketing-engine";
import { ROUTES } from "@/constants/routes";
import type {
  MarketingAnalyticsDashboard,
  MarketingAnalyticsRangePreset,
  MarketingExecutionDrilldownRow,
  MarketingMetricValue,
} from "@/types/enterprise-marketing-analytics";
import { MarketingModuleNav } from "./marketing-module-nav";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

function MetricCell(props: { label: string; metric: MarketingMetricValue }) {
  const { metric, label } = props;
  if (metric.availability === "unavailable") {
    return (
      <div className="rounded-md border border-dashed border-border/80 bg-muted/20 px-2.5 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-muted-foreground">Not available</p>
        {metric.reason ? (
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground/90">{metric.reason}</p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="rounded-md border border-border/70 bg-card px-2.5 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
        {metric.value ?? "—"}
      </p>
      {metric.availability === "ingested" && metric.reason ? (
        <p className="mt-0.5 text-[10px] text-amber-700 dark:text-amber-400">Ingested · {metric.reason}</p>
      ) : null}
    </div>
  );
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-IN");
}

export function MarketingAnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<MarketingAnalyticsDashboard | null>(null);
  const [preset, setPreset] = useState<MarketingAnalyticsRangePreset>(MARKETING_ANALYTICS_DEFAULT_PRESET);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [sourceDimension, setSourceDimension] = useState<string>("campaign");
  const [drillCampaignId, setDrillCampaignId] = useState<string | null>(null);
  const [drillRows, setDrillRows] = useState<MarketingExecutionDrilldownRow[]>([]);
  const [drillTotal, setDrillTotal] = useState(0);
  const [drillLoading, setDrillLoading] = useState(false);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("view", "dashboard");
    p.set("preset", preset);
    if (preset === "custom") {
      if (customFrom) p.set("from", new Date(customFrom).toISOString());
      if (customTo) p.set("to", new Date(customTo).toISOString());
    }
    if (campaignFilter !== "all") p.set("campaignId", campaignFilter);
    if (channelFilter !== "all") p.set("channel", channelFilter);
    return p;
  }, [preset, customFrom, customTo, campaignFilter, channelFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedJsonFetch(`/api/admin/marketing/analytics?${queryParams.toString()}`);
      const body = (await res.json()) as ApiEnvelope<MarketingAnalyticsDashboard>;
      if (!res.ok || !body.success || !body.data) {
        setError(body.error?.message ?? "Failed to load analytics");
        setDashboard(null);
      } else {
        setDashboard(body.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadDrilldown = useCallback(
    async (campaignId: string) => {
      setDrillCampaignId(campaignId);
      setDrillLoading(true);
      try {
        const p = new URLSearchParams(queryParams);
        p.set("view", "execution");
        p.set("campaignId", campaignId);
        p.set("page", "1");
        p.set("pageSize", "25");
        const res = await authenticatedJsonFetch(`/api/admin/marketing/analytics?${p.toString()}`);
        const body = (await res.json()) as ApiEnvelope<{
          rows: MarketingExecutionDrilldownRow[];
          total: number;
        }>;
        if (!res.ok || !body.success || !body.data) {
          setDrillRows([]);
          setDrillTotal(0);
        } else {
          setDrillRows(body.data.rows);
          setDrillTotal(body.data.total);
        }
      } catch {
        setDrillRows([]);
        setDrillTotal(0);
      } finally {
        setDrillLoading(false);
      }
    },
    [queryParams],
  );

  const sourceRows = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.sourceAnalysis.filter((r) => r.dimension === sourceDimension);
  }, [dashboard, sourceDimension]);

  const cc = dashboard?.commandCenter;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Marketing Command Center · Analytics
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Campaign Analytics</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Acquisition intelligence from execution ledger and engagement events. External Sheets stay
            external — no audience mirror.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={ROUTES.ADMIN_MARKETING_ENGAGEMENT}>Engagement explorer</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <MarketingModuleNav activeId="analytics" />

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            Production safety
          </CardTitle>
          <CardDescription className="text-xs">
            {ENTERPRISE_MARKETING_SAFETY.notice} Live execution={String(ENTERPRISE_MARKETING_SAFETY.executionEnabled)};
            provider connect={String(ENTERPRISE_MARKETING_SAFETY.providerConnectEnabled)}.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs">Time range</Label>
            <Select
              value={preset}
              onValueChange={(v) => setPreset(v as MarketingAnalyticsRangePreset)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MARKETING_ANALYTICS_RANGE_LABELS) as MarketingAnalyticsRangePreset[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {MARKETING_ANALYTICS_RANGE_LABELS[key]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          {preset === "custom" ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">From</Label>
                <Input
                  type="datetime-local"
                  className="h-9"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To</Label>
                <Input
                  type="datetime-local"
                  className="h-9"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            </>
          ) : null}
          <div className="space-y-1.5">
            <Label className="text-xs">Campaign</Label>
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campaigns</SelectItem>
                {(dashboard?.campaigns ?? []).map((c) => (
                  <SelectItem key={c.campaignId} value={c.campaignId}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Channel</Label>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                {MARKETING_CHANNELS.map((ch: MarketingChannel) => (
                  <SelectItem key={ch} value={ch}>
                    {ch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {loading && !dashboard ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics…
        </div>
      ) : null}

      {cc ? (
        <>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCell label="Campaigns" metric={{ availability: "available", value: cc.campaigns, reason: null }} />
            <MetricCell label="Scheduled" metric={{ availability: "available", value: cc.scheduled, reason: null }} />
            <MetricCell label="Running" metric={{ availability: "available", value: cc.running, reason: null }} />
            <MetricCell label="Paused" metric={{ availability: "available", value: cc.paused, reason: null }} />
            <MetricCell label="Completed" metric={{ availability: "available", value: cc.completed, reason: null }} />
            <MetricCell
              label="Processed"
              metric={{ availability: "available", value: cc.recipientsProcessed, reason: null }}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <MetricCell label="Sent" metric={cc.sent} />
            <MetricCell label="Delivered" metric={cc.delivered} />
            <MetricCell label="Opened" metric={cc.opened} />
            <MetricCell label="Clicked" metric={cc.clicked} />
            <MetricCell label="Replied" metric={cc.replied} />
            <MetricCell label="Bounced" metric={cc.bounced} />
            <MetricCell label="Failed" metric={cc.failed} />
            <MetricCell label="Suppressed" metric={cc.suppression} />
            <MetricCell label="Unsubscribed" metric={cc.unsubscribed} />
            <MetricCell label="Qualified" metric={cc.qualifiedResponses} />
            <MetricCell label="Handed off" metric={cc.handoffOpportunities} />
            <MetricCell
              label="Audience estimate"
              metric={
                cc.audienceEstimate == null
                  ? {
                      availability: "unavailable",
                      value: null,
                      reason: "No external-source estimate for the current selection.",
                    }
                  : { availability: "available", value: cc.audienceEstimate, reason: null }
              }
            />
          </div>

          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-base">Funnel</CardTitle>
              <CardDescription className="text-xs">
                Unavailable stages stay marked — never invented zeros.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(dashboard?.funnel ?? []).map((stage, idx) => (
                  <div key={stage.id} className="flex items-center gap-2">
                    {idx > 0 ? <span className="text-muted-foreground">→</span> : null}
                    <div className="min-w-[7.5rem]">
                      <MetricCell label={stage.label} metric={stage.metric} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Campaign comparison</CardTitle>
                  <CardDescription className="text-xs">
                    Click a row for controlled execution drill-down (redacted fingerprints only).
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Campaign</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Channel</th>
                    <th className="px-2 py-2 font-medium">Audience est.</th>
                    <th className="px-2 py-2 font-medium">Processed</th>
                    <th className="px-2 py-2 font-medium">Progress</th>
                    <th className="px-2 py-2 font-medium">Sent</th>
                    <th className="px-2 py-2 font-medium">Failed</th>
                    <th className="px-2 py-2 font-medium">Suppressed</th>
                    <th className="px-2 py-2 font-medium">Qualified</th>
                    <th className="px-2 py-2 font-medium">Handoff</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard?.campaigns ?? []).map((row) => (
                    <tr
                      key={row.campaignId}
                      className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                      onClick={() => void loadDrilldown(row.campaignId)}
                    >
                      <td className="px-2 py-2 font-medium text-foreground">{row.name}</td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {MARKETING_CAMPAIGN_STATUS_LABELS[row.status] ?? row.status}
                      </td>
                      <td className="px-2 py-2">{row.channel}</td>
                      <td className="px-2 py-2 tabular-nums">{formatNumber(row.audienceEstimate)}</td>
                      <td className="px-2 py-2 tabular-nums">{formatNumber(row.recipientsProcessed)}</td>
                      <td className="px-2 py-2 tabular-nums">
                        {row.progressPercent == null ? "—" : `${row.progressPercent}%`}
                      </td>
                      <td className="px-2 py-2 tabular-nums">
                        {row.sent.availability === "unavailable" ? "N/A" : formatNumber(row.sent.value)}
                      </td>
                      <td className="px-2 py-2 tabular-nums">
                        {row.failed.availability === "unavailable" ? "N/A" : formatNumber(row.failed.value)}
                      </td>
                      <td className="px-2 py-2 tabular-nums">
                        {row.suppressed.availability === "unavailable"
                          ? "N/A"
                          : formatNumber(row.suppressed.value)}
                      </td>
                      <td className="px-2 py-2 tabular-nums">
                        {row.qualified.availability === "unavailable"
                          ? "N/A"
                          : formatNumber(row.qualified.value)}
                      </td>
                      <td className="px-2 py-2 tabular-nums">
                        {row.handoffOpportunities.availability === "unavailable"
                          ? "N/A"
                          : formatNumber(row.handoffOpportunities.value)}
                      </td>
                    </tr>
                  ))}
                  {(dashboard?.campaigns ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-2 py-6 text-center text-muted-foreground">
                        No campaigns in this selection.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">Source analysis</CardTitle>
                  <Select value={sourceDimension} onValueChange={setSourceDimension}>
                    <SelectTrigger className="h-8 w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="campaign">Campaign</SelectItem>
                      <SelectItem value="google_sheet">Google Sheet</SelectItem>
                      <SelectItem value="sheet_tab">Sheet / tab</SelectItem>
                      <SelectItem value="audience">Audience</SelectItem>
                      <SelectItem value="channel">Channel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <CardDescription className="text-xs">
                  Metadata dimensions only — source rows are not copied.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-2 font-medium">Label</th>
                      <th className="px-2 py-2 font-medium">Campaigns</th>
                      <th className="px-2 py-2 font-medium">Processed</th>
                      <th className="px-2 py-2 font-medium">Sent</th>
                      <th className="px-2 py-2 font-medium">Failed</th>
                      <th className="px-2 py-2 font-medium">Suppressed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceRows.map((row) => (
                      <tr key={`${row.dimension}:${row.key}`} className="border-b border-border/60">
                        <td className="px-2 py-2 font-medium">{row.label}</td>
                        <td className="px-2 py-2 tabular-nums">{row.campaignCount}</td>
                        <td className="px-2 py-2 tabular-nums">{row.recipientsProcessed}</td>
                        <td className="px-2 py-2 tabular-nums">{row.sent}</td>
                        <td className="px-2 py-2 tabular-nums">{row.failed}</td>
                        <td className="px-2 py-2 tabular-nums">{row.suppressed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-base">Channel analysis</CardTitle>
                <CardDescription className="text-xs">
                  Channel metrics only where events exist; unsupported stay Not available.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(dashboard?.channelAnalysis ?? []).map((ch) => (
                  <div key={ch.channel} className="rounded-md border border-border/70 p-3">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold">{ch.channel}</span>
                      <span className="text-xs text-muted-foreground">
                        mode={ch.mode} · campaigns={ch.campaignCount}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <MetricCell label="Processed" metric={{ availability: "available", value: ch.recipientsProcessed, reason: null }} />
                      <MetricCell label="Sent" metric={ch.sent} />
                      <MetricCell label="Delivered" metric={ch.delivered} />
                      <MetricCell label="Opened" metric={ch.opened} />
                      <MetricCell label="Failed" metric={ch.failed} />
                      <MetricCell label="Suppressed" metric={ch.suppressed} />
                    </div>
                  </div>
                ))}
                {(dashboard?.channelAnalysis ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No channel activity in range.</p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {drillCampaignId ? (
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-base">Execution drill-down</CardTitle>
                <CardDescription className="text-xs">
                  Campaign {drillCampaignId} · {drillTotal} ledger rows in range · redacted fingerprints only.
                  Not a Google Sheet browser.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {drillLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : (
                  <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-2 py-2 font-medium">Status</th>
                        <th className="px-2 py-2 font-medium">Channel</th>
                        <th className="px-2 py-2 font-medium">Fingerprint</th>
                        <th className="px-2 py-2 font-medium">Batch</th>
                        <th className="px-2 py-2 font-medium">Processed</th>
                        <th className="px-2 py-2 font-medium">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drillRows.map((row) => (
                        <tr key={row.id} className="border-b border-border/60">
                          <td className="px-2 py-2">{row.status}</td>
                          <td className="px-2 py-2">{row.channel}</td>
                          <td className="px-2 py-2 font-mono text-[11px]">{row.fingerprintPreview}</td>
                          <td className="px-2 py-2 font-mono text-[11px]">{row.batchId ?? "—"}</td>
                          <td className="px-2 py-2">{row.processedAt ?? "—"}</td>
                          <td className="px-2 py-2 text-muted-foreground">{row.lastError ?? "—"}</td>
                        </tr>
                      ))}
                      {drillRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-2 py-4 text-center text-muted-foreground">
                            No execution rows in this range.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          ) : null}

          {dashboard?.notice ? (
            <p className="text-[11px] text-muted-foreground">{dashboard.notice}</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
