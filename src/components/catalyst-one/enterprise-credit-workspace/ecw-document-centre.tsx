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
  if (kind === "image") return <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  if (kind === "office") return <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  return <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
}

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
    <div className="flex h-full min-h-0 flex-col border-b border-border/60 bg-background">
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Documents
        </p>
        <span className="text-[10px] tabular-nums text-muted-foreground">{documents.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {documents.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">No documents on this file yet.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {documents.map((doc) => {
              const selected = doc.id === selectedId;
              return (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(doc.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "bg-teal-50/90 dark:bg-teal-950/40"
                        : "hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <PreviewIcon kind={doc.previewKind} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">{doc.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span
                            className={cn(
                              "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold capitalize",
                              statusChip(doc.status),
                            )}
                          >
                            {doc.status}
                          </span>
                          <span className="rounded-full border border-border/60 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                            {doc.verificationStatus}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {doc.uploadedAt
                            ? new Date(doc.uploadedAt).toLocaleDateString("en-IN")
                            : "—"}{" "}
                          · {doc.uploadedBy ?? "—"}
                        </p>
                      </div>
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

export function EcwDocumentViewer({ document }: { document: EcwViewerDocument | null }) {
  if (!document) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center bg-slate-50/80 px-6 text-center dark:bg-zinc-950/40">
        <FileText className="h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm font-medium text-foreground">Select a document</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          The viewer opens inside this workspace — no download required for normal review.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100/80 dark:bg-zinc-950/50">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-background/90 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">{document.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {document.previewKind.toUpperCase()} · {document.verificationStatus}
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-2">
        {document.previewKind === "image" && document.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={document.previewUrl}
            alt={document.name}
            className="mx-auto h-full max-h-full w-auto max-w-full rounded-md border border-border/50 bg-white object-contain shadow-sm"
          />
        ) : document.previewKind === "office" ? (
          <div className="flex h-full flex-col items-center justify-center rounded-md border border-dashed border-border/70 bg-background/80 p-6 text-center">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-medium">Office preview coming soon</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Future support for Word / Excel inside the Enterprise Credit Workspace.
            </p>
          </div>
        ) : (
          <iframe
            title={document.name}
            src={document.previewUrl}
            className="h-full w-full rounded-md border border-border/50 bg-white shadow-sm"
          />
        )}
      </div>
    </div>
  );
}
