"use client";

/**
 * CO-MARKETING-MKT-03 — Marketing Audience Builder.
 * Definitions over external Sheets. Preview returns counts — not personal data dumps.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  RefreshCw,
  ShieldAlert,
  Users,
  Plus,
  Filter,
  Eye,
  Save,
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
import { MARKETING_FILTER_OPS } from "@/constants/enterprise-marketing-engine";
import { emptyFilterDefinition } from "@/lib/enterprise-marketing-engine/audience-filters";
import type { MarketingDataSourceBinding } from "@/types/enterprise-marketing-data-source";
import type { MarketingDatasetDescriptor } from "@/lib/enterprise-marketing-engine/ports/data-source.port";
import type {
  MarketingAudienceDefinition,
  MarketingAudiencePreviewResult,
  MarketingFilterDefinition,
  MarketingFilterRule,
} from "@/types/enterprise-marketing-audience";
import { MarketingModuleNav } from "./marketing-module-nav";
import { toast } from "sonner";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

function newRule(): MarketingFilterRule {
  return {
    id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    field: "",
    op: "eq",
    value: "",
  };
}

export function MarketingAudiencesPanel() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [audiences, setAudiences] = useState<MarketingAudienceDefinition[]>([]);
  const [bindings, setBindings] = useState<MarketingDataSourceBinding[]>([]);
  const [datasets, setDatasets] = useState<MarketingDatasetDescriptor[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [selectedAudienceId, setSelectedAudienceId] = useState<string>("");
  const [name, setName] = useState("");
  const [bindingId, setBindingId] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [filters, setFilters] = useState<MarketingFilterDefinition>(emptyFilterDefinition());
  const [preview, setPreview] = useState<MarketingAudiencePreviewResult | null>(null);
  const [suppressionCount, setSuppressionCount] = useState(0);

  const loadAudiences = useCallback(async () => {
    const res = await authenticatedJsonFetch("/api/admin/marketing/audiences");
    const body = (await res.json()) as ApiEnvelope<{ audiences: MarketingAudienceDefinition[] }>;
    if (!res.ok || !body.success || !body.data) {
      throw new Error(body.error?.message || "Failed to load audiences");
    }
    setAudiences(body.data.audiences);
  }, []);

  const loadBindings = useCallback(async () => {
    const res = await authenticatedJsonFetch("/api/admin/marketing/data-sources");
    const body = (await res.json()) as ApiEnvelope<{ bindings: MarketingDataSourceBinding[] }>;
    if (!res.ok || !body.success || !body.data) {
      throw new Error(body.error?.message || "Failed to load data sources");
    }
    setBindings(body.data.bindings);
    if (!bindingId && body.data.bindings[0]) {
      setBindingId(body.data.bindings[0].id);
    }
  }, [bindingId]);

  const loadSuppressions = useCallback(async () => {
    const res = await authenticatedJsonFetch("/api/admin/marketing/audiences?view=suppressions");
    const body = (await res.json()) as ApiEnvelope<{ suppressions: unknown[] }>;
    if (res.ok && body.success && body.data) {
      setSuppressionCount(body.data.suppressions.length);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadAudiences(), loadBindings(), loadSuppressions()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [loadAudiences, loadBindings, loadSuppressions]);

  useEffect(() => {
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const discoverTabs = async (id: string) => {
    if (!id) return;
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch(
        `/api/admin/marketing/data-sources/${encodeURIComponent(id)}?view=datasets`,
      );
      const body = (await res.json()) as ApiEnvelope<{ datasets: MarketingDatasetDescriptor[] }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Discover failed");
      }
      setDatasets(body.data.datasets);
      if (body.data.datasets[0] && !datasetId) {
        setDatasetId(body.data.datasets[0].externalDatasetId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Discover failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (bindingId) void discoverTabs(bindingId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bindingId]);

  const loadSchemaFields = async () => {
    if (!bindingId || !datasetId) return;
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch(
        `/api/admin/marketing/data-sources/${encodeURIComponent(bindingId)}?view=schema&datasetId=${encodeURIComponent(datasetId)}`,
      );
      const body = (await res.json()) as ApiEnvelope<{
        schema: { headers: string[] };
      }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Schema failed");
      }
      setFields(body.data.schema.headers);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Schema failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (bindingId && datasetId) void loadSchemaFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bindingId, datasetId]);

  const datasetLabel =
    datasets.find((d) => d.externalDatasetId === datasetId)?.displayName ?? datasetId;

  const applyAudience = (a: MarketingAudienceDefinition) => {
    setSelectedAudienceId(a.id);
    setName(a.name);
    setBindingId(a.bindingId);
    setDatasetId(a.datasetId);
    setFilters(a.filterDefinition);
    setPreview(null);
  };

  const saveAudience = async () => {
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          id: selectedAudienceId || undefined,
          name,
          bindingId,
          datasetId,
          datasetDisplayName: datasetLabel,
          filterDefinition: filters,
          suppressionPolicy: { applyOrgSuppression: true, reasons: [] },
          eligibilityRules: {
            requireIdentity: true,
            requireValidEmailIfPresent: true,
            excludeDuplicatesInScan: true,
          },
        }),
      });
      const body = (await res.json()) as ApiEnvelope<{ audience: MarketingAudienceDefinition }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Save failed");
      }
      toast.success("Audience definition saved (no row copy)");
      setSelectedAudienceId(body.data.audience.id);
      await loadAudiences();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const runPreview = async () => {
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          bindingId,
          datasetId,
          filterDefinition: filters,
          suppressionPolicy: { applyOrgSuppression: true, reasons: [] },
          eligibilityRules: {
            requireIdentity: true,
            requireValidEmailIfPresent: true,
            excludeDuplicatesInScan: true,
          },
        }),
      });
      const body = (await res.json()) as ApiEnvelope<{ preview: MarketingAudiencePreviewResult }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Preview failed");
      }
      setPreview(body.data.preview);
      if (body.data.preview.availableFields.length) {
        setFields(body.data.preview.availableFields);
      }
      toast.success("Audience preview ready (counts only)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  };

  const updateRule = (id: string, patch: Partial<MarketingFilterRule>) => {
    setFilters((prev) => ({
      ...prev,
      rules: prev.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Marketing Command Center · Audiences
        </p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Users className="h-6 w-6 text-primary" />
          Audience Builder
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Select Google Drive source → Sheet → Tab, then define reusable filters. The raw marketing
          database stays external — definitions never copy rows into Supabase.
        </p>
      </header>

      <MarketingModuleNav activeId="audiences" />

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            MKT-03 safety
          </CardTitle>
          <CardDescription>
            No Contacts · No Opportunities · No Leads · No campaign send · Suppression ledger
            prepared ({suppressionCount} org records) · Delivery not connected
          </CardDescription>
        </CardHeader>
      </Card>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Saved audiences</CardTitle>
              <CardDescription>Reusable definitions only.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setSelectedAudienceId("");
                  setName("");
                  setFilters(emptyFilterDefinition());
                  setPreview(null);
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New audience
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={busy}
                onClick={() => void refreshAll()}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Refresh
              </Button>
              <ul className="space-y-1">
                {audiences.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      className={`w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground ${
                        selectedAudienceId === a.id ? "bg-primary text-primary-foreground" : ""
                      }`}
                      onClick={() => applyAudience(a)}
                    >
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs opacity-80">
                        {a.datasetDisplayName ?? a.datasetId}
                      </div>
                    </button>
                  </li>
                ))}
                {audiences.length === 0 ? (
                  <li className="text-xs text-muted-foreground">No saved audiences yet.</li>
                ) : null}
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Source · Sheet · Tab</CardTitle>
                <CardDescription>
                  Example path: Marketing Master Database → Professionals (tab names are discovered,
                  not hard-coded).
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Audience name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Home Loan – Professionals"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Data source</Label>
                  <Select value={bindingId || undefined} onValueChange={setBindingId}>
                    <SelectTrigger>
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
                </div>
                <div className="space-y-1.5">
                  <Label>Sheet / tab</Label>
                  <Select value={datasetId || undefined} onValueChange={setDatasetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tab" />
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
                <CardDescription>
                  Extensible rules over discovered fields (city, profession, email available, …).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="text-xs">Logic</Label>
                  <Select
                    value={filters.logic}
                    onValueChange={(v) =>
                      setFilters((p) => ({ ...p, logic: v as "AND" | "OR" }))
                    }
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setFilters((p) => ({ ...p, rules: [...p.rules, newRule()] }))
                    }
                  >
                    Add rule
                  </Button>
                </div>

                {filters.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="grid gap-2 rounded-md border border-border/70 p-2 sm:grid-cols-4"
                  >
                    <Select
                      value={rule.field || undefined}
                      onValueChange={(v) => updateRule(rule.id, { field: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Field" />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                        <SelectItem value="__email__">Email (detected)</SelectItem>
                        <SelectItem value="__phone__">Mobile (detected)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={rule.op}
                      onValueChange={(v) =>
                        updateRule(rule.id, { op: v as MarketingFilterRule["op"] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MARKETING_FILTER_OPS.map((op) => (
                          <SelectItem key={op} value={op}>
                            {op}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Value"
                      value={typeof rule.value === "string" ? rule.value : ""}
                      disabled={
                        rule.op === "is_empty" ||
                        rule.op === "is_not_empty" ||
                        rule.op === "email_available" ||
                        rule.op === "mobile_available"
                      }
                      onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setFilters((p) => ({
                          ...p,
                          rules: p.rules.filter((r) => r.id !== rule.id),
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}

                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy || !bindingId || !datasetId} onClick={() => void runPreview()}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Preview audience
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy || !name.trim() || !bindingId || !datasetId}
                    onClick={() => void saveAudience()}
                  >
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    Save definition
                  </Button>
                </div>
              </CardContent>
            </Card>

            {preview ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Audience preview</CardTitle>
                  <CardDescription>{preview.notice}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <dl className="grid gap-2 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Estimated source</dt>
                      <dd className="font-medium">{preview.estimatedSourceRows ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Scanned</dt>
                      <dd className="font-medium">
                        {preview.counts.scanned}
                        {preview.scanCapped ? ` (capped @ ${preview.scanMaxRows})` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Eligible</dt>
                      <dd className="font-medium text-emerald-700 dark:text-emerald-400">
                        {preview.counts.eligible}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Excluded (filter)</dt>
                      <dd className="font-medium">{preview.counts.excludedByFilter}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Invalid</dt>
                      <dd className="font-medium">{preview.counts.invalid}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Duplicate</dt>
                      <dd className="font-medium">{preview.counts.duplicate}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-muted-foreground">Suppressed</dt>
                      <dd className="font-medium">{preview.counts.suppressed}</dd>
                    </div>
                  </dl>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Available fields</p>
                    <p className="text-xs">{preview.availableFields.join(", ") || "—"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs uppercase text-muted-foreground">
                      Sample diagnostics (row # + disposition — no personal fields)
                    </p>
                    <ul className="max-h-40 overflow-auto rounded border text-xs">
                      {preview.sampleDiagnostics.map((d, i) => (
                        <li key={i} className="border-b px-2 py-1 last:border-0">
                          Row {d.sourceRowNumber ?? "?"} · {d.disposition}
                          {d.issues.length ? ` · ${d.issues.join(", ")}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
