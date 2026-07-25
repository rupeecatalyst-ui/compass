"use client";

import { useMemo } from "react";
import { Plus, Upload } from "lucide-react";
import {
  EnterpriseDataGrid,
  type EnterpriseGridColumnDef,
} from "@/components/catalyst-one/enterprise-grid";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  saveOtherDocumentEntries,
  type OtherDocumentEntry,
} from "@/lib/document-center/other-documents";

/**
 * BAT #24 — Other Documents table on Document Center.
 * Reuses EnterpriseDataGrid column-width SSOT (Opportunity Registry).
 */
export function DocumentOtherDocumentsTable({
  fileId,
  entries,
  setEntries,
  attachmentCountFor,
  onUpload,
  onAddRow,
}: {
  fileId: string;
  entries: OtherDocumentEntry[];
  setEntries: React.Dispatch<React.SetStateAction<OtherDocumentEntry[]>>;
  attachmentCountFor: (typeRef: string) => number;
  onUpload: (typeRef: string, name: string) => void;
  onAddRow: () => void;
}) {
  const { user } = useAuthContext();

  const columns = useMemo<EnterpriseGridColumnDef<OtherDocumentEntry>[]>(
    () => [
      {
        id: "documentName",
        label: "Document Name",
        frozen: true,
        defaultOrder: 1,
        defaultWidth: 360,
        minWidth: 200,
        render: (entry) => {
          const count = attachmentCountFor(entry.typeRef);
          return (
            <div>
              <Input
                className="h-8 text-xs"
                value={entry.name}
                placeholder="e.g. CA Declaration"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const name = e.target.value;
                  setEntries((prev) => {
                    const next = prev.map((row) =>
                      row.id === entry.id ? { ...row, name } : row,
                    );
                    saveOtherDocumentEntries(fileId, next);
                    return next;
                  });
                }}
              />
              {count > 0 ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {count} file{count === 1 ? "" : "s"} attached
                </p>
              ) : null}
            </div>
          );
        },
        exportValue: (entry) => entry.name,
      },
      {
        id: "upload",
        label: "Upload",
        defaultOrder: 2,
        defaultWidth: 100,
        minWidth: 80,
        align: "right",
        render: (entry) => {
          const count = attachmentCountFor(entry.typeRef);
          return (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpload(entry.typeRef, entry.name.trim() || "Supporting Document");
                }}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-medium transition-colors",
                  count === 0
                    ? "border-teal-500/35 bg-teal-500/10 text-teal-900 hover:bg-teal-500/15 dark:text-teal-100"
                    : "border-border/60 text-foreground hover:bg-muted/50",
                )}
              >
                <Upload className="h-3 w-3" />
                Upload
              </button>
            </div>
          );
        },
        exportValue: () => "",
      },
    ],
    [attachmentCountFor, fileId, onUpload, setEntries],
  );

  return (
    <section
      data-dc-section="other-documents"
      className="rounded-xl border border-border/70 bg-card p-3 shadow-sm"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Other Documents</h2>
          <p className="text-[11px] text-muted-foreground">
            Custom supporting documents — unlimited. Checklist unchanged.
          </p>
        </div>
        <Button type="button" size="sm" className="h-8" onClick={onAddRow}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add row
        </Button>
      </div>

      <EnterpriseDataGrid
        storageKey="catalyst.document-center.other-documents.v1"
        userId={user?.id}
        density="dense"
        columns={columns}
        rows={entries}
        rowKey={(row) => row.id}
        emptyMessage="No custom documents yet. Add a row and name it (e.g. Builder Letter)."
        toolbarLabel="Other Documents"
        tableMinWidthClassName="min-w-[520px]"
        maxHeightClassName="max-h-[min(40vh,22rem)]"
      />
    </section>
  );
}
