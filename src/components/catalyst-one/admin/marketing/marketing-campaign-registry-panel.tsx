"use client";

/**
 * CO-MARKETING-REDESIGN-005 — Campaign Registry (separate from Campaign Builder).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  MARKETING_CAMPAIGN_REGISTRY_STATUSES,
  MARKETING_CAMPAIGN_STATUS_LABELS,
  MARKETING_CHANNELS,
  MARKETING_PERMISSIONS,
  MARKETING_REGISTRY_PAGE_SIZE,
} from "@/constants/enterprise-marketing-engine";
import {
  MARKETING_REGISTRY_DATE_PRESETS,
  MARKETING_TEST_MODE_BANNER,
} from "@/constants/enterprise-marketing-engine/home-registry";
import { ROUTES } from "@/constants/routes";
import { marketingCampaignBuilderHref } from "@/constants/enterprise-marketing-engine/campaign-builder";
import {
  buildMarketingRegistryRows,
  defaultMarketingRegistryFilters,
  filterMarketingRegistryCampaigns,
  type MarketingRegistryFilters,
} from "@/lib/enterprise-marketing-engine/campaign-registry";
import { paginateMarketingCollection } from "@/lib/enterprise-marketing-engine/ux-pagination";
import { formatMarketingMetricValue } from "@/lib/enterprise-marketing-engine/home-overview";
import { hasMarketingPermission } from "@/lib/enterprise-marketing-engine/permissions";
import type { MarketingCampaign } from "@/types/enterprise-marketing-campaign";
import type { MarketingAudienceDefinition } from "@/types/enterprise-marketing-audience";
import type { MarketingAnalyticsDashboard } from "@/types/enterprise-marketing-analytics";
import type { MarketingCampaignStatus, MarketingChannel } from "@/constants/enterprise-marketing-engine";
import { MarketingModuleNav } from "./marketing-module-nav";
import { MarketingUxPagination } from "./marketing-ux-pagination";
import { toast } from "sonner";
import "@/styles/marketing-command-centre.css";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

const ACTOR = { role: "ADMIN" as const };

export function MarketingCampaignRegistryPanel() {
  const searchParams = useSearchParams();
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [audiences, setAudiences] = useState<MarketingAudienceDefinition[]>([]);
  const [analytics, setAnalytics] = useState<MarketingAnalyticsDashboard | null>(null);
  const [filters, setFilters] = useState<MarketingRegistryFilters>(() => {
    const status = searchParams.get("status");
    const base = defaultMarketingRegistryFilters();
    if (status && (MARKETING_CAMPAIGN_REGISTRY_STATUSES as readonly string[]).includes(status)) {
      return { ...base, status: status as MarketingCampaignStatus };
    }
    return base;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const canCreate = hasMarketingPermission(ACTOR, MARKETING_PERMISSIONS.CAMPAIGN_CREATE);
  const canFilterOwner = hasMarketingPermission(ACTOR, MARKETING_PERMISSIONS.COMMAND_CENTER);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [campRes, audRes, analyticsRes] = await Promise.all([
        authenticatedJsonFetch("/api/admin/marketing/campaigns"),
        authenticatedJsonFetch("/api/admin/marketing/audiences"),
        authenticatedJsonFetch("/api/admin/marketing/analytics"),
      ]);
      const campBody = (await campRes.json()) as ApiEnvelope<{ campaigns: MarketingCampaign[] }>;
      if (!campRes.ok || !campBody.success) {
        throw new Error(campBody.error?.message ?? "Failed to load campaigns");
      }
      setCampaigns(campBody.data?.campaigns ?? []);
      if (audRes.ok) {
        const audBody = (await audRes.json()) as ApiEnvelope<{ audiences: MarketingAudienceDefinition[] }>;
        setAudiences(audBody.data?.audiences ?? []);
      }
      if (analyticsRes.ok) {
        const analyticsBody = (await analyticsRes.json()) as ApiEnvelope<MarketingAnalyticsDashboard>;
        setAnalytics(analyticsBody.data ?? null);
      } else {
        setAnalytics(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Campaign Registry");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const filtered = useMemo(
    () => filterMarketingRegistryCampaigns(campaigns, filters),
    [campaigns, filters],
  );
  const rows = useMemo(
    () =>
      buildMarketingRegistryRows({
        campaigns: filtered,
        audiences,
        analyticsRows: analytics?.campaigns ?? null,
        actor: ACTOR,
        executionEnabled: ENTERPRISE_MARKETING_EXECUTION_ENABLED,
      }),
    [filtered, audiences, analytics],
  );
  const paged = useMemo(
    () => paginateMarketingCollection(rows, page, MARKETING_REGISTRY_PAGE_SIZE),
    [rows, page],
  );
  const owners = useMemo(() => {
    const ids = new Set(
      campaigns.map((row) => row.governance?.createdByUserId).filter((id): id is string => Boolean(id)),
    );
    return [...ids];
  }, [campaigns]);

  async function runLifecycle(campaignId: string, lifecycleAction: string) {
    setBusyId(campaignId);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "transition", campaignId, lifecycleAction }),
      });
      const body = (await res.json()) as ApiEnvelope<unknown>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message ?? "Action failed");
      }
      toast.success(`${lifecycleAction} recorded`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mkt-cc mkt-cc-page">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mkt-cc-kicker">Marketing · Registry</p>
          <h1 className="mkt-cc-title">Campaign Registry</h1>
          <p className="mt-1 max-w-2xl text-base text-muted-foreground">
            Scan and operate campaigns here. Authoring stays in Campaign Builder.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={ROUTES.ADMIN_MARKETING_CAMPAIGNS}>Open builder</Link>
          </Button>
          {canCreate ? (
            <Button asChild className="rounded-xl">
              <Link href={`${ROUTES.ADMIN_MARKETING_CAMPAIGNS}?create=1`}>
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                Create Campaign
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      <MarketingModuleNav activeId="registry" />

      {!ENTERPRISE_MARKETING_EXECUTION_ENABLED ? (
        <div className="mkt-cc-banner" role="status">
          {MARKETING_TEST_MODE_BANNER}
        </div>
      ) : null}

      <div className="mkt-cc-filters">
        <div className="space-y-1.5">
          <Label htmlFor="mkt-registry-search">Search</Label>
          <Input
            id="mkt-registry-search"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Name, channel, status"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mkt-registry-channel">Channel</Label>
          <Select
            value={filters.channel}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, channel: value as MarketingChannel | "all" }))
            }
          >
            <SelectTrigger id="mkt-registry-channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              {MARKETING_CHANNELS.map((channel) => (
                <SelectItem key={channel} value={channel}>
                  {channel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mkt-registry-status">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, status: value as MarketingCampaignStatus | "all" }))
            }
          >
            <SelectTrigger id="mkt-registry-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {MARKETING_CAMPAIGN_REGISTRY_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {MARKETING_CAMPAIGN_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canFilterOwner ? (
          <div className="space-y-1.5">
            <Label htmlFor="mkt-registry-owner">Owner</Label>
            <Select
              value={filters.ownerUserId}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, ownerUserId: value }))}
            >
              <SelectTrigger id="mkt-registry-owner">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                {owners.map((owner) => (
                  <SelectItem key={owner} value={owner}>
                    {owner}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Owner</Label>
            <p className="text-sm text-muted-foreground">Not authorised</p>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="mkt-registry-date">Updated</Label>
          <Select
            value={filters.datePreset}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                datePreset: value as MarketingRegistryFilters["datePreset"],
              }))
            }
          >
            <SelectTrigger id="mkt-registry-date">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MARKETING_REGISTRY_DATE_PRESETS.map((preset) => (
                <SelectItem key={preset} value={preset}>
                  {preset === "all" ? "Any date" : `Last ${preset}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading Campaign Registry…
        </p>
      ) : error ? (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <section className="mkt-cc-panel text-center">
          <h2 className="text-lg font-semibold">No campaigns match</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a campaign in the builder, or clear filters to see the full registry.
          </p>
        </section>
      ) : (
        <ul className="space-y-3" aria-label="Campaign registry">
          {paged.slice.map((row) => (
            <li key={row.campaign.id} className="mkt-cc-registry-row">
              <div>
                <p className="text-lg font-semibold tracking-tight">{row.campaign.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {row.campaign.channel} ·{" "}
                  <span className="mkt-status-chip">
                    {MARKETING_CAMPAIGN_STATUS_LABELS[row.campaign.status]}
                  </span>{" "}
                  · {row.approvalStatus}
                </p>
                <p className="mt-2 text-sm">
                  Owner {row.campaign.governance?.createdByUserId ?? "Unavailable"}
                </p>
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Audience</dt>
                  <dd>
                    {row.audienceName ?? "Not selected"} · {formatMarketingMetricValue(row.audienceCount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Schedule</dt>
                  <dd>{row.scheduleLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Batch progress</dt>
                  <dd>{formatMarketingMetricValue(row.batchProgress)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Delivered / failed</dt>
                  <dd>
                    {formatMarketingMetricValue(row.delivered)} / {formatMarketingMetricValue(row.failed)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Open / click / reply</dt>
                  <dd>
                    {formatMarketingMetricValue(row.opened)} / {formatMarketingMetricValue(row.clicked)} /{" "}
                    {formatMarketingMetricValue(row.replied)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Qualified responses</dt>
                  <dd>{formatMarketingMetricValue(row.qualifiedResponses)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Created</dt>
                  <dd>{row.campaign.createdAt}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Updated</dt>
                  <dd>{row.campaign.updatedAt}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                {row.actions.map((action) => {
                  if (action.kind === "navigate") {
                    return (
                      <Button key={action.id} asChild variant="outline" size="sm" className="rounded-lg">
                        <Link href={marketingCampaignBuilderHref(row.campaign.id)}>
                          {action.label}
                        </Link>
                      </Button>
                    );
                  }
                  if (action.kind === "forbidden") {
                    return (
                      <Button
                        key={action.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        disabled
                        title={action.reason}
                        aria-label={action.reason}
                      >
                        {action.label}
                      </Button>
                    );
                  }
                  return (
                    <Button
                      key={action.id}
                      type="button"
                      variant={action.id === "stop" ? "destructive" : "secondary"}
                      size="sm"
                      className="rounded-lg"
                      disabled={busyId === row.campaign.id}
                      onClick={() => void runLifecycle(row.campaign.id, action.lifecycleAction ?? "")}
                    >
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 0 ? (
        <MarketingUxPagination
          page={paged.page}
          totalPages={paged.totalPages}
          total={paged.total}
          label="Campaign registry pages"
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
