"use client";

/**
 * CO-ADMIN-004 — Production Reset & Demo Data Cleanup Wizard
 * Super Administrator only. Disabled by default until PRODUCTION_RESET_ENABLED=true.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { getAccessToken } from "@/lib/api-client";
import {
  PRODUCTION_RESET_ENTITY_LABELS,
  PRODUCTION_RESET_PRESET_META,
  PRODUCTION_RESET_TYPED_CONFIRMATION,
  EMPTY_SELECTION,
  selectionForPreset,
} from "@/constants/production-reset";
import type {
  CutoverAnalysisResult,
  ProductionResetAnalyseResult,
  ProductionResetEntitySelection,
  ProductionResetExecutionResult,
  ProductionResetFilters,
  ProductionResetImpactAnalysis,
  ProductionResetPresetId,
  ProductionResetRunSummary,
} from "@/types/production-reset";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type StatusPayload = {
  featureEnabled: boolean;
  persistenceReady: boolean;
  featurePermission: string;
  typedConfirmation: string;
  note: string;
};

const STEPS = [
  "Overview",
  "Analyse",
  "Options",
  "Filters",
  "Impact",
  "Safety",
  "Report",
] as const;

async function apiGet<T>(view: string): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`/api/admin/production-reset?view=${view}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  }
  return json.data as T;
}

async function apiPost<T>(body: Record<string, unknown>): Promise<T> {
  const token = getAccessToken();
  const res = await fetch("/api/admin/production-reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  }
  return json.data as T;
}

export function ProductionResetWizard() {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [analyse, setAnalyse] = useState<ProductionResetAnalyseResult | null>(null);
  const [cutover, setCutover] = useState<CutoverAnalysisResult | null>(null);
  const [impact, setImpact] = useState<ProductionResetImpactAnalysis | null>(null);
  const [result, setResult] = useState<ProductionResetExecutionResult | null>(null);
  const [runs, setRuns] = useState<ProductionResetRunSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ackOverview, setAckOverview] = useState(false);
  const [preset, setPreset] = useState<ProductionResetPresetId>("demo_data_only");
  const [selection, setSelection] = useState<ProductionResetEntitySelection>(
    selectionForPreset("demo_data_only"),
  );
  const [filters, setFilters] = useState<ProductionResetFilters>({
    createdBefore: null,
    createdByUserIds: [],
    opportunityPrefixes: [],
    contactPrefixes: [],
    demoHeuristics: true,
    importBatchOnly: false,
  });
  const [prefixInput, setPrefixInput] = useState("DEMO-,TEST-,UAT-");
  const [contactPrefixInput, setContactPrefixInput] = useState("Demo,Test");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [typedConfirm, setTypedConfirm] = useState("");
  const [ackIrreversible, setAckIrreversible] = useState(false);
  const [secondConfirm, setSecondConfirm] = useState(false);

  const featureEnabled = Boolean(status?.featureEnabled);
  const canMutate = featureEnabled && Boolean(status?.persistenceReady);

  const loadStatus = useCallback(async () => {
    setError(null);
    try {
      const data = await apiGet<StatusPayload>("status");
      setStatus(data);
      try {
        const runData = await apiGet<{ runs: ProductionResetRunSummary[] }>("runs");
        setRuns(runData.runs);
      } catch {
        /* runs require prisma table — ignore until migrated */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load status");
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (preset !== "custom") {
      setSelection(selectionForPreset(preset));
      if (preset === "demo_data_only") {
        setFilters((f) => ({ ...f, demoHeuristics: true }));
      }
    }
  }, [preset]);

  const parsedFilters = useMemo<ProductionResetFilters>(
    () => ({
      ...filters,
      opportunityPrefixes: prefixInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      contactPrefixes: contactPrefixInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }),
    [filters, prefixInput, contactPrefixInput],
  );

  const runAnalyse = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, cutoverData] = await Promise.all([
        apiGet<ProductionResetAnalyseResult>("analyse"),
        apiGet<CutoverAnalysisResult>("cutover"),
      ]);
      setAnalyse(data);
      setCutover(cutoverData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyse failed");
    } finally {
      setLoading(false);
    }
  };

  const runImpact = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<{ impact: ProductionResetImpactAnalysis }>({
        action: "impact",
        preset,
        selection,
        filters: parsedFilters,
      });
      setImpact(data.impact);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impact analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const runDryRun = async () => {
    if (!canMutate) {
      setError("Production Reset is disabled. Enable PRODUCTION_RESET_ENABLED=true first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<ProductionResetExecutionResult>({
        action: "dry_run",
        mode: "dry_run",
        preset,
        selection,
        filters: parsedFilters,
        reason: reason || "Dry-run preview before production cutover",
      });
      setResult(data);
      setImpact(data.impact);
      setStep(6);
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dry-run failed");
    } finally {
      setLoading(false);
    }
  };

  const runExecute = async () => {
    if (!canMutate) {
      setError("Production Reset is disabled.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<ProductionResetExecutionResult>({
        action: "execute",
        mode: "execute",
        preset,
        selection,
        filters: parsedFilters,
        reason,
        password,
        typedConfirmation: typedConfirm,
        acknowledgedIrreversible: ackIrreversible && secondConfirm,
      });
      setResult(data);
      setPassword("");
      setTypedConfirm("");
      setStep(6);
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Execute failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleEntity = (key: keyof ProductionResetEntitySelection) => {
    setPreset("custom");
    setSelection((s) => ({ ...s, [key]: !s[key] }));
  };

  const nextDisabled =
    (step === 0 && !ackOverview) ||
    (step === 1 && !analyse) ||
    (step === 4 && !impact) ||
    loading;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <PageHeader
        title="Production Reset"
        description="Controlled Super Administrator wizard to remove demo and transactional business data while preserving enterprise configuration."
      />

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="flex gap-3 pt-6">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-amber-950">
              {featureEnabled
                ? "Feature flag is ON — dry-run and execute are available to Super Admin."
                : "Feature is DISABLED by default. No deletion can run until PRODUCTION_RESET_ENABLED=true."}
            </p>
            <p className="text-muted-foreground">
              Permission: {status?.featurePermission ?? "admin.system_tools.production_reset"} ·
              Persistence: {status?.persistenceReady ? "ready" : "not prisma"} ·{" "}
              {status?.note}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              i === step
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Production Reset Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-4 font-medium text-destructive">
              This operation permanently removes selected business transaction data. System
              configuration, users and master data will remain intact.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Not a database truncate utility</li>
              <li>Transactional soft-delete inside a database transaction (rollback on failure)</li>
              <li>Dry-run recommended before every execute</li>
              <li>Every run writes an immutable audit record</li>
            </ul>
            <label className="flex items-start gap-2">
              <Checkbox
                checked={ackOverview}
                onCheckedChange={(v) => setAckOverview(Boolean(v))}
              />
              <span>I understand this wizard removes transactional business data and is irreversible for hard-deleted timeline events.</span>
            </label>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Analyse current database</CardTitle>
            <Button type="button" size="sm" onClick={() => void runAnalyse()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run analysis"}
            </Button>
          </CardHeader>
          <CardContent>
            {!analyse ? (
              <p className="text-sm text-muted-foreground">
                Run analysis to load entity counts, date ranges, and estimated impact.
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm">
                  Estimated active transactional records:{" "}
                  <strong>{analyse.estimatedRecordsAffected}</strong>
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-2 pr-3">Entity</th>
                        <th className="py-2 pr-3">Active</th>
                        <th className="py-2 pr-3">Already deleted</th>
                        <th className="py-2 pr-3">Created range</th>
                        <th className="py-2">Last modified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyse.entities.map((e) => (
                        <tr key={e.entity} className="border-b border-border/60">
                          <td className="py-2 pr-3 font-medium">{e.entity}</td>
                          <td className="py-2 pr-3">{e.activeCount}</td>
                          <td className="py-2 pr-3">{e.alreadyDeletedCount}</td>
                          <td className="py-2 pr-3 text-xs text-muted-foreground">
                            {e.earliestCreatedAt
                              ? `${e.earliestCreatedAt.slice(0, 10)} → ${e.latestCreatedAt?.slice(0, 10) ?? "—"}`
                              : "—"}
                          </td>
                          <td className="py-2 text-xs text-muted-foreground">
                            {e.latestUpdatedAt?.slice(0, 19).replace("T", " ") ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {analyse.warnings.map((w) => (
                  <p key={w} className="text-xs text-amber-800">
                    {w}
                  </p>
                ))}
                {cutover && (
                  <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <p className="text-sm font-semibold text-foreground">
                      CO-CUTOVER-001 — Demo vs live (analysis only)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Deletion performed:{" "}
                      <strong>{cutover.deletionPerformed ? "Yes" : "No"}</strong>
                      {" · "}
                      Awaiting administrator review before any execute.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="py-2 pr-3">Entity</th>
                            <th className="py-2 pr-3">Active</th>
                            <th className="py-2 pr-3">Demo candidates</th>
                            <th className="py-2">Live retained (est.)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cutover.demoVsLive.map((row) => (
                            <tr key={row.entity} className="border-b border-border/60">
                              <td className="py-2 pr-3 font-medium">{row.entity}</td>
                              <td className="py-2 pr-3">{row.totalActive}</td>
                              <td className="py-2 pr-3 text-amber-900">{row.demoCandidateCount}</td>
                              <td className="py-2 text-emerald-800">{row.liveRetainedEstimate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Demo impact preview matched{" "}
                      <strong>{cutover.demoImpactPreview.totalMatched}</strong> records
                      (dry-run scope — not deleted).
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reset options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-3">
              {(Object.keys(PRODUCTION_RESET_PRESET_META) as ProductionResetPresetId[]).map(
                (id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPreset(id)}
                    className={cn(
                      "rounded-lg border p-3 text-left text-sm",
                      preset === id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <div className="font-medium">{PRODUCTION_RESET_PRESET_META[id].title}</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {PRODUCTION_RESET_PRESET_META[id].description}
                    </p>
                  </button>
                ),
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(EMPTY_SELECTION) as (keyof ProductionResetEntitySelection)[]).map(
                (key) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selection[key]}
                      onCheckedChange={() => toggleEntity(key)}
                    />
                    {PRODUCTION_RESET_ENTITY_LABELS[key]}
                  </label>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Demo data detection filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cutover">Created before (cutover date)</Label>
              <Input
                id="cutover"
                type="date"
                value={filters.createdBefore?.slice(0, 10) ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    createdBefore: e.target.value
                      ? new Date(`${e.target.value}T23:59:59.999Z`).toISOString()
                      : null,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opp-prefix">Opportunity / Deal prefixes</Label>
              <Input
                id="opp-prefix"
                value={prefixInput}
                onChange={(e) => setPrefixInput(e.target.value)}
                placeholder="DEMO-,TEST-"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-prefix">Contact name prefixes</Label>
              <Input
                id="contact-prefix"
                value={contactPrefixInput}
                onChange={(e) => setContactPrefixInput(e.target.value)}
              />
            </div>
            <div className="space-y-3 pt-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(filters.demoHeuristics)}
                  onCheckedChange={(v) =>
                    setFilters((f) => ({ ...f, demoHeuristics: Boolean(v) }))
                  }
                />
                Demo heuristics (DEMO / TEST / UAT / SAMPLE)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(filters.importBatchOnly)}
                  onCheckedChange={(v) =>
                    setFilters((f) => ({ ...f, importBatchOnly: Boolean(v) }))
                  }
                />
                Import-batch deals only
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Impact analysis</CardTitle>
            <Button type="button" size="sm" onClick={() => void runImpact()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh impact"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!impact ? (
              <p className="text-muted-foreground">Compute impact before continuing to safety controls.</p>
            ) : (
              <>
                <p>
                  Records matched: <strong>{impact.totalMatched}</strong> · Estimated duration:{" "}
                  <strong>~{impact.estimatedDurationMs} ms</strong>
                </p>
                <ul className="space-y-1">
                  {impact.lines.map((line) => (
                    <li key={`${line.entity}-${line.action}`}>
                      {String(line.entity)}: {line.matchedCount} ({line.action}
                      {line.dependentOf ? ` via ${line.dependentOf}` : ""})
                    </li>
                  ))}
                </ul>
                {impact.relationshipImpact.map((w) => (
                  <p key={w} className="text-xs text-muted-foreground">
                    {w}
                  </p>
                ))}
                {impact.orphanRisks.map((w) => (
                  <p key={w} className="text-xs text-amber-800">
                    {w}
                  </p>
                ))}
                {impact.warnings.map((w) => (
                  <p key={w} className="text-xs text-amber-800">
                    {w}
                  </p>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Safety controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm font-medium text-destructive">
              Irreversible for hard-deleted timeline events. Soft-deleted records may be recoverable via Recovery Center where adapters exist.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reason">Business reason (required)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. UAT cleanup prior to production cutover"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Current administrator password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!canMutate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="typed">
                Type {PRODUCTION_RESET_TYPED_CONFIRMATION} to confirm
              </Label>
              <Input
                id="typed"
                value={typedConfirm}
                onChange={(e) => setTypedConfirm(e.target.value)}
                disabled={!canMutate}
              />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={ackIrreversible}
                onCheckedChange={(v) => setAckIrreversible(Boolean(v))}
              />
              I acknowledge this operation may permanently remove selected transactional data.
            </label>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={secondConfirm}
                onCheckedChange={(v) => setSecondConfirm(Boolean(v))}
              />
              Second confirmation — I have reviewed the impact analysis and dry-run report.
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={!canMutate || loading || reason.trim().length < 8}
                onClick={() => void runDryRun()}
              >
                Dry-run (analyse only)
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={
                  !canMutate ||
                  loading ||
                  reason.trim().length < 8 ||
                  !ackIrreversible ||
                  !secondConfirm ||
                  typedConfirm !== PRODUCTION_RESET_TYPED_CONFIRMATION ||
                  !password
                }
                onClick={() => void runExecute()}
              >
                Execute production reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 6 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Cutover / dry-run report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!result ? (
              <p className="text-muted-foreground">
                Complete a dry-run or execute to generate the Production Reset Report.
              </p>
            ) : (
              <>
                <p className="font-medium">{result.report.title}</p>
                <p>{result.report.summary}</p>
                <p className="text-muted-foreground">
                  Run ID: {result.runId} · Duration: {result.durationMs} ms · Mode:{" "}
                  {result.dryRun ? "dry-run" : "execute"} · Status: {result.status}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 font-medium">Counts removed / matched</p>
                    <ul className="text-xs">
                      {Object.entries(result.countsRemoved).map(([k, v]) => (
                        <li key={k}>
                          {k}: {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 font-medium">Remaining (active)</p>
                    <ul className="text-xs">
                      {Object.entries(result.countsRemaining).map(([k, v]) => (
                        <li key={k}>
                          {k}: {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {result.report.preservedMastersNote}
                </p>
                <p className="text-xs">
                  Report stored in Production Reset run ledger (Document Intelligence handoff via
                  audit record / downloadable JSON in run history).
                </p>
              </>
            )}
            {runs.length > 0 ? (
              <div className="pt-4">
                <p className="mb-2 font-medium">Recent runs</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {runs.slice(0, 8).map((r) => (
                    <li key={r.id}>
                      {r.createdAt.slice(0, 19)} · {r.mode} · {r.status} · {r.reason.slice(0, 60)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0 || loading}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        <Button
          type="button"
          disabled={nextDisabled || step >= STEPS.length - 1}
          onClick={() => {
            const next = Math.min(STEPS.length - 1, step + 1);
            if (step === 1 && !analyse) void runAnalyse();
            if (step === 3 && !impact) void runImpact();
            if (step === 4 && !impact) void runImpact();
            setStep(next);
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
