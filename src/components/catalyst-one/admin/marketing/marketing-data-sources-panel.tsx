"use client";

/**
 * CO-MARKETING-MKT-02 — Marketing Data Sources workspace (READ / discover / preview).
 * Never imports the full audience. Never creates Contacts.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  RefreshCw,
  ShieldAlert,
  Database,
  Table2,
  HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { MARKETING_SHEETS_PREVIEW_MAX_ROWS } from "@/constants/enterprise-marketing-engine";
import type { MarketingDataSourceBinding } from "@/types/enterprise-marketing-data-source";
import type { MarketingDatasetDescriptor } from "@/lib/enterprise-marketing-engine/ports/data-source.port";
import { MarketingModuleNav } from "./marketing-module-nav";
import { toast } from "sonner";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

type ModeInfo = {
  sheetsMode: "off" | "fixture" | "live";
  sheetsReadEnabled: boolean;
  audienceImportEnabled: boolean;
  previewMaxRows: number;
  pageMaxRows: number;
};

type PreviewPayload = {
  schema: {
    headers: string[];
    schemaFingerprint: string;
    detectedEmailColumn?: string | null;
    detectedPhoneColumn?: string | null;
    detectedExternalKeyColumn?: string | null;
  };
  rows: Record<string, unknown>[];
  sourceRowNumbers: number[];
  qualitySummary: {
    sampleSize: number;
    withFingerprint: number;
    issueCounts: Record<string, number>;
  };
  notice: string;
  cappedAt: number;
};

export function MarketingDataSourcesPanel() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<ModeInfo | null>(null);
  const [bindings, setBindings] = useState<MarketingDataSourceBinding[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [datasets, setDatasets] = useState<MarketingDatasetDescriptor[]>([]);
  const [datasetId, setDatasetId] = useState<string>("");
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [estimate, setEstimate] = useState<{
    dataRowEstimate: number | null;
    approximateRowCount: number | null;
    method: string;
    note: string;
  } | null>(null);
  const [health, setHealth] = useState<{ ok: boolean; message?: string; mode?: string } | null>(
    null,
  );
  const [newName, setNewName] = useState("Marketing Master Database");
  const [newSpreadsheetId, setNewSpreadsheetId] = useState("");

  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/data-sources");
      const body = (await res.json()) as ApiEnvelope<{
        mode: ModeInfo;
        bindings: MarketingDataSourceBinding[];
      }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Failed to load data sources");
      }
      setMode(body.data.mode);
      setBindings(body.data.bindings);
      if (!selectedId && body.data.bindings[0]) {
        setSelectedId(body.data.bindings[0].id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load data sources");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const selected = bindings.find((b) => b.id === selectedId) ?? null;

  const runBindingView = async (view: string, withDataset = false) => {
    if (!selectedId) {
      toast.error("Select a data source first");
      return;
    }
    if (withDataset && !datasetId) {
      toast.error("Select a sheet/tab first");
      return;
    }
    setBusy(true);
    try {
      const qs = new URLSearchParams({ view });
      if (withDataset) qs.set("datasetId", datasetId);
      if (view === "preview") qs.set("limit", String(MARKETING_SHEETS_PREVIEW_MAX_ROWS));
      const res = await authenticatedJsonFetch(
        `/api/admin/marketing/data-sources/${encodeURIComponent(selectedId)}?${qs}`,
      );
      const body = (await res.json()) as ApiEnvelope<Record<string, unknown>>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || `Failed: ${view}`);
      }
      if (view === "health") {
        setHealth(body.data.health as { ok: boolean; message?: string; mode?: string });
      }
      if (view === "datasets") {
        const list = (body.data.datasets as MarketingDatasetDescriptor[]) ?? [];
        setDatasets(list);
        if (list[0] && !datasetId) setDatasetId(list[0].externalDatasetId);
        toast.success(`Discovered ${list.length} tab(s)`);
      }
      if (view === "preview") {
        setPreview(body.data.preview as PreviewPayload);
      }
      if (view === "estimate") {
        setEstimate(body.data.estimate as typeof estimate);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed: ${view}`);
    } finally {
      setBusy(false);
    }
  };

  const upsertBinding = async () => {
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/data-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: newName,
          spreadsheetId:
            mode?.sheetsMode === "fixture"
              ? "fixture-marketing-master"
              : newSpreadsheetId.trim(),
        }),
      });
      const body = (await res.json()) as ApiEnvelope<{ binding: MarketingDataSourceBinding }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Failed to save binding");
      }
      toast.success("Data source saved (metadata only)");
      setSelectedId(body.data.binding.id);
      await refreshList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save binding");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Marketing Command Center · Data Sources
        </p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Database className="h-6 w-6 text-primary" />
          Marketing Data Sources
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Google Drive → Google Sheet → Sheet/Tab is the raw audience source of truth. Catalyst One
          stores binding metadata only — the 100k+ database is never copied into Supabase.
        </p>
      </header>

      <MarketingModuleNav activeId="data-sources" />

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            MKT-02 safety
          </CardTitle>
          <CardDescription>
            Sheets mode: <strong>{mode?.sheetsMode ?? "…"}</strong>
            {" · "}
            Read: {mode?.sheetsReadEnabled ? "enabled" : "off"}
            {" · "}
            Import: disabled · Send: disabled · Contact/Opportunity: disabled
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Set <code className="text-xs">ENTERPRISE_MARKETING_SHEETS_MODE=fixture</code> for the
          controlled non-production dataset, or <code className="text-xs">live</code> with server
          service-account credentials. Never put private keys in the browser.
        </CardContent>
      </Card>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Configured sources</CardTitle>
                <CardDescription>Organization-scoped binding metadata only.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Select value={selectedId || undefined} onValueChange={setSelectedId}>
                    <SelectTrigger className="min-w-[220px]">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {bindings.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void refreshList()}
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Refresh
                  </Button>
                </div>
                {selected ? (
                  <dl className="grid gap-1 text-sm">
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Spreadsheet ID</dt>
                      <dd className="font-mono text-xs">{selected.spreadsheetId}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Auth</dt>
                      <dd className="font-mono text-xs">{selected.authRef}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Status</dt>
                      <dd>{selected.status}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Last discover</dt>
                      <dd className="text-xs">{selected.lastDiscoverAt ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Last health</dt>
                      <dd className="text-xs">
                        {selected.lastHealthAt
                          ? `${selected.lastHealthOk ? "OK" : "FAIL"} · ${selected.lastHealthMessage ?? ""}`
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">No bindings yet.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busy || !selectedId || !mode?.sheetsReadEnabled}
                    onClick={() => void runBindingView("health")}
                  >
                    <HeartPulse className="mr-1.5 h-3.5 w-3.5" />
                    Health check
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy || !selectedId || !mode?.sheetsReadEnabled}
                    onClick={() => void runBindingView("datasets")}
                  >
                    <Table2 className="mr-1.5 h-3.5 w-3.5" />
                    Discover tabs
                  </Button>
                </div>
                {health ? (
                  <p className={`text-sm ${health.ok ? "text-emerald-700" : "text-destructive"}`}>
                    {health.ok ? "Healthy" : "Unhealthy"} — {health.message}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Add / update binding</CardTitle>
                <CardDescription>
                  Paste a Google Spreadsheet ID (live) or use fixture id. Credentials stay in server
                  env.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mkt-ds-name">Display name</Label>
                  <Input
                    id="mkt-ds-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mkt-ds-sheet">Spreadsheet ID</Label>
                  <Input
                    id="mkt-ds-sheet"
                    placeholder={
                      mode?.sheetsMode === "fixture"
                        ? "fixture-marketing-master"
                        : "1BxiM… (from Google Sheets URL)"
                    }
                    value={
                      mode?.sheetsMode === "fixture"
                        ? "fixture-marketing-master"
                        : newSpreadsheetId
                    }
                    disabled={mode?.sheetsMode === "fixture"}
                    onChange={(e) => setNewSpreadsheetId(e.target.value)}
                  />
                </div>
                <Button
                  disabled={busy || !mode?.sheetsReadEnabled}
                  onClick={() => void upsertBinding()}
                >
                  Save binding
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sheet / tab · sample preview</CardTitle>
              <CardDescription>
                Tabs are discovered dynamically. Preview capped at {MARKETING_SHEETS_PREVIEW_MAX_ROWS}{" "}
                rows — never loads the full audience into the browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[220px] space-y-1.5">
                  <Label>Available tabs</Label>
                  <Select value={datasetId || undefined} onValueChange={setDatasetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Discover tabs first" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.map((d) => (
                        <SelectItem key={d.externalDatasetId} value={d.externalDatasetId}>
                          {d.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  disabled={busy || !datasetId}
                  onClick={() => void runBindingView("estimate", true)}
                >
                  Estimate
                </Button>
                <Button
                  size="sm"
                  disabled={busy || !datasetId}
                  onClick={() => void runBindingView("preview", true)}
                >
                  Preview sample
                </Button>
              </div>

              {estimate ? (
                <p className="text-sm text-muted-foreground">
                  Approx data rows: <strong>{estimate.dataRowEstimate ?? "—"}</strong> (method:{" "}
                  {estimate.method}). {estimate.note}
                </p>
              ) : null}

              {preview ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">{preview.notice}</p>
                  <div className="text-sm">
                    Headers: {preview.schema.headers.join(", ") || "—"}
                    <br />
                    Fingerprint:{" "}
                    <code className="text-xs">{preview.schema.schemaFingerprint}</code>
                    <br />
                    Detected email col: {preview.schema.detectedEmailColumn ?? "—"} · phone:{" "}
                    {preview.schema.detectedPhoneColumn ?? "—"} · external key:{" "}
                    {preview.schema.detectedExternalKeyColumn ?? "—"}
                  </div>
                  <div className="text-sm">
                    Sample quality — size {preview.qualitySummary.sampleSize}, with identity{" "}
                    {preview.qualitySummary.withFingerprint}, issues:{" "}
                    {Object.entries(preview.qualitySummary.issueCounts)
                      .filter(([, n]) => n > 0)
                      .map(([k, n]) => `${k}=${n}`)
                      .join(", ") || "none"}
                  </div>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[480px] text-left text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-2 py-1.5 font-medium">#</th>
                          {preview.schema.headers.slice(0, 6).map((h) => (
                            <th key={h} className="px-2 py-1.5 font-medium">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-2 py-1 text-muted-foreground">
                              {preview.sourceRowNumbers[i] ?? i + 2}
                            </td>
                            {preview.schema.headers.slice(0, 6).map((h) => (
                              <td key={h} className="px-2 py-1">
                                {String(row[h] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
