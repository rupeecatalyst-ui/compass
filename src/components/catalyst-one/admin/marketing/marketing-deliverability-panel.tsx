"use client";

/**
 * CO-MARKETING-REDESIGN-013 — Honest deliverability readiness.
 * Simulated fixture states are never shown as verified.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  MARKETING_DELIVERABILITY_UNAVAILABLE_NOTICE,
  MARKETING_SENDER_SIMULATED_NOTICE,
  MARKETING_TEST_MODE_BANNER,
} from "@/constants/enterprise-marketing-engine";
import type { MarketingDeliverabilityCheck } from "@/lib/enterprise-marketing-engine/deliverability-readiness";
import { MarketingModuleNav } from "./marketing-module-nav";
import { toast } from "sonner";
import "@/styles/marketing-command-centre.css";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

type Readiness = {
  simulated: true;
  anyVerified: false;
  lastValidationAt: string | null;
  freshUntil: string | null;
  notice: string;
  checks: MarketingDeliverabilityCheck[];
};

type SenderRow = {
  id: string;
  organizationId?: string;
  displayName: string;
  fromAddress: string;
  replyTo: string | null;
  approvalStatus: string;
  verificationStatus: string;
  simulated: boolean;
  isDefault: boolean;
  channel: string;
  permittedCampaignCategories?: string[];
  createdByUserId?: string | null;
  approvedByUserId?: string | null;
  lastValidationAt?: string | null;
};

export function MarketingDeliverabilityPanel() {
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [senders, setSenders] = useState<SenderRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setUnavailable(false);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/deliverability");
      const body = (await res.json()) as ApiEnvelope<{
        readiness: Readiness;
        senders: SenderRow[];
      }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Failed to load deliverability");
      }
      setReadiness(body.data.readiness);
      setSenders(body.data.senders);
    } catch (e) {
      setUnavailable(true);
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mkt-cc">
      <div className="mkt-cc-page space-y-5">
        <MarketingModuleNav activeId="deliverability" />
        <div className="mkt-cc-banner">{MARKETING_TEST_MODE_BANNER}</div>
        <div>
          <p className="mkt-cc-kicker">Readiness</p>
          <h1 className="mkt-cc-title">Sender identity and deliverability</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{MARKETING_SENDER_SIMULATED_NOTICE}</p>
        </div>

        {unavailable ? (
          <section className="mkt-cc-panel space-y-2">
            <ShieldAlert className="h-5 w-5" />
            <p className="text-sm">{MARKETING_DELIVERABILITY_UNAVAILABLE_NOTICE}</p>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Retry
            </Button>
          </section>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : readiness ? (
          <>
            <p className="text-sm text-muted-foreground">
              Last validation: {readiness.lastValidationAt ?? "Unavailable"} · Fresh until:{" "}
              {readiness.freshUntil ?? "Unavailable"} · Verified simulated checks: none
            </p>
            <div className="mkt-cc-grid">
              {readiness.checks.map((check) => (
                <article key={check.id} className="mkt-cc-card mkt-deliverability-card">
                  <div className="mkt-cc-kicker">{check.label}</div>
                  <div className={`mkt-deliverability-state mkt-deliverability-state-${check.state.toLowerCase()}`}>
                    {check.state.replaceAll("_", " ")}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {check.simulated ? "Simulated observation" : "Live observation"} · not permanent DNS truth
                  </p>
                </article>
              ))}
            </div>
            <section className="mkt-cc-panel space-y-3">
              <h2 className="text-base font-semibold">Sender identities</h2>
              {senders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sender identities for this organisation yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {senders.map((sender) => (
                    <li key={sender.id} className="mkt-consent-row">
                      <div className="font-medium">{sender.displayName}</div>
                      <p className="text-xs text-muted-foreground">
                        {sender.fromAddress}
                        {sender.replyTo ? ` · reply ${sender.replyTo}` : ""} · {sender.channel}
                        {sender.organizationId ? ` · organisation ${sender.organizationId}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Approval {sender.approvalStatus} ·{" "}
                        {sender.simulated
                          ? "verification simulated (not verified)"
                          : `verification ${sender.verificationStatus}`}
                        {sender.isDefault ? " · default" : ""}
                        {sender.permittedCampaignCategories?.length
                          ? ` · categories ${sender.permittedCampaignCategories.join(", ")}`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created by {sender.createdByUserId ?? "system"}
                        {sender.approvedByUserId ? ` · approved by ${sender.approvedByUserId}` : ""}
                        {sender.lastValidationAt ? ` · last validated ${sender.lastValidationAt}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{MARKETING_DELIVERABILITY_UNAVAILABLE_NOTICE}</p>
        )}
      </div>
    </div>
  );
}
