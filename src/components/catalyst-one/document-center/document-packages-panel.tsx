"use client";

/**
 * CO-DOC-003 — Document Packages panel (folder uploads) in Document Center.
 * Coexists with individual file uploads; does not replace Upload Files.
 */

import { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FolderOpen,
  Loader2,
  Plus,
  Replace,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDocumentFileSize } from "@/constants/document-registry";
import {
  addFilesToDocumentPackage,
  appendDocumentPackageTimeline,
  deleteDocumentPackageWithContents,
  downloadDocumentPackageAsZip,
  markDocumentPackageOpened,
  removeDocumentIdFromPackage,
} from "@/lib/document-package";
import {
  canDeleteDocuments,
  canDownloadDocuments,
  canPreviewDocument,
  canReplaceDocuments,
  canUploadDocuments,
  deleteDocumentFromRegistry,
  downloadDocumentFromRegistry,
} from "@/lib/document-registry";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DocumentPackageRecord } from "@/types/document-package";
import type { DocumentRegistryRecord, DocumentUploadProgress } from "@/types/document-registry";
import type { DocumentEntityLinks } from "@/types/document-registry";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: DocumentPackageRecord["status"]) {
  switch (status) {
    case "uploading":
      return "Uploading";
    case "complete":
      return "Complete";
    case "partial":
      return "Partial";
    default:
      return status;
  }
}

