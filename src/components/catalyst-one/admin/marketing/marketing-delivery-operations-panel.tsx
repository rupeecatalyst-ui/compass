"use client";

/**
 * CO-MARKETING-REDESIGN-009 — Delivery operations (separate file so the builder
 * page never contains run_next_batch / test_send strings).
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  MARKETING_BATCH_CONFIRMATION_PHRASE,
  MARKETING_DELIVERY_OPERATION_LABELS,
  MARKETING_LIVE_PROVIDER_SENDING_DISABLED,
  MARKETING_PERMISSIONS,
  MARKETING_RETRY_CONFIRMATION_PHRASE,
  MARKETING_STOP_CONFIRMATION_PHRASE,
} from "@/constants/enterprise-marketing-engine";
import { hasMarketingPermission, type MarketingPermissionActor } from "@/lib/enterprise-marketing-engine/permissions";
import type { MarketingDeliveryOperationsDisplay } from "@/lib/enterprise-marketing-engine/readiness-review";
import { toast } from "sonner";

type Envelope<T> = { success: boolean; data?: T; error?: { message?: string } };

export function MarketingDeliveryOperationsPanel({
  campaignId,
  actor,
  display,
  onRefresh,
}: {
  campaignId: string;
  actor: MarketingPermissionActor;
  display: MarketingDeliveryOperationsDisplay;
  onRefresh: () => void;
}) {
  const [stopPhrase, setStopPhrase] = useState("");
  const [batchPhrase, setBatchPhrase] = useState("");
  const [retryPhrase, setRetryPhrase] = useState("");
  const [busy, setBusy] = useState(false);

  const canPause = hasMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_PAUSE);
  const canStop = hasMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_STOP);
  const canRun = hasMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_RUN);
  const canRetry = hasMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_RETRY);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as Envelope<unknown>;
      if (!res.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Delivery operation failed");
      }
      toast.message(MARKETING_LIVE_PROVIDER_SENDING_DISABLED);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delivery operation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mkt-delivery-ops mkt-cc-panel space-y-4 p-6" aria-label="Delivery operations">
      <div>
        <h3 className="font-semibold">Delivery operations</h3>
        <p className="mt-1 text-sm text-muted-foreground">{MARKETING_LIVE_PROVIDER_SENDING_DISABLED}</p>
      </div>
      <dl className="grid gap-2 text-sm md:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Current batch</dt>
          <dd>{display.currentBatch}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Next batch</dt>
          <dd>{display.nextBatch}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Completed recipients</dt>
          <dd>{display.completedRecipients}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Remaining recipients</dt>
          <dd>{display.remainingRecipients}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Failures</dt>
          <dd>{display.failures}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last worker heartbeat</dt>
          <dd>{display.lastWorkerHeartbeat}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Lease status</dt>
          <dd>{display.leaseStatus}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Next scheduled execution</dt>
          <dd>{display.nextScheduledExecution}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy || !canPause}
          title={canPause ? undefined : "Requires pause permission"}
          onClick={() => void post({ action: "transition", campaignId, lifecycleAction: "PAUSE" })}
        >
          {MARKETING_DELIVERY_OPERATION_LABELS.pause}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy || !canPause}
          title={canPause ? undefined : "Requires pause permission"}
          onClick={() => void post({ action: "transition", campaignId, lifecycleAction: "RESUME" })}
        >
          {MARKETING_DELIVERY_OPERATION_LABELS.resume}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || !canRun}
          title={canRun ? undefined : "Requires run permission"}
          onClick={() =>
            void post({
              action: "simulate_launch",
              campaignId,
            })
          }
        >
          Simulate launch
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="mkt-stop-confirm">Type {MARKETING_STOP_CONFIRMATION_PHRASE} to Stop</Label>
          <Input id="mkt-stop-confirm" value={stopPhrase} onChange={(e) => setStopPhrase(e.target.value)} />
          <Button
            type="button"
            variant="destructive"
            disabled={busy || !canStop}
            title={canStop ? undefined : "Requires stop permission"}
            onClick={() =>
              void post({
                action: "transition",
                campaignId,
                lifecycleAction: "STOP",
                confirmed: true,
                confirmationPhrase: stopPhrase,
              })
            }
          >
            {MARKETING_DELIVERY_OPERATION_LABELS.stop}
          </Button>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mkt-batch-confirm">Type {MARKETING_BATCH_CONFIRMATION_PHRASE} to run the next batch</Label>
          <Input id="mkt-batch-confirm" value={batchPhrase} onChange={(e) => setBatchPhrase(e.target.value)} />
          <Button
            type="button"
            disabled={busy || !canRun}
            title={canRun ? undefined : "Requires run permission"}
            onClick={() =>
              void post({
                action: "run_next_batch",
                campaignId,
                confirmed: true,
                confirmationPhrase: batchPhrase,
              })
            }
          >
            {MARKETING_DELIVERY_OPERATION_LABELS.runNextBatch}
          </Button>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mkt-retry-confirm">Type {MARKETING_RETRY_CONFIRMATION_PHRASE} to retry failures</Label>
          <Input id="mkt-retry-confirm" value={retryPhrase} onChange={(e) => setRetryPhrase(e.target.value)} />
          <Button
            type="button"
            variant="outline"
            disabled={busy || !canRetry}
            title={canRetry ? undefined : "Requires retry permission"}
            onClick={() =>
              void post({
                action: "retry_eligible_failures",
                campaignId,
                confirmed: true,
                confirmationPhrase: retryPhrase,
              })
            }
          >
            {MARKETING_DELIVERY_OPERATION_LABELS.retry}
          </Button>
        </div>
      </div>
    </section>
  );
}
