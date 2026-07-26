"use client";

import { useMemo, useState } from "react";
import {
  Eye,
  FilePlus2,
  Replace,
} from "lucide-react";
import {
  loadAddressProofSelection,
  loadEdieReceipts,
  loadIdentityProofSelection,
  resolveEdieChecklistForLoanFile,
  seedEdieCertifiedRulesIfNeeded,
} from "@/lib/edie-certified";
import {
  deriveDocumentCategoryRows,
  type DocumentCategoryRow,
} from "@/lib/document-center/derive-category-rows";
import { listDocumentsByTypeRef } from "@/lib/document-registry";
import { cn } from "@/lib/utils";
import type { LoanFile } from "@/types/catalyst-one";
import type { EcwViewerDocument } from "@/types/enterprise-credit-workspace";

function statusLabel(row: DocumentCategoryRow, hasFiles: boolean): string {
  if (row.status === "complete" || hasFiles) {
    return hasFiles && row.status === "complete" ? "Verified" : "Complete";
  }
  if (row.status === "partial") return "Partial";
  return "Pending";
}

/**
 * EDIE-driven document categories for Credit Workbench (verification desk).
 * Mirrors Document Center category rows — no hardcoded document lists.
 */
export function EcwDocumentCategories({
  file,
  viewerDocs,
  onView,
}: {
  file: LoanFile;
  viewerDocs: EcwViewerDocument[];
  onView: (doc: EcwViewerDocument | null, categoryLabel: string) => void;
}) {
  const [focusByKey, setFocusByKey] = useState<Record<string, string>>({});

  const checklist = useMemo(() => {
    seedEdieCertifiedRulesIfNeeded();
    return resolveEdieChecklistForLoanFile(file, {
      receipts: loadEdieReceipts(file.id),
      addressProofSelection: loadAddressProofSelection(file.id),
      identityProofSelection: loadIdentityProofSelection(file.id),
    });
  }, [file]);

  const rows = useMemo(() => {
    return deriveDocumentCategoryRows(checklist, {
      focusByKey,
      fileCountByType: (typeRef) =>
        listDocumentsByTypeRef(file.id, typeRef).filter((r) => r.status === "active")
          .length,
    });
  }, [checklist, focusByKey, file.id]);

  const resolveViewerDoc = (row: DocumentCategoryRow): EcwViewerDocument | null => {
    const label = (row.activeItem.folderLabel || row.activeItem.label).toLowerCase();
    const hit =
      viewerDocs.find((d) => d.name.toLowerCase().includes(label.split(" ")[0] ?? "")) ??
      viewerDocs.find((d) =>
        label.split(" ").some((t) => t.length > 3 && d.name.toLowerCase().includes(t)),
      ) ??
      null;
    return hit;
  };

  return (
    <div
      data-ecw-layout="document-categories"
      className="flex h-full min-h-0 flex-col rounded-xl border border-border/70 bg-card shadow-sm"
    >
      <div className="border-b border-border/60 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
          Document Categories
        </p>
        <p className="text-[11px] text-muted-foreground">
          EDIE business proofs · verify against the open document
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-muted/50 text-[10px] uppercase tracking-wide text-muted-foreground backdrop-blur">
            <tr>
              <th className="px-3 py-2 font-semibold">Category</th>
              <th className="px-3 py-2 font-semibold">Selected Document</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Files</th>
              <th className="px-3 py-2 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((row) => {
              const storageRef = row.activeItem.folderId ?? row.activeItem.typeRef;
              const count = listDocumentsByTypeRef(file.id, storageRef).filter(
                (r) => r.status === "active",
              ).length;
              const hasFiles = count > 0 || row.activeItem.complete;
              return (
                <tr key={row.key} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-foreground">{row.label}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      className="h-8 w-full min-w-[10rem] max-w-[15rem] rounded-md border border-border bg-background px-2 text-xs"
                      value={row.selectedTypeRef}
                      onChange={(e) =>
                        setFocusByKey((prev) => ({
                          ...prev,
                          [row.key]: e.target.value,
                          [row.moduleId]: e.target.value,
                        }))
                      }
                      aria-label={`${row.label} document type`}
                    >
                      {row.options.map((opt) => (
                        <option key={opt.typeRef} value={opt.typeRef}>
                          {opt.folderLabel || opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                        row.status === "complete" || hasFiles
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                          : row.status === "partial"
                            ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                            : "bg-rose-500/15 text-rose-800 dark:text-rose-200",
                      )}
                    >
                      {statusLabel(row, hasFiles)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{count}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap justify-end gap-1">
                      <ActionChip
                        label="View"
                        icon={<Eye className="h-3 w-3" />}
                        onClick={() =>
                          onView(
                            resolveViewerDoc(row),
                            row.activeItem.folderLabel || row.activeItem.label,
                          )
                        }
                        primary={hasFiles}
                      />
                      {hasFiles ? (
                        <>
                          <ActionChip
                            label="Add"
                            icon={<FilePlus2 className="h-3 w-3" />}
                            onClick={() =>
                              onView(
                                resolveViewerDoc(row),
                                row.activeItem.folderLabel || row.activeItem.label,
                              )
                            }
                          />
                          <ActionChip
                            label="Replace"
                            icon={<Replace className="h-3 w-3" />}
                            onClick={() =>
                              onView(
                                resolveViewerDoc(row),
                                row.activeItem.folderLabel || row.activeItem.label,
                              )
                            }
                          />
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionChip({
  label,
  icon,
  onClick,
  primary,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-medium",
        primary
          ? "border-teal-500/35 bg-teal-500/10 text-teal-900 hover:bg-teal-500/15 dark:text-teal-100"
          : "border-border/60 hover:bg-muted/50",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
