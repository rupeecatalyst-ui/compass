"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  Printer,
  RotateCw,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  canPreviewDocument,
  createBlobObjectUrl,
  downloadDocumentFromRegistry,
  getDocumentRegistryRecord,
} from "@/lib/document-registry";
import { reasonForDocument } from "@/lib/document-center/versions";
import type { DocumentCenterVersion } from "@/lib/document-center/versions";
import { cn } from "@/lib/utils";
import type { EdieChecklistItem } from "@/types/edie-certified-rules";

export function DocumentViewerOverlay({
  open,
  onClose,
  item,
  versions,
  allItems,
  workflowStage,
  onNavigate,
  onReplace,
  onShowHistory,
}: {
  open: boolean;
  onClose: () => void;
  item: EdieChecklistItem | null;
  versions: DocumentCenterVersion[];
  allItems: EdieChecklistItem[];
  workflowStage: string;
  onNavigate: (typeRef: string) => void;
  onReplace: (item: EdieChecklistItem) => void;
  onShowHistory: (item: EdieChecklistItem) => void;
}) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [viewVersionId, setViewVersionId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setZoom(100);
    setRotation(0);
    const current = versions.find((v) => v.isCurrent) ?? versions[versions.length - 1];
    setViewVersionId(current?.id ?? null);
  }, [open, item?.typeRef, versions]);

  const version = versions.find((v) => v.id === viewVersionId) ?? versions[versions.length - 1];

  useEffect(() => {
    if (!open || !version) {
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
  }, [open, version?.blobId, version?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const index = useMemo(
    () => (item ? allItems.findIndex((i) => i.typeRef === item.typeRef) : -1),
    [allItems, item],
  );
  const prev = index > 0 ? allItems[index - 1] : null;
  const next = index >= 0 && index < allItems.length - 1 ? allItems[index + 1] : null;

  const insight = useMemo(() => {
    if (!item) return "";
    if (item.complete) {
      return `This document satisfies the ${item.label} requirement.`;
    }
    if (item.label.toLowerCase().includes("bank") || item.label.toLowerCase().includes("statement")) {
      return "This statement should cover the latest six months. Please verify before lender login.";
    }
    return reasonForDocument(item);
  }, [item]);

  const showPreview =
    version &&
    previewUrl &&
    canPreviewDocument(version.mimeType, version.fileName);

  const onDownload = async () => {
    if (!version?.registryRecordId) return;
    const record = getDocumentRegistryRecord(version.registryRecordId);
    if (!record) return;
    await downloadDocumentFromRegistry(record, version.id);
  };

  if (!open || !item) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-zinc-950/70 p-2 sm:p-4"
      role="dialog"
      aria-modal
      aria-label={`View ${item.label}`}
    >
      <div className="flex h-[min(95dvh,920px)] w-[min(96vw,1200px)] overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl">
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">
                {version
                  ? `Version ${version.version} · ${version.fileName}`
                  : "No file uploaded yet"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <IconBtn label="Zoom out" onClick={() => setZoom((z) => Math.max(50, z - 10))}>
                <ZoomOut className="h-3.5 w-3.5" />
              </IconBtn>
              <span className="px-1 text-[10px] tabular-nums text-muted-foreground">{zoom}%</span>
              <IconBtn label="Zoom in" onClick={() => setZoom((z) => Math.min(200, z + 10))}>
                <ZoomIn className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn label="Rotate" onClick={() => setRotation((r) => (r + 90) % 360)}>
                <RotateCw className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn label="Previous" disabled={!prev} onClick={() => prev && onNavigate(prev.typeRef)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn label="Next" disabled={!next} onClick={() => next && onNavigate(next.typeRef)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn label="Download" disabled={!version} onClick={() => void onDownload()}>
                <Download className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn label="Print" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" />
              </IconBtn>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[10px]"
                onClick={() => onReplace(item)}
              >
                Replace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-[10px]"
                onClick={() => onShowHistory(item)}
              >
                <History className="h-3 w-3" />
                History
              </Button>
              <IconBtn label="Close" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </IconBtn>
            </div>
          </header>

          <div className="relative min-h-0 flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-900">
            <div
              className="mx-auto my-6 flex min-h-[60%] w-[min(100%,720px)] items-center justify-center rounded-lg border border-border/50 bg-white shadow-md dark:bg-zinc-950"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: "center top",
              }}
            >
              {showPreview && version?.previewKind === "pdf" ? (
                <iframe
                  title={version.fileName}
                  src={previewUrl}
                  className="h-[70vh] w-full rounded-lg"
                />
              ) : showPreview && version?.previewKind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={version.fileName}
                  className="max-h-[70vh] max-w-full object-contain p-4"
                />
              ) : version ? (
                <div className="space-y-3 p-8 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {version.previewKind.toUpperCase()} · Preview unavailable in browser
                  </p>
                  <p className="text-lg font-semibold text-foreground">{version.fileName}</p>
                  <p className="text-sm text-muted-foreground">{version.fileSizeLabel}</p>
                  <Button type="button" size="sm" className="mt-2" onClick={() => void onDownload()}>
                    Download file
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 p-10 text-center">
                  <p className="text-sm font-semibold">No file uploaded</p>
                  <p className="text-xs text-muted-foreground">
                    Upload or replace to preview this document in-place.
                  </p>
                  <Button type="button" size="sm" className="mt-2" onClick={() => onReplace(item)}>
                    Upload now
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="hidden w-[280px] shrink-0 flex-col border-l border-border/60 bg-muted/20 lg:flex">
          <div className="border-b border-border/60 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Document information
            </p>
            <dl className="mt-2 space-y-1.5 text-[11px]">
              <InfoRow label="Uploaded By" value={version?.uploadedBy ?? "—"} />
              <InfoRow
                label="Upload Date"
                value={
                  version
                    ? new Date(version.uploadedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"
                }
              />
              <InfoRow label="Version" value={version ? String(version.version) : "—"} />
              <InfoRow label="Category" value={item.moduleLabel} />
              <InfoRow
                label="Severity"
                value={
                  item.critical ? "Critical" : item.mandatory ? "Mandatory" : item.optional ? "Optional" : "Required"
                }
              />
              <InfoRow label="Applicable Stage" value={workflowStage.replace(/_/g, " ")} />
              <InfoRow label="Verification" value={item.complete ? "Received" : "Pending"} />
              <InfoRow label="File Size" value={version?.fileSizeLabel ?? "—"} />
              <InfoRow label="Document Type" value={version?.mimeHint.toUpperCase() ?? "—"} />
            </dl>
          </div>

          <div className="flex-1 px-3 py-3">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-800 dark:text-teal-200">
              <Sparkles className="h-3.5 w-3.5" />
              CHANAKYA
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-foreground/90">{insight}</p>
          </div>

          {versions.length > 0 ? (
            <div className="border-t border-border/60 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Versions
              </p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {[...versions].reverse().map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => setViewVersionId(v.id)}
                      className={cn(
                        "w-full rounded-md px-2 py-1.5 text-left text-[10px] transition-colors hover:bg-muted/60",
                        viewVersionId === v.id && "bg-teal-500/10",
                      )}
                    >
                      <span className="font-semibold">Version {v.version}</span>
                      {v.isCurrent ? (
                        <span className="ml-1 text-teal-700 dark:text-teal-300">· Current</span>
                      ) : null}
                      <span className="mt-0.5 block text-muted-foreground">
                        {v.uploadedBy} ·{" "}
                        {new Date(v.uploadedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}
