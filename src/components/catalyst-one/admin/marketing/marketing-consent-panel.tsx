"use client";

/**
 * CO-MARKETING-REDESIGN-012 — Consent and Suppression Centre.
 * Fixture identities only. Historical campaign snapshots are never rewritten.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  MARKETING_CONSENT_CENTRE_NOTICE,
  MARKETING_CONSENT_RECORD_KIND_LABELS,
  MARKETING_CONSENT_RECORD_KINDS,
  MARKETING_CONSENT_SOURCES,
  MARKETING_CONSENT_UNAVAILABLE_NOTICE,
  MARKETING_TEST_MODE_BANNER,
} from "@/constants/enterprise-marketing-engine";
import type {
  MarketingConsentCentreCard,
  MarketingConsentExportRow,
  MarketingConsentPolicy,
  MarketingConsentSuppressionRecord,
} from "@/types/enterprise-marketing-consent";
import { MarketingModuleNav } from "./marketing-module-nav";
import { toast } from "sonner";
import "@/styles/marketing-command-centre.css";

type RegistryRow = MarketingConsentSuppressionRecord & { identityPreview: string };

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

export function MarketingConsentPanel() {
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [records, setRecords] = useState<RegistryRow[]>([]);
  const [cards, setCards] = useState<MarketingConsentCentreCard[]>([]);
  const [policy, setPolicy] = useState<MarketingConsentPolicy | null>(null);
  const [history, setHistory] = useState<RegistryRow[]>([]);
  const [exportRows, setExportRows] = useState<MarketingConsentExportRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [fingerprint, setFingerprint] = useState("email:verify.consent@example.com");
  const [reason, setReason] = useState("");
  const [kind, setKind] = useState<(typeof MARKETING_CONSENT_RECORD_KINDS)[number]>("MANUAL_SUPPRESSION");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [liftReason, setLiftReason] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (kindFilter !== "all") params.set("kind", kindFilter);
    if (sourceFilter !== "all") params.set("source", sourceFilter);
    return params.toString();
  }, [search, kindFilter, sourceFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setUnavailable(false);
    try {
      const res = await authenticatedJsonFetch(
        `/api/admin/marketing/consent${query ? `?${query}` : ""}`,
      );
      const body = (await res.json()) as ApiEnvelope<{
        records: RegistryRow[];
        cards: MarketingConsentCentreCard[];
        policy: MarketingConsentPolicy;
      }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Failed to load consent registry");
      }
      setRecords(body.data.records);
      setCards(body.data.cards);
      setPolicy(body.data.policy);
    } catch (e) {
      setUnavailable(true);
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const addRecord = async () => {
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          fingerprint,
          reason,
          kind,
        }),
      });
      const body = (await res.json()) as ApiEnvelope<{ record: RegistryRow }>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || "Add failed");
      }
      toast.success("Suppression recorded with audit");
      setReason("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(false);
    }
  };

  const liftSelected = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lift", recordId: selectedId, reason: liftReason }),
      });
      const body = (await res.json()) as ApiEnvelope<{ record: RegistryRow }>;
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || "Lift failed");
      }
      toast.success("Suppression lifted with audit");
      setLiftReason("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lift failed");
    } finally {
      setBusy(false);
    }
  };

  const loadHistory = async (fp: string) => {
    try {
      const res = await authenticatedJsonFetch(
        `/api/admin/marketing/consent?view=history&fingerprint=${encodeURIComponent(fp)}`,
      );
      const body = (await res.json()) as ApiEnvelope<{ history: RegistryRow[] }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "History failed");
      }
      setHistory(body.data.history);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "History failed");
    }
  };

  const prepareExport = async () => {
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_prep" }),
      });
      const body = (await res.json()) as ApiEnvelope<{
        prepared: boolean;
        fileWritten: false;
        rows: MarketingConsentExportRow[];
      }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Export preparation requires permission");
      }
      setExportRows(body.data.rows);
      toast.success("Export prepared in memory — no file written");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export preparation failed");
    } finally {
      setBusy(false);
    }
  };

  const saveExplicitConsent = async (requireExplicitConsent: boolean) => {
    setBusy(true);
    try {
      const res = await authenticatedJsonFetch("/api/admin/marketing/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "policy", policy: { requireExplicitConsent } }),
      });
      const body = (await res.json()) as ApiEnvelope<{ policy: MarketingConsentPolicy }>;
      if (!res.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Policy update failed");
      }
      setPolicy(body.data.policy);
      toast.success("Organisation consent policy updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Policy update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mkt-cc">
      <div className="mkt-cc-page space-y-5">
        <MarketingModuleNav activeId="consent" />
        <div className="mkt-cc-banner">{MARKETING_TEST_MODE_BANNER}</div>
        <div>
          <p className="mkt-cc-kicker">Governance</p>
          <h1 className="mkt-cc-title">Consent and Suppression Centre</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{MARKETING_CONSENT_CENTRE_NOTICE}</p>
        </div>

        {unavailable ? (
          <section className="mkt-cc-panel space-y-2">
            <ShieldAlert className="h-5 w-5" />
            <p className="text-sm">{MARKETING_CONSENT_UNAVAILABLE_NOTICE}</p>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Retry
            </Button>
          </section>
        ) : (
          <>
            <div className="mkt-cc-grid">
              {cards.map((card) => (
                <article key={card.id} className="mkt-cc-card mkt-consent-card">
                  <div className="mkt-cc-kicker">{card.label}</div>
                  <div className="text-2xl font-semibold">{card.count ?? "—"}</div>
                  <p className="text-xs text-muted-foreground">
                    {card.availability === "available" ? "Active fixture records" : "Unavailable"}
                  </p>
                </article>
              ))}
            </div>

            <div className="mkt-cc-filters">
              <div className="space-y-1.5">
                <Label>Search</Label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Identity, reason, campaign"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reason / kind</Label>
                <Select value={kindFilter} onValueChange={setKindFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All kinds</SelectItem>
                    {MARKETING_CONSENT_RECORD_KINDS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {MARKETING_CONSENT_RECORD_KIND_LABELS[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    {MARKETING_CONSENT_SOURCES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>

            <div className="mkt-asset-layout">
              <section className="mkt-cc-panel space-y-3">
                <h2 className="text-base font-semibold">Authorised manual add</h2>
                <p className="text-xs text-muted-foreground">
                  Fixture addresses only. Reason is mandatory. Permanent and temporary are distinct.
                </p>
                <div className="space-y-1.5">
                  <Label>Normalised identity</Label>
                  <Input value={fingerprint} onChange={(e) => setFingerprint(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Kind</Label>
                  <Select
                    value={kind}
                    onValueChange={(value) =>
                      setKind(value as (typeof MARKETING_CONSENT_RECORD_KINDS)[number])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MARKETING_CONSENT_RECORD_KINDS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {MARKETING_CONSENT_RECORD_KIND_LABELS[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Reason (required)</Label>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
                <Button size="sm" disabled={busy} onClick={() => void addRecord()}>
                  Add suppression
                </Button>
                <div className="space-y-1.5 border-t pt-3">
                  <Label>Lift reason (required)</Label>
                  <Input value={liftReason} onChange={(e) => setLiftReason(e.target.value)} />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy || !selectedId}
                    onClick={() => void liftSelected()}
                  >
                    Lift selected
                  </Button>
                </div>
                {policy ? (
                  <div className="space-y-2 border-t pt-3 text-sm">
                    <p>
                      Explicit consent required:{" "}
                      <strong>{policy.requireExplicitConsent ? "yes" : "no"}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Missing consent is never treated as granted.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void saveExplicitConsent(!policy.requireExplicitConsent)}
                    >
                      {policy.requireExplicitConsent ? "Allow mapped-only consent" : "Require explicit consent"}
                    </Button>
                  </div>
                ) : null}
              </section>

              <section className="mkt-cc-panel space-y-3">
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : records.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No consent or suppression records for this organisation yet.
                  </p>
                ) : (
                  <div className="mkt-consent-table">
                    {records.map((row) => (
                      <button
                        type="button"
                        key={row.id}
                        className={`mkt-consent-row ${selectedId === row.id ? "mkt-consent-row-active" : ""}`}
                        onClick={() => {
                          setSelectedId(row.id);
                          void loadHistory(row.fingerprint);
                        }}
                      >
                        <div className="font-medium">{row.identityPreview}</div>
                        <div className="mkt-asset-meta">
                          <span className="mkt-asset-chip">{MARKETING_CONSENT_RECORD_KIND_LABELS[row.kind]}</span>
                          <span className="mkt-asset-chip">{row.status}</span>
                          <span className="mkt-asset-chip">{row.duration}</span>
                          <span className="mkt-asset-chip">{row.source}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {row.note || String(row.reason)} · {row.auditTimestamp}
                          {row.campaignId ? ` · campaign ${row.campaignId}` : ""}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="mkt-cc-panel space-y-3">
              <h2 className="text-base font-semibold">Recipient history</h2>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Select a registry row to inspect recipient history. Campaign evidence is never silently removed.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {history.map((row) => (
                    <li key={row.id}>
                      {row.kind} · {row.status} · {row.source} · {row.auditTimestamp}
                      {row.campaignId ? ` · campaign ${row.campaignId}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mkt-cc-panel space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold">Export preparation</h2>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void prepareExport()}>
                  Prepare export
                </Button>
              </div>
              {exportRows ? (
                <p className="text-sm text-muted-foreground">
                  {exportRows.length} rows prepared. File is not written. Identities stay masked unless PII permission is granted.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Export is permission-gated. No file is written from this desk.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
