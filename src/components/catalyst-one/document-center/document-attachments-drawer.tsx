"use client";

/**
 * View all attachments for a document category — multi-file support.
 */

import { Download, Replace, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  downloadDocumentFromRegistry,
} from "@/lib/document-registry";
import type { DocumentRegistryRecord } from "@/types/document-registry";
import { cn } from "@/lib/utils";

export function DocumentAttachmentsDrawer({
  open,
  onClose,
  categoryLabel,
  records,
  onReplace,
  onPreview,
}: {
  open: boolean;
  onClose: () => void;
  categoryLabel: string;
  records: DocumentRegistryRecord[];
  onReplace: (record: DocumentRegistryRecord) => void;
  onPreview: (record: DocumentRegistryRecord) => void;
}) {
  if (!open) return null;

  const active = records.filter((r) => r.status === "active");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal>
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Attachments
            </p>
            <h2 className="truncate text-base font-semibold tracking-tight">{categoryLabel}</h2>
            <p className="text-[11px] text-muted-foreground">
              {active.length} file{active.length === 1 ? "" : "s"} in this category
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ul className="flex-1 space-y-2 overflow-y-auto p-4">
          {active.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border/70 px-3 py-8 text-center text-xs text-muted-foreground">
              No attachments yet. Use Upload or Add on the document row.
            </li>
          ) : (
            active.map((record, index) => (
              <li
                key={record.id}
                className={cn(
                  "rounded-xl border border-border/70 bg-card p-3 shadow-sm",
                )}
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  File {index + 1}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                  {record.displayName || record.originalFilename}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {(record.fileSizeBytes / 1024).toFixed(0)} KB · v{record.version} ·{" "}
                  {new Date(record.uploadedAt).toLocaleDateString()}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="inline-flex h-7 items-center rounded-md border border-border/60 px-2 text-[10px] font-medium hover:bg-muted/50"
                    onClick={() => onPreview(record)}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-border/60 px-2 text-[10px] font-medium hover:bg-muted/50"
                    onClick={() => void downloadDocumentFromRegistry(record)}
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-teal-500/35 bg-teal-500/10 px-2 text-[10px] font-medium text-teal-900 hover:bg-teal-500/15 dark:text-teal-100"
                    onClick={() => onReplace(record)}
                  >
                    <Replace className="h-3 w-3" />
                    Replace
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
