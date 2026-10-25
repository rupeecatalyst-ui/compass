"use client";

/**
 * CO-C1-OPERATIONAL-EMAIL-001 — Activation posture for operational email:
 * categories, honest domain/delivery status, production OFF gate, controlled test send.
 */

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OPERATIONAL_EMAIL_CATEGORIES } from "@/constants/enterprise-communication-center/operational-categories";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  deriveDomainAuthStatuses,
  deriveProviderConnectionStatus,
  isOperationalProductionSendingEnabled,
  labelConfigStatus,
} from "@/lib/enterprise-communication-center/delivery-status";
import type { EnterpriseCommunicationProfileRecord } from "@/types/enterprise-communication-center";
import { cn } from "@/lib/utils";

type Props = {
  profiles: EnterpriseCommunicationProfileRecord[];
  selectedCode: string | null;
};

type TestResult = {
  mode: string;
  status: string;
  deliveryStatus?: string;
  timestamp: string;
  recipientEmail: string;
  senderEmail?: string;
  providerResponse?: { message?: string; simulationId?: string; warning?: string | null };
  error?: string | null;
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case "verified":
    case "connected":
    case "success":
      return "border-emerald-500/40 text-emerald-800 dark:text-emerald-200";
    case "pending":
    case "credential_pending":
    case "simulation_only":
    case "simulated":
    case "submitted":
    case "ambiguous":
      return "border-amber-500/40 text-amber-900 dark:text-amber-100";
    case "failed":
      return "border-destructive/40 text-destructive";
    default:
      return "border-border text-muted-foreground";
  }
}

