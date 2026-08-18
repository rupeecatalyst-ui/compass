"use client";

/**
 * CO-MARKETING-MKT-01 / ACTIVATION-002 — Marketing Command Center home.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Megaphone, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  ENTERPRISE_MARKETING_ENGINE_NAME,
  ENTERPRISE_MARKETING_MODULE_TITLE,
  MARKETING_COMMAND_CENTER_SECTIONS,
} from "@/constants/enterprise-marketing-engine";
import type { EnterpriseMarketingFoundationStatus } from "@/types/enterprise-marketing-engine";
import { MarketingModuleNav } from "./marketing-module-nav";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

function modeLabel(value: boolean | string | undefined, whenTrue: string, whenFalse: string) {
  if (typeof value === "boolean") return value ? whenTrue : whenFalse;
  if (!value) return whenFalse;
  return String(value);
}

export function MarketingCommandCenter() {
  const [status, setStatus] = useState<EnterpriseMarketingFoundationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaignCount, setCampaignCount] = useState<number | null>(null);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [res, campRes, audRes] = await Promise.all([
          authenticatedJsonFetch("/api/admin/marketing"),
          authenticatedJsonFetch("/api/admin/marketing/campaigns"),
          authenticatedJsonFetch("/api/admin/marketing/audiences"),
        ]);
        const body = (await res.json()) as ApiEnvelope<EnterpriseMarketingFoundationStatus>;
        if (cancelled) return;
        if (!res.ok || !body.success || !body.data) {
          setError(body.error?.message ?? "Failed to load Marketing foundation status");
        } else {
          setStatus(body.data);
        }
        if (campRes.ok) {
          const campBody = (await campRes.json()) as ApiEnvelope<{ campaigns: unknown[] }>;
          if (campBody.success && campBody.data?.campaigns) {
            setCampaignCount(campBody.data.campaigns.length);
          }
        }
        if (audRes.ok) {
          const audBody = (await audRes.json()) as ApiEnvelope<{ audiences: unknown[] }>;
          if (audBody.success && audBody.data?.audiences) {
            setAudienceCount(audBody.data.audiences.length);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load Marketing foundation status");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = MARKETING_COMMAND_CENTER_SECTIONS.filter((s) => s.id !== "home");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Administration · {ENTERPRISE_MARKETING_ENGINE_NAME}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Megaphone className="h-7 w-7 text-primary" aria-hidden />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {ENTERPRISE_MARKETING_MODULE_TITLE}
            </h1>
            <p className="text-sm text-muted-foreground">
              Bounded acquisition OS — MARKETING TEST MODE active; live bulk send separately gated.
            </p>
          </div>
        </div>
      </header>

      <MarketingModuleNav activeId="home" />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Foundation status
          </CardTitle>
          <CardDescription>
            Sprint {status?.sprint ?? "CO-MARKETING-ACTIVATION-002"} — workflow active with honest
            safety gates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {loading ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading module status…
            </p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : status ? (
            <>
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-100">
                MARKETING TEST MODE — controlled dry-run / fixture execution. Live unrestricted bulk
                send is OFF.
              </p>
              <p className="text-muted-foreground">{status.safety.notice}</p>
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Live bulk execution</dt>
                  <dd className="font-medium">
                    {status.safety.executionEnabled ? "Enabled" : "Disabled (production gate)"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Dry-run / test execution</dt>
                  <dd className="font-medium">
                    {status.safety.executionDryRunEnabled ? "Active" : "Disabled"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Handoff</dt>
                  <dd className="font-medium">
                    {status.safety.handoffEnabled
                      ? `Enabled · mode ${status.safety.handoffMode ?? "fixture"}`
                      : "Disabled"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Provider connect</dt>
                  <dd className="font-medium">
                    {status.safety.providerConnectEnabled ? "Connected" : "NOT CONNECTED"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Email channel</dt>
                  <dd className="font-medium">
                    {modeLabel(status.safety.emailMode, "live", status.safety.emailMode ?? "off")}
                    {status.safety.emailMode === "dry_run" ? " · TEST MODE" : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">WhatsApp channel</dt>
                  <dd className="font-medium">
                    {modeLabel(
                      status.safety.whatsappMode,
                      "live",
                      status.safety.whatsappMode ?? "off",
                    )}
                    {status.safety.whatsappMode === "dry_run" ? " · TEST MODE" : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Audience import</dt>
                  <dd className="font-medium">Disabled (Sheets stream only)</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Sheets adapter</dt>
                  <dd className="font-medium">
                    {status.safety.sheetsMode}
                    {status.safety.sheetsReadEnabled ? " (read)" : " (off)"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Audience engine</dt>
                  <dd className="font-medium">
                    {status.capabilities.audienceEngine === "definition_preview"
                      ? "Definition + preview"
                      : "Disabled"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Campaigns (this process)</dt>
                  <dd className="font-medium">
                    {campaignCount == null ? "—" : campaignCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">Audiences (this process)</dt>
                  <dd className="font-medium">
                    {audienceCount == null ? "—" : audienceCount}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">
                Future handoff: {status.boundaries.futureHandoff}
              </p>
              <p className="text-xs text-muted-foreground">
                Ports registered: {status.ports.length} · Permissions defined:{" "}
                {status.permissions.length}
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.id} href={section.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-accent/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs font-medium text-primary">Open →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
