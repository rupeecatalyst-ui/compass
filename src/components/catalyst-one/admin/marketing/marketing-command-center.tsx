"use client";

/**
 * CO-MARKETING-REDESIGN-005 — Marketing Home command centre.
 * Premium dark Catalyst One overview. Honest metrics. TEST MODE while live send is off.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Megaphone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  ENTERPRISE_MARKETING_ENGINE_NAME,
  ENTERPRISE_MARKETING_MODULE_TITLE,
  MARKETING_PERMISSIONS,
} from "@/constants/enterprise-marketing-engine";
import { MARKETING_HOME_OUTCOME_CARDS } from "@/constants/enterprise-marketing-engine/home-registry";
import { ROUTES } from "@/constants/routes";
import {
  composeMarketingHomeOverview,
  formatMarketingMetricValue,
  type MarketingHomeOverview,
} from "@/lib/enterprise-marketing-engine/home-overview";
import { hasMarketingPermission } from "@/lib/enterprise-marketing-engine/permissions";
import type { EnterpriseMarketingFoundationStatus } from "@/types/enterprise-marketing-engine";
import type { MarketingCampaign } from "@/types/enterprise-marketing-campaign";
import type { MarketingAnalyticsDashboard } from "@/types/enterprise-marketing-analytics";
import type { MarketingQualificationRecord } from "@/types/enterprise-marketing-qualification";
import { MarketingModuleNav } from "./marketing-module-nav";
import "@/styles/marketing-command-centre.css";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

function MetricFace({ label, metric }: { label: string; metric: MarketingHomeOverview["qualifiedResponses"] }) {
  const unavailable = metric.availability !== "available" || metric.value == null;
  return (
    <article className="mkt-cc-card" aria-label={label}>
      <p className="mkt-cc-card-label">{label}</p>
      <p className={unavailable ? "mkt-cc-card-value is-unavailable" : "mkt-cc-card-value"}>
        {formatMarketingMetricValue(metric)}
      </p>
    </article>
  );
}

export function MarketingCommandCenter() {
  const [status, setStatus] = useState<EnterpriseMarketingFoundationStatus | null>(null);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[] | null>(null);
  const [qualifications, setQualifications] = useState<MarketingQualificationRecord[] | null>(null);
  const [analytics, setAnalytics] = useState<MarketingAnalyticsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const canCreate = hasMarketingPermission({ role: "ADMIN" }, MARKETING_PERMISSIONS.CAMPAIGN_CREATE);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statusRes, campRes, qualRes, analyticsRes] = await Promise.all([
          authenticatedJsonFetch("/api/admin/marketing"),
          authenticatedJsonFetch("/api/admin/marketing/campaigns"),
          authenticatedJsonFetch("/api/admin/marketing/qualifications"),
          authenticatedJsonFetch("/api/admin/marketing/analytics"),
        ]);
        if (cancelled) return;
        const statusBody = (await statusRes.json()) as ApiEnvelope<EnterpriseMarketingFoundationStatus>;
        if (!statusRes.ok || !statusBody.success || !statusBody.data) {
          setError(statusBody.error?.message ?? "Failed to load Marketing foundation status");
        } else {
          setStatus(statusBody.data);
        }
        if (campRes.ok) {
          const campBody = (await campRes.json()) as ApiEnvelope<{ campaigns: MarketingCampaign[] }>;
          setCampaigns(campBody.data?.campaigns ?? []);
        } else {
          setCampaigns([]);
        }
        if (qualRes.ok) {
          const qualBody = (await qualRes.json()) as ApiEnvelope<{
            qualifications?: MarketingQualificationRecord[];
            items?: MarketingQualificationRecord[];
          } | MarketingQualificationRecord[]>;
          const payload = qualBody.data;
          const list = Array.isArray(payload)
            ? payload
            : payload?.qualifications ?? payload?.items ?? null;
          setQualifications(list);
        } else {
          setQualifications(null);
        }
        if (analyticsRes.ok) {
          const analyticsBody = (await analyticsRes.json()) as ApiEnvelope<MarketingAnalyticsDashboard>;
          setAnalytics(analyticsBody.data ?? null);
        } else {
          setAnalytics(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load Marketing Command Center");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const overview = useMemo(() => {
    if (!status) return null;
    return composeMarketingHomeOverview({
      campaigns: campaigns ?? [],
      qualifications,
      analytics,
      safety: {
        executionEnabled: status.safety.executionEnabled,
        providerConnectEnabled: status.safety.providerConnectEnabled,
        sheetsMode: status.safety.sheetsMode,
        handoffEnabled: status.safety.handoffEnabled,
      },
    });
  }, [status, campaigns, qualifications, analytics]);

  return (
    <div className="mkt-cc mkt-cc-page">
      <header className="space-y-3">
        <p className="mkt-cc-kicker">Administration · {ENTERPRISE_MARKETING_ENGINE_NAME}</p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <Megaphone className="mt-1 h-8 w-8 shrink-0 text-primary" aria-hidden />
            <div>
              <h1 className="mkt-cc-title">{ENTERPRISE_MARKETING_MODULE_TITLE}</h1>
              <p className="mt-1 max-w-2xl text-base text-muted-foreground">
                Operating overview for acquisition campaigns. Metrics appear only from durable records.
              </p>
            </div>
          </div>
          {canCreate ? (
            <Button asChild size="lg" className="rounded-xl px-5">
              <Link href={`${ROUTES.ADMIN_MARKETING_CAMPAIGNS}?create=1`}>
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                Create Campaign
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      <MarketingModuleNav activeId="home" />

      {overview?.testMode ? (
        <div className="mkt-cc-banner" role="status">
          {overview.testModeBanner}
        </div>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading Marketing Command Center…
        </p>
      ) : error ? (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      ) : overview ? (
        <>
          <section aria-label="Campaign lifecycle" className="mkt-cc-grid">
            {overview.lifecycleCards.map((card) => (
              <MetricFace key={card.id} label={card.label} metric={card.metric} />
            ))}
            <MetricFace
              label={MARKETING_HOME_OUTCOME_CARDS[0].label}
              metric={overview.qualifiedResponses}
            />
            <MetricFace
              label={MARKETING_HOME_OUTCOME_CARDS[1].label}
              metric={overview.opportunitiesCreated}
            />
            <MetricFace
              label={MARKETING_HOME_OUTCOME_CARDS[2].label}
              metric={overview.attributedPipeline}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="mkt-cc-panel" aria-labelledby="mkt-attention">
              <h2 id="mkt-attention" className="text-lg font-semibold tracking-tight">
                Campaigns requiring attention
              </h2>
              {overview.requiringAttention.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nothing needs attention right now.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {overview.requiringAttention.map((campaign) => (
                    <li key={campaign.id}>
                      <Link
                        className="flex justify-between gap-3 rounded-lg px-2 py-2 hover:bg-accent hover:text-accent-foreground"
                        href={`${ROUTES.ADMIN_MARKETING_REGISTRY}?status=${campaign.status}`}
                      >
                        <span className="font-medium">{campaign.name}</span>
                        <span className="text-sm text-muted-foreground">{campaign.status}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mkt-cc-panel" aria-labelledby="mkt-activity">
              <h2 id="mkt-activity" className="text-lg font-semibold tracking-tight">
                Recent campaign activity
              </h2>
              {overview.recentActivity.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No durable activity recorded yet.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {overview.recentActivity.map((event) => (
                    <li key={`${event.campaignId}-${event.at}-${event.action}`} className="flex flex-col gap-0.5">
                      <span className="font-medium">{event.campaignName}</span>
                      <span className="text-muted-foreground">
                        {event.action} · {event.from} → {event.to}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="mkt-cc-panel" aria-labelledby="mkt-health">
              <h2 id="mkt-health" className="text-lg font-semibold tracking-tight">
                Delivery health
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Sent</dt>
                  <dd className="text-lg font-semibold">{formatMarketingMetricValue(overview.deliveryHealth.sent)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Failed</dt>
                  <dd className="text-lg font-semibold">{formatMarketingMetricValue(overview.deliveryHealth.failed)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Delivered</dt>
                  <dd className="text-lg font-semibold">
                    {formatMarketingMetricValue(overview.deliveryHealth.delivered)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="mkt-cc-panel" aria-labelledby="mkt-config">
              <h2 id="mkt-config" className="text-lg font-semibold tracking-tight">
                Provider and Google configuration
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email / WhatsApp provider</dt>
                  <dd className="mt-1 font-semibold">{overview.providerStatus}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Google Sheets</dt>
                  <dd className="mt-1 font-semibold">{overview.googleStatus}</dd>
                </div>
              </dl>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
