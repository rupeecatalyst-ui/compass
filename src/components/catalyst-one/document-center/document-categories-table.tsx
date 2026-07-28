"use client";

import { useMemo } from "react";
import { Eye, FilePlus2, Replace, Upload } from "lucide-react";
import {
  EnterpriseDataGrid,
  type EnterpriseGridColumnDef,
} from "@/components/catalyst-one/enterprise-grid";
import { useAuthContext } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import type { DocumentCategoryRow } from "@/lib/document-center/derive-category-rows";
import type { DocumentRegistryRecord } from "@/types/document-registry";

function RowAction({
  label,
  onClick,
  icon,
  primary,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-medium transition-colors",
        primary
          ? "border-teal-500/35 bg-teal-500/10 text-teal-900 hover:bg-teal-500/15 dark:text-teal-100"
          : "border-border/60 text-foreground hover:bg-muted/50",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * BAT #24 — Business Document Categories table.
 * Same EnterpriseDataGrid column-width SSOT as Opportunity Registry.
 */
export function DocumentCategoriesTable({
  rows,
  fileId: _fileId,
  highlightedKey,
  attachmentCountFor,
  activeRecordsForType,
  onCategoryTypeSelect,
  onUpload,
  onAdd,
  onView,
  onReplaceSingle,
  onOpenAttachments,
}: {
  rows: DocumentCategoryRow[];
  fileId: string;
  highlightedKey?: string | null;
  attachmentCountFor: (storageRef: string) => number;
  /** Active registry rows for the selected Document Owner only. */
  activeRecordsForType: (storageRef: string) => DocumentRegistryRecord[];
  onCategoryTypeSelect: (row: DocumentCategoryRow, typeRef: string) => void;
  onUpload: (storageRef: string, label: string) => void;
  onAdd: (storageRef: string, label: string) => void;
  onView: (storageRef: string, label: string) => void;
  onReplaceSingle: (storageRef: string, label: string, recordId: string) => void;
  onOpenAttachments: (storageRef: string, label: string) => void;
}) {
  const { user } = useAuthContext();

  const columns = useMemo<EnterpriseGridColumnDef<DocumentCategoryRow>[]>(
    () => [
      {
        id: "category",
        label: "Category",
        frozen: true,
        defaultOrder: 1,
        defaultWidth: 220,
        minWidth: 140,
        render: (row) => (
          <div id={`edie-cat-${row.key}`}>
            <p className="font-semibold text-foreground">{row.label}</p>
            <p className="text-[10px] text-muted-foreground">
              {row.fulfillment === "choice_one"
                ? "One acceptable document"
                : row.fulfillment === "folder"
                  ? "Folder upload"
                  : row.requiredItems.length > 1
                    ? `${row.requiredItems.length} required documents`
                    : "Required document"}
            </p>
          </div>
        ),
        exportValue: (row) => row.label,
      },
      {
        id: "selectedDocument",
        label: "Selected Document",
        defaultOrder: 2,
        defaultWidth: 220,
        minWidth: 160,
        render: (row) => (
          <select
            className="h-8 w-full max-w-full rounded-md border border-border bg-background px-2 text-xs"
            value={row.selectedTypeRef}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onCategoryTypeSelect(row, e.target.value)}
            aria-label={`${row.label} document type`}
          >
            {row.options.map((opt) => (
              <option key={opt.typeRef} value={opt.typeRef}>
                {opt.folderLabel || opt.label}
              </option>
            ))}
          </select>
        ),
        exportValue: (row) =>
          row.options.find((o) => o.typeRef === row.selectedTypeRef)?.label ??
          row.selectedTypeRef,
      },
      {
        id: "status",
        label: "Status",
        defaultOrder: 3,
        defaultWidth: 96,
        minWidth: 80,
        render: (row) => {
          const statusLabel =
            row.status === "complete"
              ? "Complete"
              : row.status === "partial"
                ? "Partial"
                : "Pending";
          return (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                row.status === "complete"
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                  : row.status === "partial"
                    ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                    : "bg-rose-500/15 text-rose-800 dark:text-rose-200",
              )}
            >
              {statusLabel}
            </span>
          );
        },
        exportValue: (row) => row.status,
      },
      {
        id: "files",
        label: "Files",
        defaultOrder: 4,
        defaultWidth: 64,
        minWidth: 56,
        align: "center",
        render: (row) => {
          const storageRef = row.activeItem.folderId ?? row.activeItem.typeRef;
          return (
            <span className="tabular-nums font-medium">
              {attachmentCountFor(storageRef)}
            </span>
          );
        },
        exportValue: (row) =>
          String(
            attachmentCountFor(row.activeItem.folderId ?? row.activeItem.typeRef),
          ),
      },
      {
        id: "actions",
        label: "Actions",
        defaultOrder: 999,
        defaultWidth: 200,
        minWidth: 140,
        align: "right",
        render: (row) => {
          const item = row.activeItem;
          const storageRef = item.folderId ?? item.typeRef;
          const label = item.folderLabel || item.label;
          const count = attachmentCountFor(storageRef);
          // Only count files for the selected Document Owner — never global receipts.
          const hasFiles = count > 0;
          if (!hasFiles) {
            return (
              <div className="flex flex-wrap justify-end gap-1">
                <RowAction
                  label="Upload"
                  onClick={() => onUpload(storageRef, label)}
                  icon={<Upload className="h-3 w-3" />}
                  primary
                />
              </div>
            );
          }
          return (
            <div className="flex flex-wrap justify-end gap-1">
              <RowAction
                label="Add"
                onClick={() => onAdd(storageRef, label)}
                icon={<FilePlus2 className="h-3 w-3" />}
              />
              <RowAction
                label="View"
                onClick={() => onView(storageRef, label)}
                icon={<Eye className="h-3 w-3" />}
              />
              <RowAction
                label="Replace"
                onClick={() => {
                  const records = activeRecordsForType(storageRef);
                  if (records.length <= 1) {
                    onReplaceSingle(storageRef, label, records[0]?.id ?? "");
                    return;
                  }
                  onOpenAttachments(storageRef, label);
                }}
                icon={<Replace className="h-3 w-3" />}
              />
            </div>
          );
        },
        exportValue: () => "",
      },
    ],
    [
      activeRecordsForType,
      attachmentCountFor,
      onAdd,
      onCategoryTypeSelect,
      onOpenAttachments,
      onReplaceSingle,
      onUpload,
      onView,
    ],
  );

  return (
    <EnterpriseDataGrid
      storageKey="catalyst.document-center.categories.v1"
      userId={user?.id}
      density="dense"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.key}
      highlightedRowKey={highlightedKey ?? null}
      emptyMessage="No document categories for this opportunity."
      toolbarLabel="Business Document Categories"
      tableMinWidthClassName="min-w-[780px]"
      maxHeightClassName="max-h-[min(58vh,36rem)]"
    />
  );
}
