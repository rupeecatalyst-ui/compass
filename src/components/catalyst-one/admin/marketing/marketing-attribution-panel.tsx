"use client";

/**
 * CO-MARKETING-REDESIGN-017 — Campaign attribution dashboard.
 * Honest metrics from existing SSOT. Revenue is never Opportunity value.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  MARKETING_ATTRIBUTION_NOTICE,
  MARKETING_ATTRIBUTION_STAGE_LABELS,
} from "@/constants/enterprise-marketing-engine/attribution";
import { formatMarketingMetricValue } from "@/lib/enterprise-marketing-engine/home-overview";
import type { MarketingMetricValue } from "@/types/enterprise-marketing-analytics";
import type { MarketingAttributionDashboard } from "@/types/enterprise-marketing-attribution";
import { MarketingModuleNav } from "./marketing-module-nav";
import { toast } from "sonner";
import "@/styles/marketing-command-centre.css";

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
    </div>
  );
}

export function MarketingAttributionPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<MarketingAttributionDashboard | null>(null);
  const [campaignId, setCampaignId] = useState("");
  const [product, setProduct] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (campaignId.trim()) params.set("campaignId", campaignId.trim());
    if (product.trim()) params.set("product", product.trim());
    if (ownerUserId.trim()) params.set("ownerUserId", ownerUserId.trim());
    if (from.trim()) params.set("from", from.trim());
    if (to.trim()) params.set("to", to.trim());
    const qs = params.toString();
    const res = await authenticatedJsonFetch(`/api/admin/marketing/attribution${qs ? `?${qs}` : ""}`);
    const body = (await res.json()) as ApiEnvelope<MarketingAttributionDashboard>;
    if (!res.ok || !body.success || !body.data) {
      throw new Error(body.error?.message || "Failed to load attribution");
    }
    setDashboard(body.data);
  }, [campaignId, product, ownerUserId, from, to]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Load failed";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Analytics and Attribution
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Campaign attribution</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{MARKETING_ATTRIBUTION_NOTICE}</p>
      </header>

      <MarketingModuleNav activeId="attribution" />

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            Honest revenue
          </CardTitle>
          <CardDescription>
            Campaign → snapshot → recipient → qualified response → Contact → Opportunity → Deal →
            disbursal / revenue. Original campaign attribution is preserved after Contact matching.
            ROI shows Unavailable when cost or Accounting-confirmed revenue is missing.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Campaign, product, owner, and date. Empty fields mean all records.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="attr-campaign">Campaign</Label>
            <Input
              id="attr-campaign"
              className="w-48"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              placeholder="campaign id"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="attr-product">Product</Label>
            <Input
              id="attr-product"
              className="w-40"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="Home Loan"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="attr-owner">Owner</Label>
            <Input
              id="attr-owner"
              className="w-40"
              value={ownerUserId}
              onChange={(e) => setOwnerUserId(e.target.value)}
              placeholder="employee id"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="attr-from">From</Label>
            <Input
              id="attr-from"
              className="w-44"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="ISO date"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="attr-to">To</Label>
            <Input
              id="attr-to"
              className="w-44"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="ISO date"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              void load().finally(() => setLoading(false));
            }}
          >
            {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
            Apply
          </Button>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {dashboard ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <MetricFace label="Qualified responses" metric={dashboard.qualifiedResponses} />
            <MetricFace label="Conversion rate" metric={dashboard.conversionRate} />
            <MetricFace label="Contacts created" metric={dashboard.contactsCreated} />
            <MetricFace label="Contacts reused" metric={dashboard.contactsReused} />
            <MetricFace label="Opportunities created" metric={dashboard.opportunitiesCreated} />
            <MetricFace label="Total Opportunity value" metric={dashboard.totalOpportunityValue} />
            <MetricFace label="Deals created" metric={dashboard.dealsCreated} />
            <MetricFace label="Disbursed amount" metric={dashboard.disbursedAmount} />
            <MetricFace label="Recognised revenue" metric={dashboard.recognisedRevenue} />
            <MetricFace label="Campaign ROI" metric={dashboard.campaignRoi} />
          </div>
          <p className="text-xs text-muted-foreground">
            Chain: {dashboard.chain.map((stage) => MARKETING_ATTRIBUTION_STAGE_LABELS[stage]).join(" → ")}
          </p>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Attributed journeys</CardTitle>
              <CardDescription>
                {dashboard.attributedRecipients.value ?? 0} attributed recipients. Duplicate Opportunity,
                Deal, or Accounting rows are not created here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attributed journeys in this filter.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase text-muted-foreground">
                        <th className="py-2 pr-3">Campaign</th>
                        <th className="py-2 pr-3">Snapshot</th>
                        <th className="py-2 pr-3">Recipient</th>
                        <th className="py-2 pr-3">Contact</th>
                        <th className="py-2 pr-3">Opportunity</th>
                        <th className="py-2 pr-3">Deal</th>
                        <th className="py-2 pr-3">Stage reached</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.rows.map((row) => (
                        <tr key={`${row.originalCampaignId}-${row.qualificationId ?? row.snapshotRecipientId}`} className="border-b border-border/60">
                          <td className="py-2 pr-3">{row.campaignName ?? row.originalCampaignId}</td>
                          <td className="py-2 pr-3 text-xs">{row.snapshotId ?? "—"}</td>
                          <td className="py-2 pr-3 text-xs">{row.recipientFingerprintPreview}</td>
                          <td className="py-2 pr-3 text-xs">
                            {row.contactId ?? "—"}
                            {row.contactCreated === false ? " · reused" : row.contactCreated ? " · created" : ""}
                          </td>
                          <td className="py-2 pr-3 text-xs">{row.opportunityId ?? "—"}</td>
                          <td className="py-2 pr-3 text-xs">{row.dealId ?? "—"}</td>
                          <td className="py-2 pr-3">{MARKETING_ATTRIBUTION_STAGE_LABELS[row.stageReached]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : null}
    </div>
  );
}
