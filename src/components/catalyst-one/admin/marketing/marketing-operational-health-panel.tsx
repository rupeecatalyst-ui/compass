"use client";

/**
 * CO-MARKETING-REDESIGN-020 — Operational health screen.
 * Every field is durable or labelled simulated. Never live-send telemetry.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  MARKETING_OPERATIONAL_HEALTH_NOTICE,
  MARKETING_TEST_MODE_BANNER,
} from "@/constants/enterprise-marketing-engine";
import type { MarketingHealthField, MarketingOperationalHealthSnapshot } from "@/types/enterprise-marketing-recovery";
import { MarketingModuleNav } from "./marketing-module-nav";
import { toast } from "sonner";
import "@/styles/marketing-command-centre.css";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

function HealthCard(props: { label: string; field: MarketingHealthField<string | number | null> }) {
  const value =
    props.field.value == null || props.field.value === ""
      ? "Unavailable"
      : String(props.field.value);
  const simulated = props.field.source === "simulated";
  return (
    <article className="mkt-cc-card" aria-label={props.label}>
      <div className="mkt-cc-kicker">{props.label}</div>
      <p className={`mt-1 text-base font-semibold ${simulated ? "text-muted-foreground" : "text-foreground"}`}>
        {value}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {simulated ? "Simulated" : "Durable"}
      </p>
      {props.field.note ? (
        <p className="mt-1 text-xs leading-snug text-muted-foreground">{props.field.note}</p>
      ) : null}
    </article>
  );
}

export function MarketingOperationalHealthPanel() {
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [snapshot, setSnapshot] = useState<MarketingOperationalHealthSnapshot | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setUnavailable(false);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/operational-health");
      const body = (await res.json()) as ApiEnvelope<MarketingOperationalHealthSnapshot>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Failed to load operational health");
      }
      setSnapshot(body.data);
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

  const leaseLabel = snapshot
    ? snapshot.activeLease.value.holderId
      ? `${snapshot.activeLease.value.holderId} · ${snapshot.activeLease.value.pauseState ?? "none"}`
      : snapshot.activeLease.value.pauseState ?? "none"
    : null;

  return (
    <div className="mkt-cc">
      <div className="mkt-cc-page space-y-5">
        <MarketingModuleNav activeId="operational-health" />
        <div className="mkt-cc-banner">{MARKETING_TEST_MODE_BANNER}</div>
        <div>
          <p className="mkt-cc-kicker">Operations</p>
          <h1 className="mkt-cc-title">Operational health</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{MARKETING_OPERATIONAL_HEALTH_NOTICE}</p>
        </div>

        {unavailable ? (
          <section className="mkt-cc-panel space-y-2" role="alert">
            <ShieldAlert className="h-5 w-5" />
            <p className="text-sm">Operational health is unavailable for this organisation.</p>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Retry
            </Button>
          </section>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : snapshot ? (
          <div className="mkt-cc-grid">
            <HealthCard label="Worker status" field={{ ...snapshot.workerStatus, value: snapshot.workerStatus.value }} />
            <HealthCard label="Last heartbeat" field={snapshot.lastHeartbeat} />
            <HealthCard
              label="Active lease"
              field={{
                value: leaseLabel,
                source: snapshot.activeLease.source,
                note: snapshot.activeLease.note,
              }}
            />
            <HealthCard label="Next scheduled run" field={snapshot.nextScheduledRun} />
            <HealthCard label="Delayed batches" field={snapshot.delayedBatches} />
            <HealthCard label="Exhausted retries" field={snapshot.exhaustedRetries} />
            <HealthCard label="Quarantined recipients" field={snapshot.quarantinedRecipients} />
            <HealthCard label="Provider availability" field={snapshot.providerAvailability} />
            <HealthCard label="Scheduler status" field={snapshot.schedulerStatus} />
            <HealthCard label="Processing latency" field={snapshot.processingLatencyMs} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{MARKETING_OPERATIONAL_HEALTH_NOTICE}</p>
        )}
      </div>
    </div>
  );
}
