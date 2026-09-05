"use client";

/**
 * CO-MARKETING-REDESIGN-015 — Campaign monitoring workspace.
 * Durable records only. Masked identities. Provider metrics show Unavailable when disconnected.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { ROUTES } from "@/constants/routes";
import {
  MARKETING_CAMPAIGN_MONITORING_LABELS,
  MARKETING_CAMPAIGN_RECIPIENT_PAGE_SIZE,
  MARKETING_MONITORING_NEXT_ACTION_LABELS,
  MARKETING_MONITORING_RETRY_FORBIDDEN_NOTICE,
  MARKETING_STATUS_NOT_COLOUR_ALONE,
} from "@/constants/enterprise-marketing-engine";
import { MARKETING_DURABLE_LEDGER_STATUSES } from "@/types/enterprise-marketing-durability";
import { formatMarketingMetricValue } from "@/lib/enterprise-marketing-engine/home-overview";
import type { MarketingMetricValue } from "@/types/enterprise-marketing-analytics";
import type {
  MarketingCampaignMonitoringMetricKey,
  MarketingCampaignMonitoringSummary,
  MarketingCampaignRecipientExplorerFilters,
  MarketingCampaignRecipientExplorerPage,
  MarketingCampaignRecipientExplorerRow,
  MarketingRecipientTimeline,
} from "@/types/enterprise-marketing-campaign-monitoring";
import { MarketingModuleNav } from "./marketing-module-nav";
import { MarketingUxPagination } from "./marketing-ux-pagination";
import { toast } from "sonner";
import "@/styles/marketing-command-centre.css";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

type CampaignOption = { id: string; name: string };

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

const EMPTY_FILTERS: MarketingCampaignRecipientExplorerFilters = {
  deliveryState: "all",
  batch: "all",
  attempt: "all",
  bounceCategory: "all",
  engagement: "all",
  suppression: "all",
  qualification: "all",
  from: null,
  to: null,
};

export function MarketingCampaignMonitoringWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [campaignId, setCampaignId] = useState<string>("all");
  const [summary, setSummary] = useState<MarketingCampaignMonitoringSummary | null>(null);
  const [explorer, setExplorer] = useState<MarketingCampaignRecipientExplorerPage | null>(null);
  const [filters, setFilters] = useState<MarketingCampaignRecipientExplorerFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<MarketingRecipientTimeline | null>(null);
  const [suppressionHistory, setSuppressionHistory] = useState<Array<{ id: string; kind: string; identityPreview?: string; auditTimestamp: string }>>([]);
  const [retryLedgerId, setRetryLedgerId] = useState<string | null>(null);
  const [retryPhrase, setRetryPhrase] = useState("");
  const [suppressReason, setSuppressReason] = useState("");
  const [page, setPage] = useState(1);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (campaignId !== "all") params.set("campaignId", campaignId);
    if (filters.deliveryState && filters.deliveryState !== "all") params.set("deliveryState", String(filters.deliveryState));
    if (filters.batch && filters.batch !== "all") params.set("batch", String(filters.batch));
    if (filters.attempt && filters.attempt !== "all") params.set("attempt", filters.attempt);
    if (filters.bounceCategory && filters.bounceCategory !== "all") params.set("bounceCategory", filters.bounceCategory);
    if (filters.engagement && filters.engagement !== "all") params.set("engagement", filters.engagement);
    if (filters.suppression && filters.suppression !== "all") params.set("suppression", filters.suppression);
    if (filters.qualification && filters.qualification !== "all") params.set("qualification", filters.qualification);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    params.set("page", String(page));
    params.set("pageSize", String(MARKETING_CAMPAIGN_RECIPIENT_PAGE_SIZE));
    return params;
  }, [campaignId, filters, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const campaignRes = await authenticatedJsonFetch("/api/admin/marketing/campaigns");
      const campaignBody = (await campaignRes.json()) as ApiEnvelope<{ campaigns: CampaignOption[] }>;
      if (campaignRes.ok && campaignBody.success) {
        setCampaigns(campaignBody.data?.campaigns ?? []);
      }
      const suffix = query.toString();
      const [summaryRes, recipientRes] = await Promise.all([
        authenticatedJsonFetch(`/api/admin/marketing/campaign-monitoring?view=summary${suffix ? `&${suffix}` : ""}`),
        authenticatedJsonFetch(`/api/admin/marketing/campaign-monitoring?view=recipients${suffix ? `&${suffix}` : ""}`),
      ]);
      const summaryBody = (await summaryRes.json()) as ApiEnvelope<MarketingCampaignMonitoringSummary>;
      const recipientBody = (await recipientRes.json()) as ApiEnvelope<MarketingCampaignRecipientExplorerPage>;
      if (!summaryRes.ok || !summaryBody.success || !summaryBody.data) {
        throw new Error(summaryBody.error?.message ?? "Failed to load campaign monitoring");
      }
      setSummary(summaryBody.data);
      setExplorer(recipientRes.ok && recipientBody.success ? recipientBody.data ?? null : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaign monitoring");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [campaignId, filters]);

  const openTimeline = useCallback(async (row: MarketingCampaignRecipientExplorerRow) => {
    setSelectedId(row.id);
    setTimeline(null);
    setSuppressionHistory([]);
    const res = await authenticatedJsonFetch(
      `/api/admin/marketing/campaign-monitoring?view=timeline&recipientId=${encodeURIComponent(row.id)}`,
    );
    const body = (await res.json()) as ApiEnvelope<MarketingRecipientTimeline>;
    if (res.ok && body.success && body.data) setTimeline(body.data);
  }, []);

  const retry = useCallback(
    async (row: MarketingCampaignRecipientExplorerRow) => {
      if (!row.ledgerId) return;
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaign-monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "retry",
          campaignId: row.campaignId,
          ledgerId: row.ledgerId,
          confirmed: true,
          confirmationPhrase: retryPhrase,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<{ actuallySent: false; retried: boolean }>;
      if (!res.ok || !body.success) {
        toast.error(body.error?.message ?? "Retry is not permitted");
        return;
      }
      toast.success("Retry claimed in TEST MODE. No message was sent.");
      setRetryLedgerId(null);
      setRetryPhrase("");
      await load();
    },
    [load, retryPhrase],
  );

  const suppress = useCallback(
    async (row: MarketingCampaignRecipientExplorerRow) => {
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaign-monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suppress",
          recipientId: row.id,
          reason: suppressReason,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<unknown>;
      if (!res.ok || !body.success) {
        toast.error(body.error?.message ?? "Suppression failed");
        return;
      }
      toast.success("Recipient suppressed");
      setSuppressReason("");
      await load();
    },
    [load, suppressReason],
  );

  const viewHistory = useCallback(async (row: MarketingCampaignRecipientExplorerRow) => {
    const res = await authenticatedJsonFetch(
      `/api/admin/marketing/campaign-monitoring?view=suppression-history&recipientId=${encodeURIComponent(row.id)}`,
    );
    const body = (await res.json()) as ApiEnvelope<{ history: Array<{ id: string; kind: string; identityPreview?: string; auditTimestamp: string }> }>;
    if (!res.ok || !body.success) {
      toast.error(body.error?.message ?? "Suppression history unavailable");
      return;
    }
    setSelectedId(row.id);
    setSuppressionHistory(body.data?.history ?? []);
  }, []);

  const openQualification = useCallback(async (row: MarketingCampaignRecipientExplorerRow) => {
    if (!row.qualificationId) {
      toast.error("Qualification record unavailable");
      return;
    }
    const res = await authenticatedJsonFetch("/api/admin/marketing/campaign-monitoring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "open_qualification", qualificationId: row.qualificationId }),
    });
    const body = (await res.json()) as ApiEnvelope<{ available: boolean; href?: string | null; reason?: string | null }>;
    if (!res.ok || !body.success || !body.data?.available || !body.data.href) {
      toast.error(body.data?.reason ?? body.error?.message ?? "Unavailable");
      return;
    }
    window.location.assign(body.data.href);
  }, []);

  const keys = Object.keys(MARKETING_CAMPAIGN_MONITORING_LABELS) as MarketingCampaignMonitoringMetricKey[];
  const selectedRow = explorer?.rows.find((row) => row.id === selectedId) ?? null;
  const explorerTotalPages = explorer
    ? Math.max(1, Math.ceil(explorer.total / Math.max(1, explorer.pageSize)))
    : 1;

  function activateRecipientRow(row: MarketingCampaignRecipientExplorerRow) {
    void openTimeline(row);
  }

  return (
    <div className="mkt-cc flex flex-col gap-4 p-4">
      <MarketingModuleNav activeId="monitoring" />
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Campaign monitoring</CardTitle>
              <CardDescription>
                Recipient-level delivery and engagement from durable operational records. Raw email and phone are
                never shown. Provider metrics stay Unavailable until a provider is connected.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] space-y-1.5">
              <Label htmlFor="mkt-mon-campaign">Campaign</Label>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger id="mkt-mon-campaign" className="h-8">
                  <SelectValue placeholder="All campaigns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All campaigns</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {summary ? (
            <>
              <p className="text-xs text-muted-foreground">{summary.notice}</p>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5">
                {keys.map((key) => (
                  <MetricFace key={key} label={MARKETING_CAMPAIGN_MONITORING_LABELS[key]} metric={summary.metrics[key]} />
                ))}
              </div>
            </>
          ) : loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading campaign summary…
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
            Authorised filters over durable ledger, bounce, engagement, suppression, and qualification
            records. Identities stay masked.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="space-y-1">
              <Label htmlFor="mkt-mon-delivery">Delivery</Label>
              <Select
                value={String(filters.deliveryState ?? "all")}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    deliveryState: value as MarketingCampaignRecipientExplorerFilters["deliveryState"],
                  }))
                }
              >
                <SelectTrigger id="mkt-mon-delivery" className="h-8 w-[140px]">
                  <SelectValue placeholder="Delivery" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  <SelectItem value="snapshotted">snapshotted</SelectItem>
                  {MARKETING_DURABLE_LEDGER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mkt-mon-batch">Batch</Label>
              <Input
                id="mkt-mon-batch"
                type="number"
                min={1}
                className="h-8 w-[110px]"
                placeholder="Batch"
                value={filters.batch && filters.batch !== "all" ? String(filters.batch) : ""}
                onChange={(event) => {
                  const value = event.target.value.trim();
                  setFilters((prev) => ({
                    ...prev,
                    batch: value ? Number.parseInt(value, 10) : "all",
                  }));
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mkt-mon-attempt">Attempt</Label>
              <Select
                value={String(filters.attempt ?? "all")}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    attempt: value as MarketingCampaignRecipientExplorerFilters["attempt"],
                  }))
                }
              >
                <SelectTrigger id="mkt-mon-attempt" className="h-8 w-[140px]">
                  <SelectValue placeholder="Attempt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All attempts</SelectItem>
                  <SelectItem value="zero">Zero</SelectItem>
                  <SelectItem value="one_or_more">Attempted</SelectItem>
                  <SelectItem value="maxed">Maxed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mkt-mon-bounce">Bounce</Label>
              <Select
                value={String(filters.bounceCategory ?? "all")}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    bounceCategory: value as MarketingCampaignRecipientExplorerFilters["bounceCategory"],
                  }))
                }
              >
                <SelectTrigger id="mkt-mon-bounce" className="h-8 w-[140px]">
                  <SelectValue placeholder="Bounce" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All bounces</SelectItem>
                  <SelectItem value="soft">Soft</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mkt-mon-engagement">Engagement</Label>
              <Select
                value={String(filters.engagement ?? "all")}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    engagement: value as MarketingCampaignRecipientExplorerFilters["engagement"],
                  }))
                }
              >
                <SelectTrigger id="mkt-mon-engagement" className="h-8 w-[140px]">
                  <SelectValue placeholder="Engagement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All engagement</SelectItem>
                  <SelectItem value="opened">Opened</SelectItem>
                  <SelectItem value="clicked">Clicked</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mkt-mon-suppression">Suppression</Label>
              <Select
                value={String(filters.suppression ?? "all")}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    suppression: value as MarketingCampaignRecipientExplorerFilters["suppression"],
                  }))
                }
              >
                <SelectTrigger id="mkt-mon-suppression" className="h-8 w-[140px]">
                  <SelectValue placeholder="Suppression" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All suppression</SelectItem>
                  <SelectItem value="yes">Suppressed</SelectItem>
                  <SelectItem value="no">Not suppressed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mkt-mon-qualification">Qualification</Label>
              <Select
                value={String(filters.qualification ?? "all")}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    qualification: value as MarketingCampaignRecipientExplorerFilters["qualification"],
                  }))
                }
              >
                <SelectTrigger id="mkt-mon-qualification" className="h-8 w-[150px]">
                  <SelectValue placeholder="Qualification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All qualification</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="not_qualified">Not qualified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mkt-mon-from">From</Label>
              <Input
                id="mkt-mon-from"
                type="datetime-local"
                className="h-8 w-[190px]"
                value={filters.from?.slice(0, 16) ?? ""}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    from: event.target.value ? new Date(event.target.value).toISOString() : null,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mkt-mon-to">To</Label>
              <Input
                id="mkt-mon-to"
                type="datetime-local"
                className="h-8 w-[190px]"
                value={filters.to?.slice(0, 16) ?? ""}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    to: event.target.value ? new Date(event.target.value).toISOString() : null,
                  }))
                }
              />
            </div>
          </div>

          {explorer && !explorer.durableAvailable ? (
            <p className="text-sm text-muted-foreground">{explorer.notice}</p>
          ) : null}
          {explorer && explorer.durableAvailable && explorer.total === 0 ? (
            <p className="text-sm text-muted-foreground">No durable recipients match these filters.</p>
          ) : null}
          {explorer && explorer.rows.length > 0 ? (
            <>
            <ul className="mkt-recipient-cards">
              {explorer.rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="mkt-consent-row w-full text-left"
                    aria-pressed={selectedId === row.id}
                    onClick={() => activateRecipientRow(row)}
                  >
                    <p className="font-mono text-xs">{row.identityPreview}</p>
                    <p className="mt-1 text-sm">
                      <span className="mkt-status-chip">{row.status}</span>
                      {" · "}
                      {MARKETING_MONITORING_NEXT_ACTION_LABELS[row.nextPermittedAction]}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Batch {row.batchNumber ?? "—"} · Attempts {row.attemptCount} · {row.failureCategory}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mkt-recipient-table-wrap">
              <table className="w-full min-w-[960px] text-left text-sm">
                <caption className="sr-only">
                  Masked recipient delivery records. {MARKETING_STATUS_NOT_COLOUR_ALONE}
                </caption>
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 font-medium" scope="col">Identity</th>
                    <th className="px-2 py-1.5 font-medium" scope="col">Source key</th>
                    <th className="px-2 py-1.5 font-medium" scope="col">Batch</th>
                    <th className="px-2 py-1.5 font-medium" scope="col">Status</th>
                    <th className="px-2 py-1.5 font-medium" scope="col">Latest event</th>
                    <th className="px-2 py-1.5 font-medium" scope="col">Attempts</th>
                    <th className="px-2 py-1.5 font-medium" scope="col">Failure</th>
                    <th className="px-2 py-1.5 font-medium" scope="col">Next action</th>
                  </tr>
                </thead>
                <tbody>
                  {explorer.rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`cursor-pointer border-t border-border/60 ${selectedId === row.id ? "bg-muted/40" : ""}`}
                      tabIndex={0}
                      aria-selected={selectedId === row.id}
                      onClick={() => activateRecipientRow(row)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          activateRecipientRow(row);
                        }
                      }}
                    >
                      <td className="px-2 py-1.5 font-mono text-xs">{row.identityPreview}</td>
                      <td className="px-2 py-1.5 font-mono text-xs">{row.sourceKey}</td>
                      <td className="px-2 py-1.5 tabular-nums">{row.batchNumber ?? "—"}</td>
                      <td className="px-2 py-1.5">
                        <span className="mkt-status-chip">{row.status}</span>
                      </td>
                      <td className="px-2 py-1.5">{row.latestEvent ?? "—"}</td>
                      <td className="px-2 py-1.5 tabular-nums">{row.attemptCount}</td>
                      <td className="px-2 py-1.5">{row.failureCategory}</td>
                      <td className="px-2 py-1.5">{MARKETING_MONITORING_NEXT_ACTION_LABELS[row.nextPermittedAction]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <MarketingUxPagination
              page={explorer.page}
              totalPages={explorerTotalPages}
              total={explorer.total}
              label="Recipient explorer pages"
              onPageChange={setPage}
            />
            </>
          ) : null}
        </CardContent>
      </Card>

      {selectedRow ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recipient timeline</CardTitle>
            <CardDescription>
              Chronological durable events for {selectedRow.identityPreview}. Source key {selectedRow.sourceKey}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[11px] text-muted-foreground">{MARKETING_MONITORING_RETRY_FORBIDDEN_NOTICE}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!summary?.capabilities.retry || !selectedRow.allowedActions.includes("retry")}
                title={selectedRow.retryBlockedReason ?? undefined}
                onClick={() => setRetryLedgerId(selectedRow.ledgerId)}
              >
                Retry eligible failure
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!summary?.capabilities.suppress || !selectedRow.allowedActions.includes("suppress")}
                onClick={() => void suppress(selectedRow)}
              >
                Suppress recipient
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!summary?.capabilities.viewSuppression}
                onClick={() => void viewHistory(selectedRow)}
              >
                View suppression history
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!summary?.capabilities.openQualification || !selectedRow.qualificationId}
                onClick={() => void openQualification(selectedRow)}
              >
                Open qualification record
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <a href={ROUTES.ADMIN_MARKETING_RESPONSES}>Responses</a>
              </Button>
            </div>
            {retryLedgerId && retryLedgerId === selectedRow.ledgerId ? (
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <Label htmlFor="mkt-mon-retry" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Type RETRY
                  </Label>
                  <Input
                    id="mkt-mon-retry"
                    className="h-8 w-[160px]"
                    value={retryPhrase}
                    onChange={(event) => setRetryPhrase(event.target.value)}
                  />
                </div>
                <Button size="sm" onClick={() => void retry(selectedRow)}>Confirm retry</Button>
              </div>
            ) : null}
            {selectedRow.allowedActions.includes("suppress") ? (
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <Label htmlFor="mkt-mon-suppress" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Suppression reason
                  </Label>
                  <Input
                    id="mkt-mon-suppress"
                    className="h-8 w-[240px]"
                    value={suppressReason}
                    onChange={(event) => setSuppressReason(event.target.value)}
                  />
                </div>
              </div>
            ) : null}
            {timeline ? (
              <ol className="space-y-2">
                {timeline.events.map((event) => (
                  <li key={event.id} className="rounded-md border border-border/70 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {event.source} · {event.occurredAt}
                    </p>
                    <p className="text-sm font-medium">{event.type}</p>
                    <p className="text-xs text-muted-foreground">{event.summary}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">Select a recipient to load the timeline.</p>
            )}
            {suppressionHistory.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-medium">Suppression history</p>
                <ul className="space-y-1 text-xs">
                  {suppressionHistory.map((row) => (
                    <li key={row.id}>
                      {row.kind} · {row.identityPreview ?? "masked"} · {row.auditTimestamp}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
