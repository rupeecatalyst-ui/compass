"use client";

/**
 * CO-AI-G2-W8 — Shadow Mode Dashboard (Product Owner review only).
 * Internal Administration surface — never customer-facing.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticatedJsonFetch } from "@/lib/api-client";
import type { EaoShadowDashboardSnapshot } from "@/types/enterprise-ai-orchestrator/shadow-dashboard";
import { toast } from "sonner";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

function ScorePill({ label, value }: { label: string; value: number }) {
  const tone =
    value >= 75
      ? "border-emerald-700/40 bg-emerald-50 text-emerald-950"
      : value >= 50
        ? "border-amber-700/40 bg-amber-50 text-amber-950"
        : "border-rose-700/40 bg-rose-50 text-rose-950";
  return (
    <div className={`rounded-md border px-3 py-2 ${tone}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ResponseBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border/80 bg-background p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {text.trim() ? text : "—"}
      </p>
    </div>
  );
}

export function ShadowModeDashboardPanel() {
  const [snapshot, setSnapshot] = useState<EaoShadowDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/shadow-mode-dashboard");
      const body = (await res.json()) as ApiEnvelope<EaoShadowDashboardSnapshot>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Failed to load Shadow Mode Dashboard");
      }
      setSnapshot(body.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            CO-AI-G2-W8 · Internal evaluation
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Shadow Mode Dashboard
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Product Owner review of Live SARATHI · Reasoning Model · Gold Standard with
            benchmark, policy, consultation, latency, and cost. Not customer-accessible.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={loading}
          className="gap-1.5"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh
        </Button>
      </header>

      <div
        role="status"
        className="flex items-start gap-2 rounded-md border border-amber-700/35 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      >
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <span className="font-semibold">Product Owner only.</span> No customer access. Live
          SARATHI facing text is never replaced from this desk. Hybrid Cutover is not enabled.
        </p>
      </div>

      {loading && !snapshot ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading evaluation snapshot…
        </div>
      ) : null}

      {snapshot ? (
        <>
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <ScorePill label="Benchmark Score" value={snapshot.averages.benchmarkScore} />
            <ScorePill label="Policy Score" value={snapshot.averages.policyScore} />
            <ScorePill label="Consultation Score" value={snapshot.averages.consultationScore} />
            <ScorePill label="Latency (ms)" value={snapshot.averages.latencyMs} />
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Estimated Cost
              </p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
                ${snapshot.averages.estimatedCostUsd.toFixed(6)}
              </p>
            </div>
          </section>

          <p className="text-xs text-muted-foreground">
            Snapshot <code className="text-[11px]">{snapshot.snapshotId}</code> · v
            {snapshot.version} · {snapshot.rows.length} rows · audience=
            {snapshot.audience}
          </p>

          <div className="space-y-4">
            {snapshot.rows.map((row, index) => (
              <article
                key={row.rowId}
                className="rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Row {index + 1}
                      {row.productPath ? ` · ${row.productPath}` : ""}
                    </p>
                    <h2 className="mt-0.5 text-base font-semibold text-foreground">
                      {row.customerUtterance}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs tabular-nums text-muted-foreground">
                    <span>
                      Benchmark <strong className="text-foreground">{row.benchmarkScore}</strong>
                    </span>
                    <span>
                      Policy <strong className="text-foreground">{row.policyScore}</strong>
                    </span>
                    <span>
                      Consultation{" "}
                      <strong className="text-foreground">{row.consultationScore}</strong>
                    </span>
                    <span>
                      Latency <strong className="text-foreground">{row.latencyMs}ms</strong>
                    </span>
                    <span>
                      Cost{" "}
                      <strong className="text-foreground">
                        ${row.estimatedCostUsd.toFixed(6)}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  <ResponseBlock
                    title="Current SARATHI Response"
                    text={row.currentSarathiResponse}
                  />
                  <ResponseBlock
                    title="Reasoning Model Response"
                    text={row.reasoningModelResponse}
                  />
                  <ResponseBlock
                    title="Gold Standard Response"
                    text={row.goldStandardResponse}
                  />
                </div>

                {row.recommendation ? (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">Recommendation: </span>
                    {row.recommendation}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
