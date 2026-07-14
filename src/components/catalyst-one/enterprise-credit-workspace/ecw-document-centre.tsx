"use client";

import { FileText, ImageIcon, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EcwViewerDocument } from "@/types/enterprise-credit-workspace";

function statusChip(status: string) {
  const s = status.toLowerCase();
  if (s === "verified") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200";
  if (s === "received") return "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200";
  if (s === "requested") return "border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-200";
  if (s === "rejected") return "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200";
  return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200";
}

function PreviewIcon({ kind }: { kind: EcwViewerDocument["previewKind"] }) {
  if (kind === "image") return <ImageIcon className="h-3 w-3 shrink-0 text-muted-foreground" />;
  if (kind === "office") return <FileSpreadsheet className="h-3 w-3 shrink-0 text-muted-foreground" />;
  return <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />;
}

/**
 * Prompt 018 — Compact enterprise document list (row cards).
 * Sits beside the hero viewer so preview occupies majority height.
 */
export function EcwDocumentList({
  documents,
  selectedId,
  onSelect,
}: {
  documents: EcwViewerDocument[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col border-r border-border/60 bg-background">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border/50 px-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Documents
        </p>
        <span className="text-[9px] tabular-nums text-muted-foreground">{documents.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {documents.length === 0 ? (
          <p className="p-3 text-[11px] text-muted-foreground">No documents on this file yet.</p>
        ) : (
          <ul className="p-1.5 space-y-1">
            {documents.map((doc) => {
              const selected = doc.id === selectedId;
              return (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(doc.id)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-md border px-2 py-1.5 text-left transition-colors",
                      selected
                        ? "border-teal-500/40 bg-teal-50/90 dark:bg-teal-950/40"
                        : "border-border/50 bg-muted/15 hover:bg-muted/40",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <PreviewIcon kind={doc.previewKind} />
                      <p className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-tight text-foreground">
                        {doc.name}
                      </p>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-1.5 pl-[18px]">
                      <span
                        className={cn(
                          "rounded px-1 py-px text-[8px] font-semibold capitalize leading-none",
                          "border",
                          statusChip(doc.status),
                        )}
                      >
                        {doc.status}
                      </span>
                      <span className="truncate text-[9px] text-muted-foreground">
                        {doc.uploadedBy ?? "—"}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Prompt 018 — Hero document viewer (majority of centre workspace). */
export function EcwDocumentViewer({ document }: { document: EcwViewerDocument | null }) {
  if (!document) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center bg-slate-50/80 px-4 text-center dark:bg-zinc-950/40">
        <FileText className="h-7 w-7 text-muted-foreground/50" />
        <p className="mt-2 text-sm font-medium text-foreground">Select a document</p>
        <p className="mt-1 max-w-sm text-[11px] text-muted-foreground">
          Review opens in-workspace — supporting panels stay secondary.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100/80 dark:bg-zinc-950/50">
      <div className="flex h-8 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-background/95 px-2.5">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-foreground">{document.name}</p>
        </div>
        <p className="shrink-0 text-[9px] uppercase tracking-wide text-muted-foreground">
          {document.previewKind} · {document.verificationStatus}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-1">
        {document.previewKind === "image" && document.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={document.previewUrl}
            alt={document.name}
            className="mx-auto h-full max-h-full w-auto max-w-full rounded border border-border/40 bg-white object-contain shadow-sm"
          />
        ) : document.previewKind === "office" ? (
          <div className="flex h-full flex-col items-center justify-center rounded border border-dashed border-border/70 bg-background/80 p-4 text-center">
            <FileSpreadsheet className="h-7 w-7 text-muted-foreground/60" />
            <p className="mt-2 text-sm font-medium">Office preview coming soon</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Future support for Word / Excel inside Credit Workbench.
            </p>
          </div>
        ) : (
          <iframe
            title={document.name}
            src={document.previewUrl}
            className="h-full w-full rounded border border-border/40 bg-white shadow-sm"
          />
        )}
      </div>
    </div>
  );
}

/** Centre column: compact list + hero viewer side-by-side. */
export function EcwDocumentCentre({
  documents,
  selectedId,
  onSelect,
  selectedDoc,
}: {
  documents: EcwViewerDocument[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  selectedDoc: EcwViewerDocument | null;
}) {
  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(148px,168px)_minmax(0,1fr)] bg-background">
      <EcwDocumentList documents={documents} selectedId={selectedId} onSelect={onSelect} />
      <EcwDocumentViewer document={selectedDoc} />
    </div>
  );
}
