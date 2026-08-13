"use client";

/**
 * CO-MARKETING-MKT-10 — Engagement event explorer.
 * Provider-neutral events from execution/engagement store. Redacted fingerprints only.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
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
  MARKETING_ANALYTICS_DEFAULT_PRESET,
  MARKETING_ANALYTICS_RANGE_LABELS,
  MARKETING_CHANNELS,
  MARKETING_ENGAGEMENT_EVENT_TYPES,
  type MarketingChannel,
} from "@/constants/enterprise-marketing-engine";
import { ROUTES } from "@/constants/routes";
import type {
  MarketingAnalyticsRangePreset,
  MarketingEngagementEventType,
  MarketingEngagementExplorerRow,
} from "@/types/enterprise-marketing-analytics";
import { MarketingModuleNav } from "./marketing-module-nav";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

export function MarketingEngagementPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MarketingEngagementExplorerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [preset, setPreset] = useState<MarketingAnalyticsRangePreset>(MARKETING_ANALYTICS_DEFAULT_PRESET);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [channel, setChannel] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [campaignId, setCampaignId] = useState("");

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("view", "engagement");
    p.set("preset", preset);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    if (preset === "custom") {
      if (customFrom) p.set("from", new Date(customFrom).toISOString());
      if (customTo) p.set("to", new Date(customTo).toISOString());
    }
    if (channel !== "all") p.set("channel", channel);
    if (type !== "all") p.set("type", type);
    if (campaignId.trim()) p.set("campaignId", campaignId.trim());
    return p;
  }, [preset, customFrom, customTo, channel, type, campaignId, page, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedJsonFetch(`/api/admin/marketing/analytics?${queryParams.toString()}`);
      const body = (await res.json()) as ApiEnvelope<{
        rows: MarketingEngagementExplorerRow[];
        total: number;
        page: number;
        pageSize: number;
      }>;
      if (!res.ok || !body.success || !body.data) {
        setError(body.error?.message ?? "Failed to load engagement events");
        setRows([]);
        setTotal(0);
      } else {
        setRows(body.data.rows);
        setTotal(body.data.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load engagement events");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Marketing Command Center · Engagement
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Engagement events</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Provider-neutral events with idempotent providerEventId. Fingerprints are redacted — not a
            contact directory and not a Google Sheet dump.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={ROUTES.ADMIN_MARKETING_ANALYTICS}>Analytics dashboard</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <MarketingModuleNav activeId="engagement" />

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs">Time range</Label>
            <Select
              value={preset}
              onValueChange={(v) => {
                setPage(1);
                setPreset(v as MarketingAnalyticsRangePreset);
              }}
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
                  onChange={(e) => {
                    setPage(1);
                    setCustomFrom(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To</Label>
                <Input
                  type="datetime-local"
                  className="h-9"
                  value={customTo}
                  onChange={(e) => {
                    setPage(1);
                    setCustomTo(e.target.value);
                  }}
                />
              </div>
            </>
          ) : null}
          <div className="space-y-1.5">
            <Label className="text-xs">Channel</Label>
            <Select
              value={channel}
              onValueChange={(v) => {
                setPage(1);
                setChannel(v);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {MARKETING_CHANNELS.map((ch: MarketingChannel) => (
                  <SelectItem key={ch} value={ch}>
                    {ch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Event type</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setPage(1);
                setType(v);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {MARKETING_ENGAGEMENT_EVENT_TYPES.map((t: MarketingEngagementEventType) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Campaign ID (optional)</Label>
            <Input
              className="h-9"
              placeholder="mkt-camp-…"
              value={campaignId}
              onChange={(e) => {
                setPage(1);
                setCampaignId(e.target.value);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-base">Events</CardTitle>
          <CardDescription className="text-xs">
            {total.toLocaleString("en-IN")} matching · page {page} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Occurred</th>
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 font-medium">Channel</th>
                  <th className="px-2 py-2 font-medium">Campaign</th>
                  <th className="px-2 py-2 font-medium">Fingerprint</th>
                  <th className="px-2 py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="px-2 py-2 whitespace-nowrap">{row.occurredAt}</td>
                    <td className="px-2 py-2 font-medium">{row.type}</td>
                    <td className="px-2 py-2">{row.channel}</td>
                    <td className="px-2 py-2">{row.campaignName}</td>
                    <td className="px-2 py-2 font-mono text-[11px]">{row.fingerprintPreview}</td>
                    <td className="px-2 py-2 text-muted-foreground">{row.errorCode ?? "—"}</td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-6 text-center text-muted-foreground">
                      No engagement events in this selection.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
