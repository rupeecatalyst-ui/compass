"use client";

/**
 * CO-C1-COMMUNICATION-002 — Incoming Email Server settings (IMAP).
 * Non-secret fields saved to DB. Password remains host env only (ECC pattern).
 */
import { useCallback, useEffect, useState } from "react";
import { Inbox, Loader2, Save, Shield, Wifi } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { authenticatedJsonFetch } from "@/lib/api-client";
import type {
  InboundEmailImapProbeResult,
  InboundEmailServerSettingsDto,
} from "@/types/enterprise-inbound-email";
import { cn } from "@/lib/utils";

type Draft = {
  enabled: boolean;
  imapHost: string;
  imapPort: number;
  imapUsername: string;
  mailbox: string;
  internalDomains: string;
};

const emptyDraft: Draft = {
  enabled: false,
  imapHost: "",
  imapPort: 993,
  imapUsername: "",
  mailbox: "INBOX",
  internalDomains: "rupeecatalyst.com",
};

export function IncomingEmailServerPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [probing, setProbing] = useState(false);
  const [settings, setSettings] = useState<InboundEmailServerSettingsDto | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [lastProbe, setLastProbe] = useState<InboundEmailImapProbeResult | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedJsonFetch(
        "/api/admin/enterprise-communication/inbound-server",
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || "Failed to load settings");
      const next = json.data?.settings as InboundEmailServerSettingsDto;
      setSettings(next);
      setDraft({
        enabled: next.enabled,
        imapHost: next.imapHost ?? "",
        imapPort: next.imapPort ?? 993,
        imapUsername: next.imapUsername ?? "",
        mailbox: next.mailbox || "INBOX",
        internalDomains: next.internalDomains || "rupeecatalyst.com",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function save() {
    setSaving(true);
    try {
      const res = await authenticatedJsonFetch(
        "/api/admin/enterprise-communication/inbound-server",
        {
          method: "PUT",
          body: JSON.stringify({
            enabled: draft.enabled,
            imapHost: draft.imapHost.trim() || null,
            imapPort: draft.imapPort,
            imapUsername: draft.imapUsername.trim() || null,
            mailbox: draft.mailbox.trim() || "INBOX",
            internalDomains: draft.internalDomains.trim() || "rupeecatalyst.com",
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || "Save failed");
      toast.success("Incoming Email Server settings saved");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setProbing(true);
    setLastProbe(null);
    try {
      const res = await authenticatedJsonFetch(
        "/api/admin/enterprise-communication/inbound-server/probe",
        { method: "POST", body: JSON.stringify({}) },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || "Probe failed");
      const result = json.data?.result as InboundEmailImapProbeResult;
      setLastProbe(result);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Probe failed");
    } finally {
      setProbing(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Incoming Email Server…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-4 w-4" />
            Incoming Email Server
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant={draft.enabled ? "default" : "secondary"}>
              {draft.enabled ? "Enabled" : "Disabled"}
            </Badge>
            <Badge
              variant={settings?.passwordConfigured ? "default" : "destructive"}
              className={cn(!settings?.passwordConfigured && "bg-destructive/90")}
            >
              Password {settings?.passwordConfigured ? "configured" : "missing"}
            </Badge>
            {settings?.source === "environment_fallback" ? (
              <Badge variant="outline">Env fallback</Badge>
            ) : null}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          IMAP settings for operational inbound mail. Host, port, username, and mailbox are
          saved in Catalyst One. The IMAP password stays on the host environment (
          <code className="text-xs">{settings?.passwordEnvKey ?? "INBOUND_EMAIL_IMAP_PASSWORD"}</code>
          ) — never stored in the database or returned by the API.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
          <div>
            <Label htmlFor="inbound-enabled">Enable Incoming Email</Label>
            <p className="text-xs text-muted-foreground">
              When off, the inbound cron authenticates but does not poll IMAP.
            </p>
          </div>
          <Switch
            id="inbound-enabled"
            checked={draft.enabled}
            onCheckedChange={(enabled) => setDraft((d) => ({ ...d, enabled }))}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="imap-host">IMAP Host</Label>
            <Input
              id="imap-host"
              value={draft.imapHost}
              onChange={(e) => setDraft((d) => ({ ...d, imapHost: e.target.value }))}
              placeholder="imap.hostinger.com"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="imap-port">IMAP Port</Label>
            <Input
              id="imap-port"
              type="number"
              value={draft.imapPort}
              onChange={(e) =>
                setDraft((d) => ({ ...d, imapPort: Number(e.target.value) || 993 }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="imap-user">IMAP Username</Label>
            <Input
              id="imap-user"
              value={draft.imapUsername}
              onChange={(e) => setDraft((d) => ({ ...d, imapUsername: e.target.value }))}
              placeholder="connect@rupeecatalyst.com"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="imap-mailbox">Mailbox</Label>
            <Input
              id="imap-mailbox"
              value={draft.mailbox}
              onChange={(e) => setDraft((d) => ({ ...d, mailbox: e.target.value }))}
              placeholder="INBOX"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="imap-internal">Internal Domains</Label>
          <Input
            id="imap-internal"
            value={draft.internalDomains}
            onChange={(e) => setDraft((d) => ({ ...d, internalDomains: e.target.value }))}
            placeholder="rupeecatalyst.com"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated. Senders on these domains are treated as internal (not customer
            correspondence).
          </p>
        </div>

        <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm">
          <div className="flex items-start gap-2">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">IMAP password (host environment)</p>
              <p className="text-muted-foreground">
                Set <code className="text-xs">{settings?.passwordEnvKey}</code> on the Hostinger
                server environment. The password is never shown here after save and is never
                returned by APIs.
              </p>
              <p className="mt-1 text-muted-foreground">
                Status:{" "}
                <span className="font-medium text-foreground">
                  {settings?.passwordConfigured
                    ? "•••••••• (configured on host)"
                    : "Not configured"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {(settings?.lastProbeAt || lastProbe) && (
          <div className="rounded-lg border px-3 py-2 text-sm">
            <p className="font-medium">Connection status</p>
            <p className="text-muted-foreground">
              Last check:{" "}
              {lastProbe
                ? new Date().toLocaleString()
                : settings?.lastProbeAt
                  ? new Date(settings.lastProbeAt).toLocaleString()
                  : "—"}
            </p>
            <p
              className={cn(
                "mt-1",
                (lastProbe?.ok ?? settings?.lastProbeOk) ? "text-emerald-700" : "text-destructive",
              )}
            >
              {lastProbe?.message ?? settings?.lastProbeMessage ?? "No probe recorded"}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save settings
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void testConnection()}
            disabled={probing}
          >
            {probing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="h-4 w-4" />
            )}
            Test Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
