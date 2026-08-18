"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  Replace,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDocumentFileSize } from "@/constants/document-registry";
import { documentRegistrySourceLabel } from "@/constants/document-intake";
import {
  canDeleteDocuments,
  canDownloadDocuments,
  canRenameDocuments,
  canReplaceDocuments,
  deleteDocumentFromRegistry,
  downloadDocumentFromRegistry,
  filterDocumentRegistryRecords,
  renameDocumentInRegistry,
} from "@/lib/document-registry";
import { useAuthContext } from "@/components/providers/auth-provider";
import {
  EnterpriseDataGrid,
  type EnterpriseGridColumnDef,
} from "@/components/catalyst-one/enterprise-grid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { DocumentRegistryRecord } from "@/types/document-registry";
import type { LoanFile } from "@/types/catalyst-one";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * BAT #24 — Enterprise Document Registry table.
 * Reuses Opportunity Registry column-width SSOT (`EnterpriseDataGrid`).
 */
export function DocumentRegistryPanel({
  file,
  records,
  customerLabel,
  onPreview,
  onReplace,
  onRefresh,
}: {
  file: LoanFile;
  records: DocumentRegistryRecord[];
  customerLabel: string;
  onPreview: (record: DocumentRegistryRecord) => void;
  onReplace: (record: DocumentRegistryRecord) => void;
  onRefresh: () => void;
}) {
  const { user } = useAuthContext();
  const [query, setQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<DocumentRegistryRecord | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DocumentRegistryRecord | null>(null);

  const filtered = useMemo(
    () =>
      filterDocumentRegistryRecords(records, {
        query,
        status: "active",
        typeRef: "all",
        uploadedBy: "all",
      }),
    [records, query],
  );

  const onDownload = useCallback(
    async (record: DocumentRegistryRecord) => {
      if (!canDownloadDocuments(user)) {
        toast.error("Download not permitted for your role.");
        return;
      }
      try {
        await downloadDocumentFromRegistry(record);
        toast.success(`Downloaded ${record.displayName}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Download failed");
      }
    },
    [user],
  );

  const submitRename = () => {
    if (!renameTarget || !canRenameDocuments(user)) return;
    const updated = renameDocumentInRegistry(renameTarget.id, renameValue);
    if (updated) {
      toast.success("Document renamed");
      onRefresh();
    }
    setRenameTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !canDeleteDocuments(user)) return;
    await deleteDocumentFromRegistry(deleteTarget.id);
    toast.success("Document deleted");
    setDeleteTarget(null);
    onRefresh();
  };

  const relatedLabel = `${customerLabel || file.customerName}${
    file.id ? ` · ${file.id}` : ""
  }`;

  const columns = useMemo<EnterpriseGridColumnDef<DocumentRegistryRecord>[]>(
    () => [
      {
        id: "fileName",
        label: "File Name",
        frozen: true,
        defaultOrder: 1,
        defaultWidth: 220,
        minWidth: 140,
        render: (row) => (
          <span className="block truncate font-medium" title={row.displayName}>
            {row.displayName}
          </span>
        ),
        exportValue: (row) => row.displayName,
      },
      {
        id: "category",
        label: "Category",
        defaultOrder: 2,
        defaultWidth: 140,
        minWidth: 100,
        render: (row) => (
          <span className="block truncate" title={row.categoryLabel}>
            {row.categoryLabel}
          </span>
        ),
        exportValue: (row) => row.categoryLabel,
      },
      {
        id: "source",
        label: "Source",
        defaultOrder: 3,
        defaultWidth: 140,
        minWidth: 110,
        render: (row) => (
          <span
            className="block truncate"
            title={
              row.uploadSource === "wealth_partner"
                ? `Catalyst Connect · ${row.uploadedBy}`
                : documentRegistrySourceLabel(row.uploadSource)
            }
          >
            {documentRegistrySourceLabel(row.uploadSource)}
          </span>
        ),
        exportValue: (row) => documentRegistrySourceLabel(row.uploadSource),
      },
      {
        id: "uploadedBy",
        label: "Uploaded By",
        defaultOrder: 4,
        defaultWidth: 120,
        minWidth: 90,
        render: (row) => row.uploadedBy,
        exportValue: (row) => row.uploadedBy,
      },
      {
        id: "uploadedAt",
        label: "Uploaded On",
        defaultOrder: 5,
        defaultWidth: 150,
        minWidth: 120,
        render: (row) => (
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">
            {formatDate(row.uploadedAt)}
          </span>
        ),
        exportValue: (row) => formatDate(row.uploadedAt),
      },
      {
        id: "size",
        label: "Size",
        defaultOrder: 5,
        defaultWidth: 80,
        minWidth: 64,
        align: "right",
        render: (row) => (
          <span className="tabular-nums">
            {formatDocumentFileSize(row.fileSizeBytes)}
          </span>
        ),
        exportValue: (row) => formatDocumentFileSize(row.fileSizeBytes),
      },
      {
        id: "related",
        label: "Related",
        defaultOrder: 6,
        defaultWidth: 160,
        minWidth: 110,
        render: () => (
          <span className="block truncate text-muted-foreground" title={relatedLabel}>
            {relatedLabel}
          </span>
        ),
        exportValue: () => relatedLabel,
      },
      {
        id: "status",
        label: "Status",
        defaultOrder: 7,
        defaultWidth: 88,
        minWidth: 72,
        render: (row) => (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold text-emerald-800 dark:text-emerald-200">
            {row.status === "active" ? "Active" : row.status}
          </span>
        ),
        exportValue: (row) => (row.status === "active" ? "Active" : row.status),
      },
      {
        id: "actions",
        label: "Actions",
        defaultOrder: 999,
        defaultWidth: 72,
        minWidth: 64,
        align: "right",
        render: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={() => onPreview(row)}>
                <Eye className="mr-2 h-3 w-3" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void onDownload(row)}>
                <Download className="mr-2 h-3 w-3" />
                Download
              </DropdownMenuItem>
              {canReplaceDocuments(user) ? (
                <DropdownMenuItem onClick={() => onReplace(row)}>
                  <Replace className="mr-2 h-3 w-3" />
                  Replace
                </DropdownMenuItem>
              ) : null}
              {canRenameDocuments(user) ? (
                <DropdownMenuItem
                  onClick={() => {
                    setRenameTarget(row);
                    setRenameValue(row.displayName);
                  }}
                >
                  <Pencil className="mr-2 h-3 w-3" />
                  Rename
                </DropdownMenuItem>
              ) : null}
              {canDeleteDocuments(user) ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteTarget(row)}
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Delete
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        exportValue: () => "",
      },
    ],
    [onDownload, onPreview, onReplace, relatedLabel, user],
  );

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Document Registry</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            All uploaded files for this case — updates automatically after upload.
          </p>
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search registry…"
          className="h-8 max-w-xs text-xs"
        />
      </div>

      <div className="mt-3">
        <EnterpriseDataGrid
          storageKey="catalyst.document-center.registry.v1"
          userId={user?.id}
          density="dense"
          columns={columns}
          rows={filtered}
          rowKey={(row) => row.id}
          emptyMessage="No documents uploaded yet. Use Upload on a checklist item or the drop zone above."
          toolbarLabel={`Document Registry · ${filtered.length}`}
          tableMinWidthClassName="min-w-[960px]"
          maxHeightClassName="max-h-[min(52vh,28rem)]"
        />
      </div>

      <Dialog open={Boolean(renameTarget)} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="h-9 text-sm"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitRename}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteTarget?.displayName} will be removed from the registry. This action requires
            Manager access or above.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
