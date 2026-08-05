"use client";

/**
 * CO-INV-001 — Wealth Partner Activation panel (Enterprise Invitation Engine consumer).
 */
import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  Link2,
  Loader2,
  Mail,
  RefreshCw,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  ENTERPRISE_INVITATION_STATUS_LABELS,
} from "@/constants/enterprise-invitation-engine";
import type {
  EnterpriseInvitationAuditRecord,
  EnterpriseInvitationRecord,
} from "@/types/enterprise-invitation-engine";
import { cn } from "@/lib/utils";

type SenderInfo = {
  displayName: string;
  senderEmail: string;
  supportEmail: string;
  source: string;
  profileCode?: string;
};

type StateResponse = {
  current: EnterpriseInvitationRecord | null;
  audits: EnterpriseInvitationAuditRecord[];
  sender: SenderInfo;
};

interface WealthPartnerActivationPanelProps {
  partnerId: string;
  partnerEmail?: string | null;
}

function statusTone(status: string | undefined) {
  switch (status) {
    case "activated":
      return "bg-emerald-100 text-emerald-900 border-emerald-300";
    case "invite_sent":
    case "link_generated":
      return "bg-sky-100 text-sky-900 border-sky-300";
    case "expired":
    case "cancelled":
      return "bg-rose-100 text-rose-900 border-rose-300";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function WealthPartnerActivationPanel({
  partnerId,
  partnerEmail,
}: WealthPartnerActivationPanelProps) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [state, setState] = useState<StateResponse | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedJsonFetch(
        `/api/enterprise-invitations?inviteeKind=wealth_partner&entityId=${encodeURIComponent(partnerId)}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || "Failed to load invitation state");
      }
      const json = await res.json();
      setState(json.data as StateResponse);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load activation");
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runAction(action: "generate" | "send" | "resend" | "cancel") {
    setBusy(action);
    try {
      const res = await authenticatedJsonFetch("/api/enterprise-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          inviteeKind: "wealth_partner",
          entityId: partnerId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error?.message || `Action ${action} failed`);
      }
      if (json.data?.activationUrl) {
        setLastLink(String(json.data.activationUrl));
      }
      if (action === "send" || action === "resend") {
        toast.success(
          `Invitation ${action === "resend" ? "resent" : "sent"} from ${json.data?.email?.fromEmail || "configured sender"}`,
        );
      } else if (action === "generate") {
        toast.success("Activation link generated");
      } else {
        toast.success("Invitation cancelled");
        setLastLink(null);
      }
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    if (!lastLink) {
      toast.message("Generate or send an invitation first to copy the link");
      return;
    }
    try {
      await navigator.clipboard.writeText(lastLink);
      setCopied(true);
      toast.success("Activation link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy link");
    }
  }

  const current = state?.current;
  const status = current?.status;
  const canCancel =
    status === "draft" || status === "link_generated" || status === "invite_sent";
  const activated = status === "activated";

  return (
    <Card className="sm:col-span-2 lg:col-span-4">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Partner Activation</CardTitle>
          <Badge
            variant="outline"
            className={cn("text-[10px] font-semibold uppercase", statusTone(status))}
          >
            {status
              ? ENTERPRISE_INVITATION_STATUS_LABELS[status]
              : "Draft"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading invitation state…
          </p>
        ) : (
          <>
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Recipient email</p>
                <p className="font-medium text-foreground">
                  {current?.recipientEmail || partnerEmail || "— Add email on Profile"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Sender (Enterprise Communication)</p>
                <p className="font-medium text-foreground">
                  {state?.sender
                    ? `${state.sender.displayName} <${state.sender.senderEmail}>${
                        state.sender.profileCode ? ` · ${state.sender.profileCode}` : ""
                      }`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Expires</p>
                <p className="font-medium text-foreground">
                  {current?.expiresAt
                    ? new Date(current.expiresAt).toLocaleString("en-IN")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last sent</p>
                <p className="font-medium text-foreground">
                  {current?.lastSentAt
                    ? new Date(current.lastSentAt).toLocaleString("en-IN")
                    : "—"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-[11px]"
                disabled={Boolean(busy) || activated}
                onClick={() => void runAction("generate")}
              >
                {busy === "generate" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Link2 className="h-3.5 w-3.5" />
                )}
                Generate Activation Link
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1 text-[11px]"
                disabled={Boolean(busy) || activated}
                onClick={() => void runAction(status === "invite_sent" ? "resend" : "send")}
              >
                {busy === "send" || busy === "resend" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mail className="h-3.5 w-3.5" />
                )}
                {status === "invite_sent" ? "Resend Invitation" : "Send Invitation"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-[11px]"
                disabled={!lastLink || Boolean(busy)}
                onClick={() => void copyLink()}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                Copy Activation Link
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-[11px] text-destructive"
                disabled={!canCancel || Boolean(busy)}
                onClick={() => void runAction("cancel")}
              >
                {busy === "cancel" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Ban className="h-3.5 w-3.5" />
                )}
                Cancel Invitation
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1 text-[11px]"
                disabled={Boolean(busy)}
                onClick={() => void refresh()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>

            {lastLink ? (
              <p className="truncate rounded border border-border bg-muted/40 px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                {lastLink}
              </p>
            ) : null}

            {(state?.audits?.length ?? 0) > 0 ? (
              <div className="space-y-1 border-t border-border pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Activation audit
                </p>
                <ul className="max-h-36 space-y-1 overflow-y-auto text-[11px]">
                  {state!.audits.map((a) => (
                    <li key={a.id} className="flex flex-wrap gap-x-2 text-muted-foreground">
                      <span className="font-medium text-foreground">{a.eventType}</span>
                      <span>{a.actorLabel}</span>
                      <span>{new Date(a.createdAt).toLocaleString("en-IN")}</span>
                      {a.detail ? <span className="truncate">· {a.detail}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
