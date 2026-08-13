"use client";

/**
 * CO-MARKETING-ACTIVATION-002 — Deliverability configuration surface (pending / not connected).
 * Does not claim SPF/DKIM/DMARC certification without verification.
 */

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { MarketingModuleNav } from "./marketing-module-nav";

type ApiEnvelope<T> = { success: boolean; data?: T };

export function MarketingDeliverabilityPanel() {
  const [emailMode, setEmailMode] = useState("dry_run");
  const [whatsappMode, setWhatsappMode] = useState("dry_run");
  const [providerConnect, setProviderConnect] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authenticatedJsonFetch("/api/admin/marketing");
        const body = (await res.json()) as ApiEnvelope<{
          safety: {
            emailMode?: string;
            whatsappMode?: string;
            providerConnectEnabled: boolean;
          };
        }>;
        if (cancelled || !res.ok || !body.success || !body.data) return;
        setEmailMode(body.data.safety.emailMode ?? "dry_run");
        setWhatsappMode(body.data.safety.whatsappMode ?? "dry_run");
        setProviderConnect(body.data.safety.providerConnectEnabled);
      } catch {
        /* ignore — panel still shows pending defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const row = (label: string, status: string) => (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <span>{label}</span>
      <span className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
        {status}
      </span>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Marketing Command Center
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Deliverability</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Production configuration surface for SPF, DKIM, DMARC, bounce, suppression, and
          unsubscribe. Not certified until provider verification completes.
        </p>
      </header>

      <MarketingModuleNav activeId="deliverability" />

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            Provider status
          </CardTitle>
          <CardDescription>
            Email mode: <strong>{emailMode}</strong> · WhatsApp mode:{" "}
            <strong>{whatsappMode}</strong> · Provider connect:{" "}
            <strong>{providerConnect ? "enabled" : "NOT CONNECTED"}</strong>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Domain authentication checklist</CardTitle>
          <CardDescription>
            Pending until a live ESP is authorised. Do not treat this panel as deliverability
            certification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {row("SPF", "PENDING / NOT CONNECTED")}
          {row("DKIM", "PENDING / NOT CONNECTED")}
          {row("DMARC", "PENDING / NOT CONNECTED")}
          {row("Bounce handling", "PENDING / NOT CONNECTED")}
          {row("Suppression list", "ENGINE READY (dry-run)")}
          {row("Unsubscribe", "ENGINE READY (dry-run)")}
          {row("Delivery failure / retry", "PENDING / NOT CONNECTED")}
        </CardContent>
      </Card>
    </div>
  );
}
