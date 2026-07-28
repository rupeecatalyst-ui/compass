"use client";

/**
 * CO-DOC-002 — Customer Document Collection Portal.
 * Ingestion channel only — storage remains Enterprise Document Registry SSOT.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Eye,
  FileUp,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import { CUSTOMER_PORTAL_ACCEPT } from "@/constants/document-requests";
import {
  answerSaarthiQuestion,
  appendUploadSessionAudit,
  buildSaarthiGreeting,
  deriveCustomerPortalProgress,
  ingestCustomerPortalDocument,
  recordPortalOpened,
  refreshDocumentRequestFromRegistry,
  resolveUploadSessionByToken,
  subscribeDocumentRequestsUpdated,
  type SaarthiMessage,
} from "@/lib/document-requests";
import {
  canPreviewDocument,
  createBlobObjectUrl,
  getDocumentRegistryRecord,
  subscribeDocumentRegistryUpdated,
} from "@/lib/document-registry";
import type {
  DocumentRequestItemState,
  DocumentRequestItemStatus,
  DocumentRequestWorkspaceState,
} from "@/types/document-requests";
import { cn } from "@/lib/utils";

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function displayStatus(status: DocumentRequestItemStatus): string {
  switch (status) {
    case "pending":
    case "requested":
      return "Pending";
    case "uploaded":
      return "Uploaded";
    case "under_verification":
      return "Under Verification";
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    case "re_upload_required":
      return "Re-upload Required";
    default:
      return status;
  }
}

function statusClass(status: DocumentRequestItemStatus): string {
  switch (status) {
    case "verified":
      return "text-emerald-300";
    case "uploaded":
    case "under_verification":
      return "text-teal-300";
    case "rejected":
    case "re_upload_required":
      return "text-rose-300";
    default:
      return "text-amber-300";
  }
}

function needsUpload(status: DocumentRequestItemStatus): boolean {
  return (
    status === "pending" ||
    status === "requested" ||
    status === "rejected" ||
    status === "re_upload_required"
  );
}

function canReplace(status: DocumentRequestItemStatus): boolean {
  return (
    status === "uploaded" ||
    status === "under_verification" ||
    status === "verified" ||
    status === "rejected" ||
    status === "re_upload_required"
  );
}

export function CustomerDocumentCollectionPortal({
  token,
  mode = "standalone",
}: {
  token: string;
  /** embedded — used inside Customer Engagement shell (no outer page chrome). */
  mode?: "standalone" | "embedded";
}) {
  const embedded = mode === "embedded";
  const [state, setState] = useState<DocumentRequestWorkspaceState | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [busyRef, setBusyRef] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [saarthiInput, setSaarthiInput] = useState("");
  const [saarthiThread, setSaarthiThread] = useState<SaarthiMessage[]>([]);
  const openedRef = useRef(false);

  const reload = useCallback((opts?: { audit?: boolean }) => {
    if (!token) {
      setInvalid(true);
      return;
    }
    const resolved = resolveUploadSessionByToken(token, { audit: opts?.audit ?? false });
    if (!resolved?.uploadSession) {
      setInvalid(true);
      setState(null);
      return;
    }
    const synced = refreshDocumentRequestFromRegistry(
      resolved.uploadSession.opportunityId,
    );
    setInvalid(false);
    setState({
      ...synced,
      uploadSession: resolved.uploadSession,
    });
  }, [token]);

  useEffect(() => {
    reload({ audit: true });
    const unsubDr = subscribeDocumentRequestsUpdated(() => reload({ audit: false }));
    const unsubReg = subscribeDocumentRegistryUpdated(() => reload({ audit: false }));
    return () => {
      unsubDr();
      unsubReg();
    };
  }, [reload]);

  useEffect(() => {
    if (!state?.uploadSession || openedRef.current) return;
    openedRef.current = true;
    recordPortalOpened(state.uploadSession.token, state.uploadSession.opportunityId);
    setSaarthiThread([
      {
        id: `s_${Date.now()}`,
        role: "saarthi",
        text: buildSaarthiGreeting(state.lodItems),
        at: new Date().toISOString(),
      },
    ]);
  }, [state?.uploadSession, state?.lodItems]);

  const session = state?.uploadSession;
  const progress = useMemo(
    () => deriveCustomerPortalProgress(state?.lodItems ?? []),
    [state?.lodItems],
  );

  const critical = (state?.lodItems ?? []).filter((i) => i.category === "critical");
  const journey = (state?.lodItems ?? []).filter((i) => i.category === "journey");
  const lastVerification = (state?.lodItems ?? [])
    .filter((i) => i.status === "verified")
    .map((i) => i.uploadedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  const onIngest = async (
    item: DocumentRequestItemState,
    file: File | null,
    mode: "upload" | "replace",
  ) => {
    if (!file || !session) return;
    if (mode === "replace") {
      // Enterprise replace — proceed; repository keeps prior version history.
      setFlash(`Replacing ${item.label}… prior file remains in version history.`);
    }
    if (
      mode === "upload" &&
      (item.status === "uploaded" ||
        item.status === "under_verification" ||
        item.status === "verified")
    ) {
      setFlash("This document is already uploaded. Use Replace to submit a new version.");
      return;
    }
    setBusyRef(item.typeRef);
    setFlash(null);
    const result = await ingestCustomerPortalDocument({
      session,
      item,
      file,
      mode,
    });
    if (!result.ok) {
      setFlash(result.reason);
    } else {
      setFlash(
        result.replaced
          ? `${item.label} replaced successfully.`
          : `${item.label} uploaded successfully.`,
      );
      reload({ audit: false });
    }
    setBusyRef(null);
  };

  const onPreview = async (item: DocumentRequestItemState) => {
    if (!session || !item.registryRecordId) return;
    const record = getDocumentRegistryRecord(item.registryRecordId);
    const version = record?.versions.find((v) => v.isCurrent) ?? record?.versions[0];
    if (!record || !version) {
      setFlash("Preview unavailable.");
      return;
    }
    if (!canPreviewDocument(version.mimeType, version.originalFilename)) {
      setFlash("Preview supports PDF and images. Please download via your Relationship Manager for other formats.");
      return;
    }
    appendUploadSessionAudit({
      token: session.token,
      opportunityId: session.opportunityId,
      action: "preview_opened",
      detail: item.label,
    });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = await createBlobObjectUrl(version.blobId);
    if (!url) {
      setFlash("Unable to open preview.");
      return;
    }
    setPreviewTitle(item.label);
    setPreviewUrl(url);
  };

  const askSaarthi = () => {
    const q = saarthiInput.trim();
    if (!q || !session || !state) return;
    appendUploadSessionAudit({
      token: session.token,
      opportunityId: session.opportunityId,
      action: "saarthi_query",
      detail: q.slice(0, 120),
    });
    const answer = answerSaarthiQuestion(q, state.lodItems);
    setSaarthiThread((prev) => [
      ...prev,
      { id: `c_${Date.now()}`, role: "customer", text: q, at: new Date().toISOString() },
      {
        id: `s_${Date.now() + 1}`,
        role: "saarthi",
        text: answer,
        at: new Date().toISOString(),
      },
    ]);
    setSaarthiInput("");
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (invalid) {
    if (embedded) {
      return (
        <div className="rounded-2xl border border-rose-500/30 bg-zinc-900/80 p-6 text-center text-zinc-100">
          <ShieldCheck className="mx-auto h-8 w-8 text-rose-300" />
          <h1 className="mt-3 text-lg font-semibold">Link unavailable</h1>
          <p className="mt-2 text-sm text-zinc-400">
            This secure upload link is invalid, expired, or has been replaced.
          </p>
        </div>
      );
    }
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
    if (embedded) {
      return (
        <ChanakyaLoadingExperience
          module="documents"
          statusLabel="Preparing document checklist..."
          surface="command"
          density="inline"
          useEbiSignals={false}
        />
      );
    }
    return (
      <main className="min-h-dvh bg-zinc-950">
        <ChanakyaLoadingExperience
          module="documents"
          statusLabel="Preparing document checklist..."
          surface="command"
          density="page"
          useEbiSignals={false}
        />
      </main>
    );
  }

  const body = (
      <div className={cn("mx-auto w-full max-w-3xl space-y-4", embedded && "max-w-none")}>
        {/* Header */}
        <header className="rounded-2xl border border-white/10 bg-zinc-900/85 p-4 shadow-xl backdrop-blur sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-300/90">
            Rupee Catalyst · Customer Document Collection
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
            {session.customerName}
          </h1>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <Meta label="Loan Product" value={session.loanProduct} />
            <Meta label="Opportunity Reference" value={session.opportunityReference} />
            <Meta label="Relationship Manager" value={session.rmName || "—"} />
            <Meta
              label="Application Status"
              value={session.applicationStatus || progress.applicationStatusLabel}
            />
            <Meta label="Current Stage" value={session.currentStage || "Document Collection"} />
            <Meta
              label="Documents Uploaded"
              value={`${progress.uploaded} / ${progress.total} · ${progress.completionPct}% Complete`}
            />
          </dl>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-teal-500 transition-all"
              style={{ width: `${progress.completionPct}%` }}
            />
          </div>
        </header>

        {/* Progress panel */}
        <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">Progress</p>
              <p className="text-lg font-semibold">{progress.bandLabel}</p>
            </div>
            <p className="text-2xl font-semibold tabular-nums text-teal-200">
              {progress.completionPct}%
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Kpi label="Total Required" value={progress.total} />
            <Kpi label="Uploaded" value={progress.uploaded} />
            <Kpi label="Pending" value={progress.pending} />
            <Kpi label="Critical Pending" value={progress.criticalPending} />
            <Kpi label="Journey Pending" value={progress.journeyPending} />
            <Kpi label="Overall" value={`${progress.completionPct}%`} />
          </div>
        </section>

        {/* Saarthi */}
        <section className="rounded-2xl border border-teal-500/25 bg-zinc-900/75 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-300" />
            <h2 className="text-sm font-semibold">Saarthi</h2>
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">
              Document assistant
            </span>
          </div>
          <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-xl border border-white/8 bg-zinc-950/50 p-3">
            {saarthiThread.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "rounded-lg px-2.5 py-2 text-sm whitespace-pre-wrap",
                  m.role === "saarthi"
                    ? "bg-teal-500/10 text-teal-50"
                    : "ml-6 bg-zinc-800/80 text-zinc-100",
                )}
              >
                <p className="mb-0.5 text-[9px] uppercase tracking-wide text-zinc-500">
                  {m.role === "saarthi" ? "Saarthi" : "You"}
                </p>
                {m.text}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={saarthiInput}
              onChange={(e) => setSaarthiInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") askSaarthi();
              }}
              placeholder="Ask Saarthi — e.g. Which documents are pending?"
              className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-950/70 px-3 text-sm outline-none ring-teal-500/40 focus:ring-2"
            />
            <button
              type="button"
              onClick={askSaarthi}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-teal-600 px-3 text-xs font-semibold text-white hover:bg-teal-500"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Ask
            </button>
          </div>
        </section>

        {flash && (
          <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-sm text-teal-100">
            {flash}
          </div>
        )}

        <DocumentCategorySection
          title="Critical Documents"
          hint="Required before lender submission"
          items={critical}
          busyRef={busyRef}
          onUpload={(item, file) => void onIngest(item, file, "upload")}
          onReplace={(item, file) => void onIngest(item, file, "replace")}
          onPreview={(item) => void onPreview(item)}
        />

        <DocumentCategorySection
          title="Journey Documents"
          hint="May be collected during processing"
          items={journey}
          busyRef={busyRef}
          onUpload={(item, file) => void onIngest(item, file, "upload")}
          onReplace={(item, file) => void onIngest(item, file, "replace")}
          onPreview={(item) => void onPreview(item)}
        />

        {/* Communication */}
        <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
          <h2 className="text-sm font-semibold">Customer Communication</h2>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <Meta label="Last Upload Date" value={formatDate(state.lastCustomerActivityAt)} />
            <Meta label="Last Verification Date" value={formatDate(lastVerification)} />
            <Meta
              label="Latest Communication"
              value={
                state.communications[0]
                  ? `${state.communications[0].kind.replace(/_/g, " ")} · ${formatDate(state.communications[0].at)}`
                  : "—"
              }
            />
            <Meta
              label="RM Remarks"
              value={
                state.lodItems.find((i) => i.remarks?.trim())?.remarks ||
                "No remarks from your Relationship Manager yet."
              }
            />
          </dl>
          <h3 className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Upload History
          </h3>
          <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto text-xs text-zinc-400">
            {state.communications
              .filter((c) => c.kind === "customer_uploaded" || c.kind === "email_sent" || c.kind === "reminder_sent")
              .map((c) => (
                <li key={c.id}>
                  {formatDate(c.at)} · {c.kind.replace(/_/g, " ")}
                  {c.detail ? ` · ${c.detail}` : ""}
                </li>
              ))}
            {state.communications.length === 0 && <li>No activity yet.</li>}
          </ul>
        </section>

        <p className="pb-8 text-center text-[11px] text-zinc-500">
          Uploads are stored in the Enterprise Document Repository. Never share this secure link.
          Supported: PDF, JPEG, PNG, DOCX, XLSX and other enterprise formats.
          {!embedded ? (
            <>
              {" "}
              <a
                href={`/customer-engagement/${encodeURIComponent(token)}`}
                className="text-teal-400/90 hover:text-teal-300"
              >
                Open full engagement portal
              </a>
            </>
          ) : null}
        </p>
      </div>
  );

  return (
    <>
      {embedded ? (
        body
      ) : (
        <main className="min-h-dvh bg-[radial-gradient(ellipse_at_top,#0f766e22,transparent_55%),#09090b] px-3 py-5 text-zinc-100 sm:px-4 sm:py-8">
          {body}
        </main>
      )}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-zinc-950">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
              <p className="truncate text-sm font-medium">{previewTitle}</p>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs text-zinc-300 hover:bg-white/10"
                onClick={() => {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
              >
                Close
              </button>
            </div>
            <iframe title={previewTitle} src={previewUrl} className="min-h-[70dvh] w-full bg-white" />
          </div>
        </div>
      )}
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-100">{value}</dd>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950/50 px-2.5 py-2">
      <p className="text-[9px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function DocumentCategorySection({
  title,
  hint,
  items,
  busyRef,
  onUpload,
  onReplace,
  onPreview,
}: {
  title: string;
  hint: string;
  items: DocumentRequestItemState[];
  busyRef: string | null;
  onUpload: (item: DocumentRequestItemState, file: File | null) => void;
  onReplace: (item: DocumentRequestItemState, file: File | null) => void;
  onPreview: (item: DocumentRequestItemState) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-[10px] text-zinc-500">{hint}</p>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No documents in this category.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li
              key={item.typeRef}
              className="rounded-xl border border-white/10 bg-zinc-950/55 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className={cn("mt-0.5 text-[11px] font-medium", statusClass(item.status))}>
                    {displayStatus(item.status)}
                    {item.status === "verified" || item.status === "under_verification"
                      ? ` · Verification: ${displayStatus(item.status)}`
                      : ""}
                  </p>
                  {item.remarks && (
                    <p className="mt-1 text-[11px] text-zinc-400">Remarks: {item.remarks}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {needsUpload(item.status) && (
                    <FileAction
                      label="Upload"
                      icon={
                        busyRef === item.typeRef ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileUp className="h-3.5 w-3.5" />
                        )
                      }
                      disabled={busyRef === item.typeRef}
                      onFile={(file) => onUpload(item, file)}
                    />
                  )}
                  {canReplace(item.status) && !needsUpload(item.status) && (
                    <FileAction
                      label="Replace"
                      icon={
                        busyRef === item.typeRef ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )
                      }
                      disabled={busyRef === item.typeRef}
                      onFile={(file) => onReplace(item, file)}
                    />
                  )}
                  {item.registryRecordId && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
                      onClick={() => onPreview(item)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </button>
                  )}
                  {!needsUpload(item.status) && item.status === "verified" && (
                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Done
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FileAction({
  label,
  icon,
  disabled,
  onFile,
}: {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onFile: (file: File | null) => void;
}) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-teal-500/30 bg-teal-500/10 px-2.5 py-1.5 text-xs font-medium text-teal-100",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      {icon}
      {label}
      <input
        type="file"
        accept={CUSTOMER_PORTAL_ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onFile(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}
