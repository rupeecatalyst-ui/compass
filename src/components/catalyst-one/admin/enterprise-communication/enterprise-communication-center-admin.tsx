"use client";

/**
 * CO-ECC-001 — Enterprise Communication Center admin workspace.
 */
import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, Save, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OperationalEmailActivationPanel } from "@/components/catalyst-one/admin/enterprise-communication/operational-email-activation-panel";
import { IncomingEmailServerPanel } from "@/components/catalyst-one/admin/enterprise-communication/incoming-email-server-panel";
import { authenticatedJsonFetch } from "@/lib/api-client";
import type {
  EnterpriseCommunicationEventMapping,
  EnterpriseCommunicationProfileRecord,
  EnterpriseCommunicationSmtpProvider,
} from "@/types/enterprise-communication-center";
import { cn } from "@/lib/utils";

type Bundle = {
  profiles: EnterpriseCommunicationProfileRecord[];
  events: EnterpriseCommunicationEventMapping[];
};

const SMTP_OPTIONS: EnterpriseCommunicationSmtpProvider[] = [
  "none",
  "smtp",
  "ses",
  "sendgrid",
  "resend",
  "other",
];

export function EnterpriseCommunicationCenterAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<EnterpriseCommunicationProfileRecord>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/enterprise-communication/profiles");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || "Failed to load Communication Center");
      const data = json.data as Bundle;
      setBundle(data);
      const first = data.profiles[0];
      const code = selectedCode || first?.profileCode || null;
      setSelectedCode(code);
      const profile = data.profiles.find((p) => p.profileCode === code) || first;
      if (profile) {
        setDraft({ ...profile });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, [selectedCode]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  function selectProfile(code: string) {
    const profile = bundle?.profiles.find((p) => p.profileCode === code);
    if (!profile) return;
    setSelectedCode(code);
    setDraft({ ...profile });
  }

  async function save() {
    if (!selectedCode) return;
    setSaving(true);
    try {
      const res = await authenticatedJsonFetch(
        `/api/admin/enterprise-communication/profiles/${encodeURIComponent(selectedCode)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            displayName: draft.displayName,
            senderEmail: draft.senderEmail,
            replyToEmail: draft.replyToEmail,
            smtpProvider: draft.smtpProvider,
            smtpHost: draft.smtpHost,
            smtpPort: draft.smtpPort,
            smtpUsername: draft.smtpUsername,
            signature: draft.signature,
            footer: draft.footer,
            logoUrl: draft.logoUrl,
            supportEmail: draft.supportEmail,
            supportPhone: draft.supportPhone,
            active: draft.active,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || "Save failed");
      toast.success("Communication Profile saved");
      setSelectedCode(selectedCode);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !bundle) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Opening Enterprise Communication Center…
      </div>
    );
  }

  const eventsForSelected =
    bundle?.events.filter((e) => e.profileCode === selectedCode) ?? [];

  return (
    <div className="space-y-4" data-sprint="CO-ECC-001">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Enterprise Communication Center</h1>
          <p className="text-xs text-muted-foreground">
            Configure Communication Profiles. Modules specify event types — ECC resolves the
            sender. Never hardcode From addresses in application code. Separate from Marketing
            campaign email.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving || !selectedCode}>
          {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
          Save Profile
        </Button>
      </div>

      <OperationalEmailActivationPanel
        profiles={bundle?.profiles ?? []}
        selectedCode={selectedCode}
      />

      <IncomingEmailServerPanel />

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Profiles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {(bundle?.profiles ?? []).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectProfile(p.profileCode)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs hover:bg-muted/70",
                  selectedCode === p.profileCode && "bg-muted font-medium",
                )}
              >
                <span className="truncate">{p.profileCode}</span>
                <Badge variant="outline" className="text-[9px]">
                  {p.active ? "Active" : "Inactive"}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4" />
                {draft.profileCode || "Profile"} identity
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Display Name</Label>
                <Input
                  value={draft.displayName || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sender Email</Label>
                <Input
                  type="email"
                  value={draft.senderEmail || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, senderEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reply-To Email</Label>
                <Input
                  type="email"
                  value={draft.replyToEmail || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, replyToEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Support Email</Label>
                <Input
                  type="email"
                  value={draft.supportEmail || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, supportEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Support Phone</Label>
                <Input
                  value={draft.supportPhone || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, supportPhone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Logo URL</Label>
                <Input
                  value={draft.logoUrl || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, logoUrl: e.target.value }))}
                  placeholder="https://… or /path/to/logo"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch
                  checked={Boolean(draft.active)}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, active: v }))}
                />
                <Label>Active</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4" />
                SMTP Provider
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Select
                  value={draft.smtpProvider || "none"}
                  onValueChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      smtpProvider: v as EnterpriseCommunicationSmtpProvider,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SMTP_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Host</Label>
                <Input
                  value={draft.smtpHost || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, smtpHost: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Port</Label>
                <Input
                  type="number"
                  value={draft.smtpPort ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      smtpPort: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input
                  value={draft.smtpUsername || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, smtpUsername: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 rounded-md border border-border/70 bg-muted/30 px-3 py-2">
                <Label>Provider credential</Label>
                <p className="text-xs text-muted-foreground">
                  {draft.smtpCredentialConfigured
                    ? "Server environment credential is configured. The secret is never returned to this UI."
                    : "Configure ECC_CUSTOMERS_SMTP_PASSWORD on the Hostinger server environment. Passwords are not stored in Git or the browser."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Signature & footer</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Signature</Label>
                <Textarea
                  rows={3}
                  value={draft.signature || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, signature: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Footer</Label>
                <Textarea
                  rows={2}
                  value={draft.footer || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, footer: e.target.value }))}
                />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
                  Used for
                </p>
                <ul className="list-inside list-disc text-xs text-muted-foreground">
                  {(draft.usedFor || []).map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Event mapping (this profile)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs">
              {eventsForSelected.length === 0 ? (
                <p className="text-muted-foreground">No events mapped.</p>
              ) : (
                eventsForSelected.map((e) => (
                  <div key={e.eventType} className="rounded border border-border px-2 py-1.5">
                    <p className="font-medium text-foreground">{e.label}</p>
                    <p className="text-muted-foreground">
                      {e.eventType} → {e.profileCode}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
