"use client";

/**
 * CO-MARKETING-ACTIVATION-002 — Marketing Settings (sender identities + mode honesty).
 * Credentials never leave the server; this UI only manages non-secret identity metadata.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { MarketingModuleNav } from "./marketing-module-nav";
import { toast } from "sonner";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

type SenderIdentity = {
  id: string;
  displayName: string;
  fromAddress: string;
  replyTo?: string | null;
  active: boolean;
  verificationStatus: string;
  providerType: string;
};

export function MarketingSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("dry_run");
  const [safety, setSafety] = useState<{
    executionEnabled?: boolean;
    executionDryRunEnabled?: boolean;
    handoffEnabled?: boolean;
    handoffMode?: string;
    sheetsMode?: string;
    sheetsReadEnabled?: boolean;
    emailMode?: string;
    whatsappMode?: string;
    providerConnectEnabled?: boolean;
    audienceImportEnabled?: boolean;
    notice?: string;
  } | null>(null);
  const [identities, setIdentities] = useState<SenderIdentity[]>([]);
  const [displayName, setDisplayName] = useState("Rupee Catalyst Campaigns");
  const [fromAddress, setFromAddress] = useState("campaigns@example.com");
  const [replyTo, setReplyTo] = useState("");

  const load = useCallback(async () => {
    const [idRes, statusRes] = await Promise.all([
      authenticatedJsonFetch("/api/admin/marketing/sender-identities"),
      authenticatedJsonFetch("/api/admin/marketing"),
    ]);
    const body = (await idRes.json()) as ApiEnvelope<{
      identities: SenderIdentity[];
      mode: string;
    }>;
    if (!idRes.ok || !body.success || !body.data) {
      throw new Error(body.error?.message || "Failed to load sender identities");
    }
    setIdentities(body.data.identities);
    setMode(body.data.mode);
    if (statusRes.ok) {
      const statusBody = (await statusRes.json()) as ApiEnvelope<{
        safety: NonNullable<typeof safety>;
      }>;
      if (statusBody.success && statusBody.data?.safety) {
        setSafety(statusBody.data.safety);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const upsert = async () => {
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/sender-identities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          displayName,
          fromAddress,
          replyTo: replyTo || null,
          active: true,
          verificationStatus: "UNVERIFIED",
          providerType: "dry_run",
        }),
      });
      const body = (await res.json()) as ApiEnvelope<unknown>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || "Save failed");
      }
      toast.success("Sender identity saved (no secrets stored via UI)");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Marketing Command Center
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Sender identities and Marketing Test Mode. Provider credentials stay server-side only.
        </p>
      </header>

      <MarketingModuleNav activeId="settings" />

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            MARKETING TEST MODE
          </CardTitle>
          <CardDescription>
            Email delivery mode: <strong>{safety?.emailMode ?? mode}</strong>. Live provider connect
            is OFF. Campaign controlled tests are SIMULATED — not ACTUALLY SENT.
          </CardDescription>
        </CardHeader>
        {safety ? (
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              Live bulk execution:{" "}
              <strong>{safety.executionEnabled ? "Enabled" : "Disabled"}</strong>
            </p>
            <p>
              Dry-run / test execution:{" "}
              <strong>{safety.executionDryRunEnabled ? "Active" : "Disabled"}</strong>
            </p>
            <p>
              Sheets adapter:{" "}
              <strong>
                {safety.sheetsMode}
                {safety.sheetsReadEnabled ? " (read)" : " (off)"}
              </strong>
            </p>
            <p>
              Handoff:{" "}
              <strong>
                {safety.handoffEnabled
                  ? `Enabled · ${safety.handoffMode ?? "fixture"}`
                  : "Disabled"}
              </strong>
            </p>
            <p>
              WhatsApp: <strong>{safety.whatsappMode ?? "dry_run"}</strong>
            </p>
            <p>
              Audience import:{" "}
              <strong>{safety.audienceImportEnabled ? "Enabled" : "Disabled"}</strong>
            </p>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sender identities</CardTitle>
          <CardDescription>
            Non-secret from-name / from-address metadata for campaigns. Do not paste API keys here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {identities.length === 0 ? (
                <li className="text-muted-foreground">No sender identities yet.</li>
              ) : (
                identities.map((id) => (
                  <li key={id.id} className="rounded-md border px-3 py-2">
                    <p className="font-medium">{id.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {id.fromAddress}
                      {id.replyTo ? ` · reply ${id.replyTo}` : ""} · {id.providerType} ·{" "}
                      {id.verificationStatus}
                      {!id.active ? " · inactive" : ""}
                    </p>
                  </li>
                ))
              )}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>From name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>From address</Label>
              <Input value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Reply-to (optional)</Label>
              <Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} />
            </div>
          </div>
          <Button size="sm" disabled={busy} onClick={() => void upsert()}>
            Save sender identity
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