export function OperationalEmailActivationPanel({ profiles, selectedCode }: Props) {
  const productionOn = isOperationalProductionSendingEnabled();
  const profile =
    profiles.find((p) => p.profileCode === selectedCode) || profiles[0] || null;

  const connection = useMemo(
    () =>
      profile
        ? deriveProviderConnectionStatus(profile)
        : ("not_configured" as const),
    [profile],
  );
  const domain = useMemo(
    () =>
      profile
        ? deriveDomainAuthStatuses(profile)
        : {
            spf: "not_configured" as const,
            dkim: "not_configured" as const,
            domain: "not_configured" as const,
            sender: "not_configured" as const,
          },
    [profile],
  );

  const [recipient, setRecipient] = useState("");
  const [testProfile, setTestProfile] = useState<string>(selectedCode || "CUSTOMERS");
  useEffect(() => {
    if (selectedCode) setTestProfile(selectedCode);
  }, [selectedCode]);
  const [confirmation, setConfirmation] = useState("");
  const [sending, setSending] = useState(false);
  const [liveSending, setLiveSending] = useState(false);
  const [probing, setProbing] = useState(false);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);
  const [lastProbe, setLastProbe] = useState<{
    ok: boolean;
    message: string;
    timestamp: string;
    tlsConnected?: boolean;
    authVerified?: boolean;
  } | null>(null);

  async function probeSmtp() {
    setProbing(true);
    setLastProbe(null);
    try {
      const res = await authenticatedJsonFetch(
        "/api/admin/enterprise-communication/smtp-probe",
        {
          method: "POST",
          body: JSON.stringify({
            profileCode: testProfile || selectedCode || "CUSTOMERS",
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      const payload = json?.data ?? json;
      if (!res.ok) {
        setLastProbe({
          ok: false,
          message: payload?.message || json?.error?.message || "SMTP probe failed",
          timestamp: new Date().toISOString(),
        });
        toast.error("SMTP probe failed");
        return;
      }
      setLastProbe({
        ok: Boolean(payload?.ok),
        message: String(payload?.message || "Probe complete"),
        timestamp: String(payload?.timestamp || new Date().toISOString()),
        tlsConnected: payload?.tlsConnected,
        authVerified: payload?.authVerified,
      });
      toast.success(payload?.authVerified ? "SMTP authentication succeeded. No email was sent." : "SMTP probe finished. No email was sent.");
    } catch {
      setLastProbe({
        ok: false,
        message: "SMTP probe request failed",
        timestamp: new Date().toISOString(),
      });
      toast.error("SMTP probe request failed");
    } finally {
      setProbing(false);
    }
  }

  async function sendTest() {
    setSending(true);
    setLastResult(null);
    try {
      const res = await authenticatedJsonFetch(
        "/api/admin/enterprise-communication/test-send",
        {
          method: "POST",
          body: JSON.stringify({
            recipientEmail: recipient,
            profileCode: testProfile || selectedCode || "CUSTOMERS",
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = json?.error?.message || "Test send failed";
        setLastResult({
          mode: "error",
          status: "failed",
          timestamp: new Date().toISOString(),
          recipientEmail: recipient,
          error: errMsg,
        });
        toast.error(errMsg);
        return;
      }
      const data = json.data as TestResult;
      setLastResult(data);
      toast.success("Simulation recorded. No email was sent.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Test send failed";
      setLastResult({
        mode: "error",
        status: "failed",
        timestamp: new Date().toISOString(),
        recipientEmail: recipient,
        error: message,
      });
      toast.error(message);
    } finally {
      setSending(false);
    }
  }

  async function sendLiveTest() {
    setLiveSending(true);
    setLastResult(null);
    try {
      const res = await authenticatedJsonFetch("/api/admin/enterprise-communication/live-test", {
        method: "POST",
        body: JSON.stringify({
          recipientEmail: recipient,
          profileCode: testProfile || selectedCode || "CUSTOMERS",
          confirmationPhrase: confirmation,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = json?.error?.message || "Live test failed";
        setLastResult({
          mode: "live_test",
          status: "failed",
          timestamp: new Date().toISOString(),
          recipientEmail: recipient,
          error: errMsg,
        });
        toast.error(errMsg);
        return;
      }
      const outcome = String(json?.data?.outcome || "failed");
      setLastResult({
        mode: "live_test",
        status: outcome,
        timestamp: String(json?.data?.timestamp || new Date().toISOString()),
        recipientEmail: String(json?.data?.recipientEmail || recipient),
        senderEmail: json?.data?.senderEmail,
        providerResponse: { message: json?.data?.message },
      });
      toast.success(outcome === "submitted" ? "Provider accepted the message. Not confirmed as delivered." : `Live test ${outcome}. No retry was made.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Live test failed");
    } finally {
      setLiveSending(false);
    }
  }

  return (
    <div className="space-y-3" data-sprint="CO-C1-OPERATIONAL-EMAIL-001">
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Operational production email
            </p>
            <p className="text-xs text-muted-foreground">
              Configuration and controlled tests are available. Live platform delivery stays
              OFF until an explicit administrator enablement of external delivery (ENCE).
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] uppercase",
              productionOn
                ? "border-emerald-500/40 text-emerald-800"
                : "border-amber-500/50 text-amber-900 dark:text-amber-100",
            )}
          >
            {productionOn ? "Enabled" : "OFF"}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Operational categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {OPERATIONAL_EMAIL_CATEGORIES.map((c) => (
              <div
                key={c.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-1.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{c.label}</p>
                  <p className="text-[10px] text-muted-foreground">{c.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-medium text-foreground">{c.profileCode}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {c.dedicatedProfileReady ? "Dedicated profile" : "Shared until dedicated"}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Delivery & domain status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-medium">{profile?.smtpProvider ?? "none"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Connection</span>
              <Badge variant="outline" className={cn("text-[9px]", statusBadgeClass(connection))}>
                {connection.replaceAll("_", " ")}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Credential</span>
              <Badge variant="outline" className="text-[9px]">
                {profile?.smtpCredentialConfigured ? "Configured" : "Not set"}
              </Badge>
            </div>
            {(
              [
                ["SPF", domain.spf],
                ["DKIM", domain.dkim],
                ["Domain", domain.domain],
                ["Sender", domain.sender],
              ] as const
            ).map(([label, status]) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{label}</span>
                <Badge variant="outline" className={cn("text-[9px]", statusBadgeClass(status))}>
                  {labelConfigStatus(status)}
                </Badge>
              </div>
            ))}
            <p className="pt-1 text-[10px] text-muted-foreground">
              Status reflects configuration state only. Verified is never shown without provider
              confirmation.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Test SMTP connection</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-xs text-muted-foreground">
            Checks reachability and authentication for the selected mailbox. Does not send an email
            and does not enable organisation-wide delivery.
          </p>
          <div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={probing || !profile}
              onClick={() => void probeSmtp()}
            >
              {probing ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Run SMTP probe
            </Button>
          </div>
          {lastProbe ? (
            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs">
              <Badge
                variant="outline"
                className={cn("text-[9px]", statusBadgeClass(lastProbe.ok ? "success" : "failed"))}
              >
                {lastProbe.ok ? "success" : "failed"}
              </Badge>
              <p className="mt-1 text-foreground">{lastProbe.message}</p>
              <p className="mt-1 text-muted-foreground">
                Reachable: {lastProbe.tlsConnected ? "yes" : "no"} · Authentication:{" "}
                {lastProbe.authVerified ? "succeeded" : "not confirmed"} · No email was sent.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Send test email</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-xs text-muted-foreground">
            Simulation records an audit entry and does not send mail. Live test sends exactly one
            message through the selected mailbox and reports Submitted, not Delivered.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Test recipient</Label>
              <Input
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sender profile</Label>
              <Select value={testProfile} onValueChange={setTestProfile}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.profileCode} value={p.profileCode}>
                      {p.displayName} · {p.senderEmail}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Live confirmation</Label>
              <Input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="SEND TEST"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" size="sm" variant="outline" disabled={sending || !recipient.trim()} onClick={() => void sendTest()}>
                Record simulation
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={liveSending || confirmation.trim() !== "SEND TEST" || !recipient.trim()}
                onClick={() => void sendLiveTest()}
              >
                {liveSending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />}
                Send live test email
              </Button>
            </div>
          </div>
          {lastResult ? (
            <div className="sm:col-span-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("text-[9px]", statusBadgeClass(lastResult.status))}
                >
                  {lastResult.status}
                </Badge>
                <span className="text-muted-foreground">{lastResult.timestamp}</span>
                {lastResult.mode === "simulation" ? (
                  <Badge variant="outline" className="text-[9px]">
                    simulation
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-foreground">
                To: {lastResult.recipientEmail}
                {lastResult.senderEmail ? ` · From: ${lastResult.senderEmail}` : ""}
              </p>
              {lastResult.providerResponse?.message ? (
                <p className="mt-0.5 text-muted-foreground">
                  {lastResult.providerResponse.message}
                </p>
              ) : null}
              {lastResult.error ? (
                <p className="mt-0.5 text-destructive">{lastResult.error}</p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
