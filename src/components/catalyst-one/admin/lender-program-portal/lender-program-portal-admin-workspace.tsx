"use client";

/**
 * CO-LEND-001 — Admin: generate secure links + approval queue + comparison.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LENDER_PROGRAM_SUBMISSION_STATUS_LABELS,
  resolveProgramTemplateForProductCode,
} from "@/constants/lender-program-portal";
import { searchActiveLenders } from "@/lib/deal-workspace/lender-program-api";
import {
  compareProgramPayloads,
  lenderProgramPortalClient,
} from "@/lib/lender-program-portal";
import type {
  LenderProgramPortalInvite,
  LenderProgramSubmission,
} from "@/types/lender-program-portal";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";
import { cn } from "@/lib/utils";

type Tab = "generate" | "queue" | "review";

export function LenderProgramPortalAdminWorkspace() {
  const [tab, setTab] = useState<Tab>("generate");
  const [lenders, setLenders] = useState<EnterpriseLenderRecord[]>([]);
  const [invites, setInvites] = useState<LenderProgramPortalInvite[]>([]);
  const [submissions, setSubmissions] = useState<LenderProgramSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<LenderProgramSubmission | null>(null);
  const [lenderId, setLenderId] = useState("");
  const [productIds, setProductIds] = useState<string[]>([]);
  const [matrixProducts, setMatrixProducts] = useState<
    Array<{ productId: string; productCode: string; productLabel: string }>
  >([]);
  const [ttlDays, setTtlDays] = useState("14");
  const [notes, setNotes] = useState("");
  const [comments, setComments] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lenderRows, inviteRows, submissionRows] = await Promise.all([
        searchActiveLenders({ pageSize: 200 }),
        lenderProgramPortalClient.listInvites(),
        lenderProgramPortalClient.listSubmissions(),
      ]);
      setLenders(lenderRows);
      setInvites(inviteRows);
      setSubmissions(submissionRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load portal admin");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setProductIds([]);
    setMatrixProducts([]);
    if (!lenderId) return;
    let cancelled = false;
    void lenderProgramPortalClient
      .listMatrixProductsForLender(lenderId)
      .then((rows) => {
        if (!cancelled) setMatrixProducts(rows);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [lenderId]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    void lenderProgramPortalClient
      .getSubmission(selectedId)
      .then((row) => {
        setSelected(row);
        setComments(row.adminComments || "");
      })
      .catch((e: Error) => setError(e.message));
  }, [selectedId]);

  const comparisons = useMemo(() => {
    if (!selected) return [];
    const template = resolveProgramTemplateForProductCode(selected.productCode);
    return compareProgramPayloads(
      template.fields,
      selected.currentSnapshot,
      selected.proposedPayload,
    );
  }, [selected]);

  const createInvite = async () => {
    if (!lenderId || productIds.length === 0) return;
    setBusy(true);
    setError(null);
    setCreatedLink(null);
    try {
      const invite = await lenderProgramPortalClient.createInvite({
        lenderId,
        productIds,
        ttlDays: Number(ttlDays) || 14,
        notes: notes.trim() || undefined,
      });
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setCreatedLink(`${origin}${invite.portalPath}`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create invite");
    } finally {
      setBusy(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const revoke = async (id: string) => {
    setBusy(true);
    try {
      await lenderProgramPortalClient.revokeInvite(id, "Revoked by administrator");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setBusy(false);
    }
  };

  const review = async (
    action: "approve" | "reject" | "clarify" | "publish" | "schedule" | "save_draft",
  ) => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await lenderProgramPortalClient.reviewSubmission(selectedId, action, {
        comments,
        clarificationNotes: action === "clarify" ? comments : undefined,
        rejectionReason: action === "reject" ? comments : undefined,
        schedulePublishAt: action === "schedule" ? scheduleAt : undefined,
      });
      setSelected(updated);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review action failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <ChanakyaLoadingExperience
        module="enterprise"
        statusLabel="Loading lender program portal..."
        density="panel"
      />
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Lender Program Portal"
        description="Generate secure product-program links, review lender submissions, and publish only after approval."
      />

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["generate", "Generate link"],
            ["queue", "Approval queue"],
            ["review", "Comparison & review"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={tab === id ? "default" : "outline"}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>

      {tab === "generate" ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Generate secure program link</h2>
            <div className="space-y-1">
              <Label>Lender</Label>
              <Select
                value={lenderId}
                onValueChange={(value) => {
                  setLenderId(value);
                  setCreatedLink(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select lender" />
                </SelectTrigger>
                <SelectContent>
                  {lenders.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.displayName || l.legalName || l.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Products (Product–Lender Matrix)</Label>
              {!lenderId ? (
                <p className="text-xs text-muted-foreground">
                  Select a lender first to load mapped products.
                </p>
              ) : matrixProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No products mapped for this lender in the Product–Lender Matrix.
                </p>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                  {matrixProducts.map((p) => {
                    const checked = productIds.includes(p.productId);
                    return (
                      <label
                        key={p.productId}
                        className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-xs hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={checked}
                          onChange={() => toggleProduct(p.productId)}
                        />
                        <span>
                          <span className="font-medium text-foreground">{p.productLabel}</span>
                          <span className="ml-1 text-muted-foreground">({p.productCode})</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Minimum one product. Invitation scope is fixed at create time.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Link TTL (days)</Label>
              <Input value={ttlDays} onChange={(e) => setTtlDays(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Internal notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button
              disabled={busy || !lenderId || productIds.length === 0}
              onClick={() => void createInvite()}
            >
              {busy ? "Generating…" : "Generate secure URL"}
            </Button>
            {createdLink ? (
              <div className="rounded-md border bg-muted/40 p-3 text-xs break-all">
                <p className="mb-1 font-medium text-foreground">Share with lender:</p>
                <code>{createdLink}</code>
                <Button
                  className="mt-2"
                  size="sm"
                  variant="outline"
                  onClick={() => void navigator.clipboard.writeText(createdLink)}
                >
                  Copy link
                </Button>
              </div>
            ) : null}
          </div>

          <div className="space-y-2 rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Active / recent invites</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-2">Lender</th>
                    <th className="py-2 pr-2">Product(s)</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2 pr-2">Created</th>
                    <th className="py-2 pr-2">Expires</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/60 align-top">
                      <td className="py-2 pr-2">{inv.lenderName || inv.lenderId}</td>
                      <td className="py-2 pr-2">
                        {(inv.products ?? []).length > 0
                          ? (inv.products ?? []).map((p) => p.productLabel).join(", ")
                          : "—"}
                      </td>
                      <td className="py-2 pr-2">{inv.status}</td>
                      <td className="py-2 pr-2">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-2">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        {inv.status === "active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void revoke(inv.id)}
                          >
                            Revoke
                          </Button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "queue" ? (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Administrator approval queue</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-2">Lender</th>
                  <th className="py-2 pr-2">Product</th>
                  <th className="py-2 pr-2">Program</th>
                  <th className="py-2 pr-2">Submitted By</th>
                  <th className="py-2 pr-2">Designation</th>
                  <th className="py-2 pr-2">Branch</th>
                  <th className="py-2 pr-2">Submitted On</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr
                    key={s.id}
                    className={cn(
                      "cursor-pointer border-b border-border/60 hover:bg-muted/40",
                      selectedId === s.id && "bg-muted/50",
                    )}
                    onClick={() => {
                      setSelectedId(s.id);
                      setTab("review");
                    }}
                  >
                    <td className="py-2 pr-2">{s.lenderName || s.lenderId}</td>
                    <td className="py-2 pr-2">{s.productCode}</td>
                    <td className="py-2 pr-2">{s.programName}</td>
                    <td className="py-2 pr-2">{s.verifier?.employeeName || "—"}</td>
                    <td className="py-2 pr-2">{s.verifier?.designation || "—"}</td>
                    <td className="py-2 pr-2">{s.verifier?.branch || "—"}</td>
                    <td className="py-2 pr-2">
                      {s.submittedAt
                        ? new Date(s.submittedAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="py-2">
                      {LENDER_PROGRAM_SUBMISSION_STATUS_LABELS[s.status] || s.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {submissions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No submissions yet.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === "review" ? (
        <section className="space-y-4">
          {!selected ? (
            <p className="text-sm text-muted-foreground">
              Select a submission from the Approval queue.
            </p>
          ) : (
            <>
              <div className="rounded-xl border bg-card p-4 text-sm">
                <h2 className="font-semibold">{selected.programName}</h2>
                <p className="text-xs text-muted-foreground">
                  {selected.lenderName} · {selected.productCode} · v{selected.versionNumber} ·{" "}
                  {LENDER_PROGRAM_SUBMISSION_STATUS_LABELS[selected.status]}
                </p>
                <p className="mt-2 text-xs">
                  Submitted by {selected.verifier?.employeeName} (
                  {selected.verifier?.officialEmail} / {selected.verifier?.officialMobile}) ·{" "}
                  {selected.verifier?.designation || "—"} · {selected.verifier?.branch || "—"}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Contact ID: {selected.ecmContactId || "—"} · Dialogue Thread:{" "}
                  {selected.dialogueThreadId || "—"} · Email verified:{" "}
                  {selected.emailVerifiedAt
                    ? new Date(selected.emailVerifiedAt).toLocaleString()
                    : "—"}{" "}
                  · Mobile verified:{" "}
                  {selected.mobileVerifiedAt
                    ? new Date(selected.mobileVerifiedAt).toLocaleString()
                    : "—"}
                </p>
              </div>

              {selected.dialogueMessages && selected.dialogueMessages.length > 0 ? (
                <div className="space-y-2 rounded-xl border bg-card p-4">
                  <h3 className="text-sm font-semibold">Enterprise Dialogue</h3>
                  <ul className="space-y-2">
                    {selected.dialogueMessages.map((m) => (
                      <li
                        key={m.id}
                        className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium text-foreground">{m.title}</span>
                          <span className="text-muted-foreground">
                            {new Date(m.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-muted-foreground">{m.body}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {m.actorName}
                          {m.actorRole ? ` · ${m.actorRole}` : ""} · {m.eventKind}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground">
                      <th className="px-3 py-2">Field</th>
                      <th className="px-3 py-2">Current Value</th>
                      <th className="px-3 py-2">Proposed Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons.map((row) => (
                      <tr
                        key={row.key}
                        className={cn(
                          "border-b border-border/50",
                          row.changed && "bg-amber-50/80 dark:bg-amber-950/30",
                        )}
                      >
                        <td className="px-3 py-2 font-medium">{row.label}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.currentValue}</td>
                        <td
                          className={cn(
                            "px-3 py-2",
                            row.changed && "font-semibold text-foreground",
                          )}
                        >
                          {row.proposedValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 rounded-xl border bg-card p-4">
                <Label>Internal comments</Label>
                <Textarea value={comments} onChange={(e) => setComments(e.target.value)} />
                <div className="space-y-1">
                  <Label>Schedule publication (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void review("save_draft")}
                  >
                    Save draft
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void review("clarify")}
                  >
                    Request clarification
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => void review("reject")}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void review("approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || !scheduleAt}
                    onClick={() => void review("schedule")}
                  >
                    Schedule publication
                  </Button>
                  <Button
                    size="sm"
                    disabled={
                      busy ||
                      (selected.status !== "approved" &&
                        selected.status !== "scheduled" &&
                        selected.status !== "pending_review")
                    }
                    onClick={() => void review("publish")}
                  >
                    Publish now
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Publish creates a new Enterprise Lender Program version and never overwrites the
                  prior version. Live Product–Lender Matrix / Product Library consumers refresh from
                  registry SSOT without redeploy.
                </p>
              </div>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
