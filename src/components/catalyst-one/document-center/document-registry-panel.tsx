"use client";

import { useMemo, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  const onDownload = async (record: DocumentRegistryRecord) => {
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
  };

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

      {filtered.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-xs text-muted-foreground">
          No documents uploaded yet. Use Upload on a checklist item or the drop zone above.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">File Name</TableHead>
                <TableHead className="text-[10px]">Category</TableHead>
                <TableHead className="text-[10px]">Uploaded By</TableHead>
                <TableHead className="text-[10px]">Upload Date</TableHead>
                <TableHead className="text-[10px]">Size</TableHead>
                <TableHead className="text-[10px]">Related</TableHead>
                <TableHead className="text-[10px]">Status</TableHead>
                <TableHead className="text-[10px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="max-w-[180px] truncate text-xs font-medium">
                    {record.displayName}
                  </TableCell>
                  <TableCell className="text-[11px]">{record.categoryLabel}</TableCell>
                  <TableCell className="text-[11px]">{record.uploadedBy}</TableCell>
                  <TableCell className="whitespace-nowrap text-[11px]">
                    {formatDate(record.uploadedAt)}
                  </TableCell>
                  <TableCell className="text-[11px] tabular-nums">
                    {formatDocumentFileSize(record.fileSizeBytes)}
                  </TableCell>
                  <TableCell className="max-w-[140px] truncate text-[11px] text-muted-foreground">
                    {customerLabel || file.customerName}
                    {file.id ? ` · ${file.id}` : ""}
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold text-emerald-800 dark:text-emerald-200">
                      {record.status === "active" ? "Active" : record.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        <DropdownMenuItem onClick={() => onPreview(record)}>
                          <Eye className="mr-2 h-3 w-3" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void onDownload(record)}>
                          <Download className="mr-2 h-3 w-3" />
                          Download
                        </DropdownMenuItem>
                        {canReplaceDocuments(user) ? (
                          <DropdownMenuItem onClick={() => onReplace(record)}>
                            <Replace className="mr-2 h-3 w-3" />
                            Replace
                          </DropdownMenuItem>
                        ) : null}
                        {canRenameDocuments(user) ? (
                          <DropdownMenuItem
                            onClick={() => {
                              setRenameTarget(record);
                              setRenameValue(record.displayName);
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
                              onClick={() => setDeleteTarget(record)}
                            >
                              <Trash2 className="mr-2 h-3 w-3" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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
