"use client";

/**
 * CO-DOC-005 — Preview resolved only via Document Registry record → blobId.
 */
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  canPreviewDocument,
  downloadDocumentFromRegistry,
  getDocumentRegistryRecord,
} from "@/lib/document-registry";
import { previewDocumentRegistryRecord } from "@/lib/document-package";
import { formatDocumentFileSize } from "@/constants/document-registry";
import { documentRegistrySourceLabel } from "@/constants/document-intake";

export function DocumentRegistryRecordPreviewDialog({
  open,
  recordId,
  actorId,
  onOpenChange,
}: {
  open: boolean;
  recordId: string | null;
  actorId?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const record = recordId ? getDocumentRegistryRecord(recordId) : undefined;

  useEffect(() => {
    if (!open || !recordId) {
      setUrl(null);
      return;
    }
    let revoked: string | null = null;
    let cancelled = false;
    void previewDocumentRegistryRecord(recordId, actorId).then((next) => {
      if (cancelled) {
        if (next) URL.revokeObjectURL(next);
        return;
      }
      revoked = next;
      setUrl(next);
    });
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [open, recordId, actorId]);

  const previewable =
    record && canPreviewDocument(record.mimeType, record.originalFilename);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">
            {record?.displayName || "Document Preview"}
          </DialogTitle>
        </DialogHeader>
        {record ? (
          <>
            <p className="text-[11px] text-muted-foreground">
              {record.mimeType} · {formatDocumentFileSize(record.fileSizeBytes)} ·{" "}
              {record.uploadedBy}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Source: {documentRegistrySourceLabel(record.uploadSource)}
              {record.uploadSource === "wealth_partner" && record.uploadedBy
                ? ` · Partner: ${record.uploadedBy}`
                : ""}
              {record.links.packageRelativePath
                ? ` · ${record.links.packageRelativePath}`
                : ""}
            </p>
          </>
        ) : null}
        <div className="mt-2 min-h-[320px] rounded-lg border border-border/60 bg-muted/20 p-2">
          {!record ? (
            <p className="p-6 text-sm text-muted-foreground">Document not found in Registry.</p>
          ) : !previewable ? (
            <p className="p-6 text-sm text-muted-foreground">
              Preview not supported for this file type. Use Download.
            </p>
          ) : !url ? (
            <p className="p-6 text-sm text-muted-foreground">
              Preview unavailable — storage blob missing. Download may also fail until durable
              object storage is available for large files.
            </p>
          ) : record.mimeType.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={record.displayName} className="mx-auto max-h-[70vh] object-contain" />
          ) : (
            <iframe title={record.displayName} src={url} className="h-[70vh] w-full rounded" />
          )}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          {record ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void downloadDocumentFromRegistry(record)}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
