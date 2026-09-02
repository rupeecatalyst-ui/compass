"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Expand,
  History,
  Maximize2,
  RotateCw,
  Shrink,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  canPreviewDocument,
  createBlobObjectUrl,
  downloadDocumentFromRegistry,
} from "@/lib/document-registry";
import { documentWorkspaceReviewLabel } from "@/lib/document-workspace/review-status";
import type { DocumentWorkspaceRow } from "@/lib/document-workspace";
import { cn } from "@/lib/utils";

export function DocumentWorkspacePreview({
  row,
  canReview,
  onClose,
  onAccept,
  onReject,
  onRequestReplacement,
  fullscreen,
  onToggleFullscreen,
}: {
  row: DocumentWorkspaceRow;
  canReview: boolean;
  onClose: () => void;
  onAccept: () => void;
  onReject: (reason: string) => void;
  onRequestReplacement: (reason: string) => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [fit, setFit] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const versions = row.record?.versions ?? [];
  const version =
    versions.find((v) => v.id === versionId) ??
    versions.find((v) => v.isCurrent) ??
    versions[0];

  useEffect(() => {
    setZoom(100);
    setRotation(0);
    setFit(true);
    setReason("");
    setVersionId(versions.find((v) => v.isCurrent)?.id ?? versions[0]?.id ?? null);
  }, [row.id]);

  useEffect(() => {
    if (!version) {
      setPreviewUrl(null);
      return;
    }
    let revoked: string | null = null;
    let cancelled = false;
    void createBlobObjectUrl(version.blobId).then((url) => {
      if (cancelled) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      revoked = url;
      setPreviewUrl(url);
    });
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [version?.blobId, version?.id]);

  const previewable =
    version && previewUrl && canPreviewDocument(version.mimeType, version.originalFilename);
  const isImage = Boolean(version?.mimeType.startsWith("image/"));

  return (
    <aside
      className={cn(
        "flex min-h-[28rem] flex-col border-l border-border/70 bg-background",
        fullscreen && "fixed inset-0 z-[90] min-h-0 border-l-0",
      )}
      aria-label="Document preview"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{row.typeLabel}</p>
          <p className="text-[10px] text-muted-foreground">
            {documentWorkspaceReviewLabel(row.reviewStatus)}
            {version ? ` · v${version.version}` : " · No file"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setZoom((z) => Math.max(50, z - 10))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] tabular-nums text-muted-foreground">{zoom}%</span>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setZoom((z) => Math.min(200, z + 10))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setFit(true); setZoom(100); }}>
            Fit
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setRotation((r) => (r + 90) % 360)}>
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setHistoryOpen((v) => !v)}>
            <History className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={onToggleFullscreen}>
            {fullscreen ? <Shrink className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
          {row.record ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => void downloadDocumentFromRegistry(row.record!, version?.id)}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        {historyOpen ? (
          <nav className="w-36 shrink-0 overflow-y-auto border-r border-border/60 p-2" aria-label="Version history">
            {versions.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "mb-1 w-full rounded-md border px-2 py-1.5 text-left text-[10px]",
                  item.id === version?.id ? "border-primary bg-primary/10" : "border-border/60",
                )}
                onClick={() => setVersionId(item.id)}
              >
                v{item.version}
                {item.isCurrent ? " · current" : ""}
              </button>
            ))}
            {versions.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">No versions</p>
            ) : null}
          </nav>
        ) : null}
        <div className="min-w-0 flex-1 overflow-auto bg-muted/20 p-3">
          {previewable ? (
            isImage ? (
              <img
                src={previewUrl!}
                alt={row.typeLabel}
                className="mx-auto origin-center"
                style={{
                  transform: `rotate(${rotation}deg) scale(${fit ? zoom / 100 : zoom / 100})`,
                  maxWidth: fit ? "100%" : "none",
                }}
              />
            ) : (
              <iframe
                title={row.typeLabel}
                src={previewUrl!}
                className="h-full min-h-[24rem] w-full rounded-md border border-border/50 bg-white"
                style={{ transform: `rotate(${rotation}deg) scale(${zoom / 100})`, transformOrigin: "top center" }}
              />
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              Preview is unavailable for this file. Download to review the original.
            </p>
          )}
        </div>
      </div>
      <footer className="space-y-2 border-t border-border/60 p-3">
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reject / replacement reason (required for reject)"
          className="min-h-[4rem] text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={!canReview || !row.record} onClick={onAccept}>
            Accept
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={!canReview || !row.record || !reason.trim()}
            onClick={() => onReject(reason.trim())}
          >
            Reject
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canReview}
            onClick={() => onRequestReplacement(reason.trim())}
          >
            Request Replacement
          </Button>
          <span className="ml-auto hidden text-[10px] text-muted-foreground sm:inline">
            <Expand className="mr-1 inline h-3 w-3" />
            Preview uses about half the workspace. Closing restores the registry.
          </span>
        </div>
      </footer>
    </aside>
  );
}
