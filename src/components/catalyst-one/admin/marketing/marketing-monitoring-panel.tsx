"use client";

/**
 * CO-MARKETING-REDESIGN-010 — Durable monitoring grid + recipient explorer.
 * Shows Unavailable / Not connected. Masks recipient PII. No invented metrics.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { MARKETING_MONITORING_LABELS } from "@/constants/enterprise-marketing-engine/monitoring";
import { formatMarketingMetricValue } from "@/lib/enterprise-marketing-engine/home-overview";
import type { MarketingMetricValue } from "@/types/enterprise-marketing-analytics";
import type {
  MarketingMonitoringDashboard,
  MarketingMonitoringMetricKey,
  MarketingRecipientExplorerPage,
} from "@/types/enterprise-marketing-monitoring";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

function MetricFace(props: { label: string; metric: MarketingMetricValue }) {
  const unavailable = props.metric.availability !== "available" || props.metric.value == null;
  return (
    <div className="rounded-md border border-border/70 bg-card px-2.5 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{props.label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${unavailable ? "text-muted-foreground" : "text-foreground"}`}>
        {formatMarketingMetricValue(props.metric)}
      </p>
      {props.metric.reason && unavailable ? (
        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">{props.metric.reason}</p>
      ) : null}
      {props.metric.availability === "ingested" && props.metric.reason ? (
        <p className="mt-0.5 text-[10px] text-amber-700 dark:text-amber-400">{props.metric.reason}</p>
      ) : null}
    </div>
  );
}

export function MarketingMonitoringPanel(props: { campaignId?: string | null }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<MarketingMonitoringDashboard | null>(null);
  const [recipients, setRecipients] = useState<MarketingRecipientExplorerPage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (props.campaignId?.trim()) params.set("campaignId", props.campaignId.trim());
    const qs = params.toString();
    const suffix = qs ? `&${qs}` : "";
    try {
      const [monitorRes, recipientRes] = await Promise.all([
        authenticatedJsonFetch(`/api/admin/marketing/analytics?view=monitoring${suffix}`),
        authenticatedJsonFetch(`/api/admin/marketing/analytics?view=recipients${suffix}`),
      ]);
      const monitorBody = (await monitorRes.json()) as ApiEnvelope<MarketingMonitoringDashboard>;
      const recipientBody = (await recipientRes.json()) as ApiEnvelope<MarketingRecipientExplorerPage>;
      if (!monitorRes.ok || !monitorBody.success || !monitorBody.data) {
        throw new Error(monitorBody.error?.message ?? "Failed to load monitoring");
      }
      setDashboard(monitorBody.data);
      if (recipientRes.ok && recipientBody.success && recipientBody.data) {
        setRecipients(recipientBody.data);
      } else {
        setRecipients(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load monitoring");
    } finally {
      setLoading(false);
    }
  }, [props.campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  const keys = Object.keys(MARKETING_MONITORING_LABELS) as MarketingMonitoringMetricKey[];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Durable monitoring</CardTitle>
              <CardDescription>
                Source, snapshot, ledger, and qualification counts from durable records. Provider
                events stay Unavailable or Not connected until a provider is connected.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {dashboard ? (
            <>
              <p className="text-xs text-muted-foreground">{dashboard.notice}</p>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                {keys.map((key) => (
                  <MetricFace key={key} label={MARKETING_MONITORING_LABELS[key]} metric={dashboard.metrics[key]} />
                ))}
              </div>
            </>
          ) : loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading monitoring…
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            Recipient explorer
          </CardTitle>
          <CardDescription>
            Organisation-scoped snapshot recipients with masked identity. Raw email and phone are
            never shown. ANALYTICS_VIEW is required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recipients && !recipients.durableAvailable ? (
            <p className="text-sm text-muted-foreground">{recipients.notice}</p>
          ) : null}
          {recipients && recipients.durableAvailable && recipients.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No snapshotted recipients in this organisation.</p>
          ) : null}
          {recipients && recipients.rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Email</th>
                    <th className="px-2 py-1.5 font-medium">Fingerprint</th>
                    <th className="px-2 py-1.5 font-medium">Status</th>
                    <th className="px-2 py-1.5 font-medium">Batch</th>
                    <th className="px-2 py-1.5 font-medium">Row</th>
                    <th className="px-2 py-1.5 font-medium">Contact</th>
                    <th className="px-2 py-1.5 font-medium">Opportunity</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.rows.map((row) => (
                    <tr key={row.id} className="border-t border-border/60">
                      <td className="px-2 py-1.5 font-mono text-xs">{row.emailPreview}</td>
                      <td className="px-2 py-1.5 font-mono text-xs">{row.fingerprintPreview}</td>
                      <td className="px-2 py-1.5">{row.status}</td>
                      <td className="px-2 py-1.5 tabular-nums">{row.batchNumber ?? "—"}</td>
                      <td className="px-2 py-1.5 tabular-nums">{row.sourceRowNumber ?? "—"}</td>
                      <td className="px-2 py-1.5">{row.linkedContact ? "Linked" : "—"}</td>
                      <td className="px-2 py-1.5">{row.linkedOpportunity ? "Linked" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">
                {recipients.total} recipient{recipients.total === 1 ? "" : "s"} · page {recipients.page}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
