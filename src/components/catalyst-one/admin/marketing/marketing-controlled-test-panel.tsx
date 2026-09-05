"use client";

/**
 * CO-MARKETING-REDESIGN-008 — Controlled dry-run test send.
 * Lives in a separate file so the builder page never contains test_send.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  MARKETING_PRODUCTION_LANE_TITLE,
  MARKETING_TEST_LANE_TITLE,
  MARKETING_TEST_SEND_ALLOWED_ADDRESSES,
  MARKETING_TEST_SEND_CONFIRMATION_PHRASE,
  MARKETING_TEST_SEND_DRY_RUN_NOTICE,
} from "@/constants/enterprise-marketing-engine";
import type { MarketingTestSendHistoryEntry } from "@/lib/enterprise-marketing-engine/test-send-safety";
import { toast } from "sonner";

type Envelope<T> = { success: boolean; data?: T; error?: { message?: string } };

export function MarketingControlledTestPanel({
  campaignId,
  history,
  onHistory,
}: {
  campaignId: string;
  history: MarketingTestSendHistoryEntry[];
  onHistory: (rows: MarketingTestSendHistoryEntry[]) => void;
}) {
  const [recipient, setRecipient] = useState<string>(MARKETING_TEST_SEND_ALLOWED_ADDRESSES[0] ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);

  async function runDryRun() {
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_send",
          campaignId,
          testRecipientEmail: recipient,
          testSendConfirmed: confirmed,
          testSendConfirmationPhrase: phrase,
        }),
      });
      const body = (await res.json()) as Envelope<{
        history: MarketingTestSendHistoryEntry;
        actuallySent: boolean;
        notice: string;
      }>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message ?? "Dry-run test failed");
      }
      if (body.data?.history) onHistory([body.data.history, ...history]);
      toast.message(body.data?.notice ?? MARKETING_TEST_SEND_DRY_RUN_NOTICE);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dry-run test failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mkt-test-lane" aria-label={MARKETING_TEST_LANE_TITLE}>
      <h3 className="font-semibold">{MARKETING_TEST_LANE_TITLE}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        No real email was delivered. This was a dry-run of the customer-facing render path.
      </p>
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="mkt-test-recipient">Internal test recipient allowlist</Label>
        <Input
          id="mkt-test-recipient"
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
          placeholder={MARKETING_TEST_SEND_ALLOWED_ADDRESSES[0]}
        />
        <p className="text-xs text-muted-foreground">Allowed: {MARKETING_TEST_SEND_ALLOWED_ADDRESSES.join(", ")}</p>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        I understand no real email will be delivered.
      </label>
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="mkt-test-phrase">Type {MARKETING_TEST_SEND_CONFIRMATION_PHRASE} to confirm</Label>
        <Input id="mkt-test-phrase" value={phrase} onChange={(event) => setPhrase(event.target.value)} />
      </div>
      <Button type="button" className="mt-3" disabled={busy || !confirmed} onClick={() => void runDryRun()}>
        Run dry-run test
      </Button>
      <h4 className="mt-4 text-sm font-semibold">Test history</h4>
      <ul className="mt-2 space-y-2 text-sm">
        {history.map((row) => (
          <li key={row.id} className="rounded-lg border p-3">
            <p>Requester: {row.requesterUserId || "Unknown"}</p>
            <p>Recipient: {row.recipientEmail}</p>
            <p>Campaign version: {row.campaignVersionNumber}</p>
            <p>Timestamp: {row.timestamp}</p>
            <p>Adapter result: {row.adapterResult}</p>
            <p>Actually sent: {String(row.actuallySent)}</p>
            <p>Failure reason: {row.failureReason || "None"}</p>
            <p>{row.notice}</p>
          </li>
        ))}
        {!history.length ? <li className="text-muted-foreground">No dry-run tests recorded yet.</li> : null}
      </ul>
      <p className="sr-only">{MARKETING_PRODUCTION_LANE_TITLE} stays visually separated from this lane.</p>
    </section>
  );
}