export function DocumentPackagesPanel({
  packages,
  recordsById,
  links,
  uploaderName,
  onRefresh,
  onPreviewRecord,
  onReplaceRecord,
  classifyFile,
  onProgress,
}: {
  packages: DocumentPackageRecord[];
  recordsById: Map<string, DocumentRegistryRecord>;
  links: DocumentEntityLinks;
  uploaderName: string;
  onRefresh: () => void;
  onPreviewRecord: (record: DocumentRegistryRecord) => void;
  onReplaceRecord: (record: DocumentRegistryRecord) => void;
  classifyFile: (file: File) => { typeRef: string; categoryLabel: string };
  onProgress?: (progress: DocumentUploadProgress | null) => void;
}) {
  const { user } = useAuthContext();
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const addInputRef = useRef<HTMLInputElement | null>(null);
  const addTargetRef = useRef<string | null>(null);

  const visible = useMemo(
    () => packages.filter((p) => p.status !== "deleted"),
    [packages],
  );

  if (!visible.length) return null;

  const openFolder = (pkg: DocumentPackageRecord) => {
    const next = openId === pkg.id ? null : pkg.id;
    setOpenId(next);
    if (next) {
      markDocumentPackageOpened(pkg.id, uploaderName);
    }
  };

  const downloadFolder = async (pkg: DocumentPackageRecord) => {
    if (!canDownloadDocuments(user)) {
      toast.error("Download not permitted for your role.");
      return;
    }
    setBusyId(pkg.id);
    try {
      const result = await downloadDocumentPackageAsZip(pkg.id);
      if (!result.ok) toast.error(result.reason);
      else toast.success(`Downloaded ${result.filename}`);
    } finally {
      setBusyId(null);
    }
  };

  const addMore = (pkg: DocumentPackageRecord) => {
    if (!canUploadDocuments(user)) {
      toast.error("Upload not permitted for your role.");
      return;
    }
    addTargetRef.current = pkg.id;
    addInputRef.current?.click();
  };

  const onAddFiles = async (files: FileList | null) => {
    const packageId = addTargetRef.current;
    if (!files?.length || !packageId) return;
    setBusyId(packageId);
    onProgress?.({
      phase: "reading",
      percent: 5,
      message: "Adding files to package…",
    });
    try {
      await addFilesToDocumentPackage({
        packageId,
        files: Array.from(files).map((file) => {
          const c = classifyFile(file);
          return { file, typeRef: c.typeRef, categoryLabel: c.categoryLabel };
        }),
        uploadedBy: uploaderName,
        links,
        onProgress: (p) => onProgress?.(p),
      });
      toast.success("Files added to Document Package.");
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add files");
    } finally {
      setBusyId(null);
      onProgress?.(null);
      if (addInputRef.current) addInputRef.current.value = "";
      addTargetRef.current = null;
    }
  };

  const deletePackage = async (pkg: DocumentPackageRecord) => {
    if (!canDeleteDocuments(user)) {
      toast.error("Delete not permitted for your role.");
      return;
    }
    const ok = window.confirm(
      `Delete Document Package “${pkg.folderName}” and its ${pkg.fileCount} file(s)?`,
    );
    if (!ok) return;
    setBusyId(pkg.id);
    try {
      await deleteDocumentPackageWithContents({
        packageId: pkg.id,
        actorId: uploaderName,
        deleteContainedFiles: true,
      });
      toast.success("Document Package deleted.");
      if (openId === pkg.id) setOpenId(null);
      onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const deleteFile = async (pkg: DocumentPackageRecord, record: DocumentRegistryRecord) => {
    if (!canDeleteDocuments(user)) {
      toast.error("Delete not permitted for your role.");
      return;
    }
    await deleteDocumentFromRegistry(record.id);
    removeDocumentIdFromPackage(pkg.id, record.id, record.fileSizeBytes);
    appendDocumentPackageTimeline({
      packageId: pkg.id,
      eventType: "file_deleted",
      description: `${record.displayName} deleted from package “${pkg.folderName}”.`,
      actorId: uploaderName,
      metadata: { documentId: record.id },
    });
    toast.success("File deleted.");
    onRefresh();
  };

  return (
    <div
      data-dc-surface="document-packages"
      className="space-y-3 rounded-xl border border-border/70 bg-card p-3 shadow-sm"
    >
      <input
        ref={addInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => void onAddFiles(e.target.files)}
      />
      <div className="border-b border-border/60 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
          Document Packages
        </p>
        <p className="text-sm font-semibold tracking-tight">Uploaded folders</p>
        <p className="text-[11px] text-muted-foreground">
          Folder uploads appear as packages. Individual file uploads remain in the registry below.
        </p>
      </div>

      <ul className="space-y-2">
        {visible.map((pkg) => {
          const expanded = openId === pkg.id;
          const busy = busyId === pkg.id;
          return (
            <li
              key={pkg.id}
              className="rounded-lg border border-border/60 bg-background/60"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <FolderOpen className="h-4 w-4 shrink-0 text-teal-700" />
                    <p className="truncate text-sm font-semibold">{pkg.folderName}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        pkg.status === "complete" && "border-emerald-500/40 text-emerald-800",
                        pkg.status === "uploading" && "border-amber-500/40 text-amber-800",
                        pkg.status === "partial" && "border-orange-500/40 text-orange-800",
                      )}
                    >
                      {statusLabel(pkg.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {pkg.fileCount} file{pkg.fileCount === 1 ? "" : "s"} ·{" "}
                    {formatDocumentFileSize(pkg.totalSizeBytes)} · {pkg.uploadedBy} ·{" "}
                    {formatDate(pkg.uploadedAt)}
                  </p>
                  {pkg.status === "uploading" ? (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-teal-600 transition-all"
                        style={{ width: `${pkg.completionPercent}%` }}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px]"
                    onClick={() => openFolder(pkg)}
                  >
                    {expanded ? (
                      <ChevronDown className="mr-1 h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="mr-1 h-3.5 w-3.5" />
                    )}
                    Open Folder
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px]"
                    disabled={busy}
                    onClick={() => void downloadFolder(pkg)}
                  >
                    {busy ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="mr-1 h-3.5 w-3.5" />
                    )}
                    Download Folder
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px]"
                    disabled={busy}
                    onClick={() => addMore(pkg)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add More Files
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-[11px] text-destructive"
                    disabled={busy || !canDeleteDocuments(user)}
                    onClick={() => void deletePackage(pkg)}
                    title={
                      canDeleteDocuments(user)
                        ? "Delete package"
                        : "Delete requires Manager role"
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {expanded ? (
                <div className="border-t border-border/50 px-3 py-2">
                  <table className="w-full text-left text-[11px]">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="py-1.5 font-medium">File Name</th>
                        <th className="py-1.5 font-medium">Type</th>
                        <th className="py-1.5 font-medium">Size</th>
                        <th className="py-1.5 font-medium">Upload Date</th>
                        <th className="py-1.5 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pkg.documentIds.map((id) => {
                        const rec = recordsById.get(id);
                        if (!rec || rec.status === "deleted") return null;
                        const ext =
                          rec.originalFilename.split(".").pop()?.toUpperCase() ||
                          rec.mimeType;
                        return (
                          <tr key={id} className="border-t border-border/40">
                            <td className="max-w-[220px] truncate py-1.5 font-medium">
                              {pkg.relativePaths[id] || rec.displayName}
                            </td>
                            <td className="py-1.5 text-muted-foreground">{ext}</td>
                            <td className="py-1.5">
                              {formatDocumentFileSize(rec.fileSizeBytes)}
                            </td>
                            <td className="py-1.5 text-muted-foreground">
                              {formatDate(rec.uploadedAt)}
                            </td>
                            <td className="py-1.5">
                              <div className="flex justify-end gap-0.5">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  disabled={!canPreviewDocument(rec.mimeType, rec.originalFilename)}
                                  onClick={() => onPreviewRecord(rec)}
                                  title="Preview"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  disabled={!canDownloadDocuments(user)}
                                  onClick={() => void downloadDocumentFromRegistry(rec)}
                                  title="Download"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  disabled={!canReplaceDocuments(user)}
                                  onClick={() => onReplaceRecord(rec)}
                                  title="Replace"
                                >
                                  <Replace className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive"
                                  disabled={!canDeleteDocuments(user)}
                                  onClick={() => void deleteFile(pkg, rec)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!pkg.documentIds.some((id) => {
                    const r = recordsById.get(id);
                    return r && r.status !== "deleted";
                  }) ? (
                    <p className="py-2 text-[11px] text-muted-foreground">
                      No files in this package.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
