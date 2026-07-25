"use client";

/**
 * Customer Document Collection Portal — public secure upload by opaque token.
 * Never displays Opportunity ID. Uploads go to Enterprise Document Registry SSOT.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, FileUp, Loader2, ShieldCheck } from "lucide-react";
import { uploadDocumentToRegistry } from "@/lib/document-registry";
import {
  deriveOpportunityDocumentReadiness,
  recordCustomerPortalUpload,
  resolveUploadSessionByToken,
} from "@/lib/document-requests";
import type {
  DocumentRequestItemState,
  DocumentRequestWorkspaceState,
} from "@/types/document-requests";

export default function CustomerDocumentUploadPortalPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";

  const [state, setState] = useState<DocumentRequestWorkspaceState | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [uploadingRef, setUploadingRef] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!token) {
      setInvalid(true);
      return;
    }
    const resolved = resolveUploadSessionByToken(token);
    if (!resolved?.uploadSession) {
      setInvalid(true);
      setState(null);
      return;
    }
    setInvalid(false);
    setState(resolved);
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  const session = state?.uploadSession;
  const readiness = useMemo(
    () => deriveOpportunityDocumentReadiness(state?.lodItems ?? []),
    [state?.lodItems],
  );

  const pending = (state?.lodItems ?? []).filter(
    (i) => i.status === "pending" || i.status === "requested" || i.status === "rejected",
  );
  const uploaded = (state?.lodItems ?? []).filter(
    (i) =>
      i.status === "uploaded" ||
      i.status === "verified" ||
      i.status === "under_verification",
  );

  const onUpload = async (item: DocumentRequestItemState, file: File | null) => {
    if (!file || !session || !state) return;
    setUploadingRef(item.typeRef);
    setMessage(null);
    try {
      const { record } = await uploadDocumentToRegistry({
        file,
        typeRef: item.typeRef,
        categoryLabel: item.label,
        uploadedBy: session.customerName || "Customer",
        uploadSource: "customer_portal",
        links: {
          opportunityId: session.opportunityId,
          documentScope: "shared",
        },
      });
      recordCustomerPortalUpload(session.opportunityId, item.typeRef, record.id);
      reload();
      setMessage(`${item.label} uploaded successfully.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingRef(null);
    }
  };

  if (invalid) {
    return (
      <main className="min-h-dvh bg-zinc-950 px-4 py-10 text-zinc-100">
        <div className="mx-auto max-w-lg rounded-2xl border border-rose-500/30 bg-zinc-900/80 p-6 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-rose-300" />
          <h1 className="mt-3 text-lg font-semibold">Link unavailable</h1>
          <p className="mt-2 text-sm text-zinc-400">
            This secure upload link is invalid, expired, or has been replaced. Please contact your
            Relationship Manager for a new link.
          </p>
        </div>
      </main>
    );
  }

  if (!session || !state) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-zinc-950 text-zinc-300">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(ellipse_at_top,#0f766e22,transparent_55%),#09090b] px-4 py-6 text-zinc-100 sm:py-10">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <header className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 shadow-xl backdrop-blur">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-300/90">
            Rupee Catalyst · Secure Document Upload
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
            {session.customerName}
          </h1>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[10px] uppercase text-zinc-500">Loan Product</dt>
              <dd className="font-medium">{session.loanProduct}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-zinc-500">Opportunity Reference</dt>
              <dd className="font-medium">{session.opportunityReference}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-zinc-500">Borrower Type</dt>
              <dd className="font-medium">{session.borrowerTypeLabel}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-zinc-500">Business Constitution</dt>
              <dd className="font-medium">{session.constitutionLabel}</dd>
            </div>
          </dl>
          {session.rmName && (
            <p className="mt-3 text-xs text-zinc-400">Your Relationship Manager: {session.rmName}</p>
          )}
        </header>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Upload Progress</p>
              <p className="text-2xl font-semibold tabular-nums">{readiness.completionPct}%</p>
            </div>
            <div className="text-right text-xs text-zinc-400">
              <p>{readiness.uploaded} uploaded</p>
              <p>{readiness.pending} pending</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-teal-500 transition-all"
              style={{ width: `${readiness.completionPct}%` }}
            />
          </div>
        </section>

        {message && (
          <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-sm text-teal-100">
            {message}
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
          <h2 className="text-sm font-semibold">Pending Documents</h2>
          {pending.length === 0 ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              All listed documents have been uploaded.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {pending.map((item) => (
                <li
                  key={item.typeRef}
                  className="rounded-xl border border-white/10 bg-zinc-950/50 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                        {item.category === "critical" ? "Critical" : "Journey"}
                        {item.remarks ? ` · ${item.remarks}` : ""}
                      </p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-teal-500/30 bg-teal-500/10 px-2.5 py-1.5 text-xs font-medium text-teal-100">
                      {uploadingRef === item.typeRef ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileUp className="h-3.5 w-3.5" />
                      )}
                      Upload
                      <input
                        type="file"
                        className="sr-only"
                        disabled={uploadingRef === item.typeRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          void onUpload(item, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
          <h2 className="text-sm font-semibold">Uploaded Documents</h2>
          {uploaded.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No uploads yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {uploaded.map((item) => (
                <li
                  key={item.typeRef}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/8 px-3 py-2 text-sm"
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] uppercase text-emerald-300">
                    {item.status.replace(/_/g, " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
          <h2 className="text-sm font-semibold">Upload History</h2>
          <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto text-xs text-zinc-400">
            {state.communications
              .filter((c) => c.kind === "customer_uploaded")
              .map((c) => (
                <li key={c.id}>
                  {new Date(c.at).toLocaleString()} · {c.detail || "Document uploaded"}
                </li>
              ))}
            {state.communications.filter((c) => c.kind === "customer_uploaded").length === 0 && (
              <li>No customer upload events yet.</li>
            )}
          </ul>
        </section>

        <p className="pb-6 text-center text-[11px] text-zinc-500">
          Documents are stored in the Enterprise Document Repository used by your Relationship
          Manager. Do not share this link publicly.
        </p>
      </div>
    </main>
  );
}
