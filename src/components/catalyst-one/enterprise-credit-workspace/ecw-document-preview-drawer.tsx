"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EcwViewerDocument } from "@/types/enterprise-credit-workspace";

/**
 * Right-side document preview drawer (~40–45% width).
 * Form stays editable while open — never replaces the workspace.
 */
export function EcwDocumentPreviewDrawer({
  open,
  onClose,
  document,
  categoryLabel,
}: {
  open: boolean;
  onClose: () => void;
  document: EcwViewerDocument | null;
  categoryLabel?: string;
}) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [page, setPage] = useState(1);

  if (!open) return null;

  const title = document?.name ?? categoryLabel ?? "Document preview";

  return (
    <aside
      data-ecw-preview-drawer
      className={cn(
        "flex h-full min-h-0 w-full flex-col border-l border-border/70 bg-background shadow-xl",
        "lg:w-[min(45vw,28rem)] lg:shrink-0",
      )}
      aria-label="Document preview drawer"
    >
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-2.5">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-foreground">{title}</p>
          {categoryLabel ? (
            <p className="truncate text-[9px] text-muted-foreground">{categoryLabel}</p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 shrink-0 p-0"
          onClick={onClose}
          aria-label="Close preview"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border/50 bg-muted/20 px-2 py-1">
        <ToolBtn
          label="Previous page"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          icon={<ChevronLeft className="h-3.5 w-3.5" />}
        />
        <span className="px-1 text-[10px] tabular-nums text-muted-foreground">Page {page}</span>
        <ToolBtn
          label="Next page"
          onClick={() => setPage((p) => p + 1)}
          icon={<ChevronRight className="h-3.5 w-3.5" />}
        />
        <span className="mx-1 h-4 w-px bg-border" />
        <ToolBtn
          label="Zoom out"
          onClick={() => setZoom((z) => Math.max(50, z - 10))}
          icon={<ZoomOut className="h-3.5 w-3.5" />}
        />
        <span className="px-1 text-[10px] tabular-nums text-muted-foreground">{zoom}%</span>
        <ToolBtn
          label="Zoom in"
          onClick={() => setZoom((z) => Math.min(200, z + 10))}
          icon={<ZoomIn className="h-3.5 w-3.5" />}
        />
        <ToolBtn
          label="Rotate"
          onClick={() => setRotation((r) => (r + 90) % 360)}
          icon={<RotateCw className="h-3.5 w-3.5" />}
        />
        {document?.previewUrl ? (
          <a
            href={document.previewUrl}
            download={document.name}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border/60 px-2 text-[10px] font-medium hover:bg-muted/50"
          >
            <Download className="h-3 w-3" />
            Download
          </a>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-slate-100/80 p-2 dark:bg-zinc-950/50">
        {!document ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <FileText className="h-7 w-7 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium">No preview available</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Upload this category in Document Center, then return to verify.
            </p>
          </div>
        ) : document.previewKind === "image" && document.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={document.previewUrl}
            alt={document.name}
            className="mx-auto max-w-full rounded border border-border/40 bg-white object-contain shadow-sm"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: "center top",
            }}
          />
        ) : document.previewKind === "office" ? (
          <div className="flex h-full flex-col items-center justify-center rounded border border-dashed border-border/70 bg-background/80 p-4 text-center">
            <FileSpreadsheet className="h-7 w-7 text-muted-foreground/60" />
            <p className="mt-2 text-sm font-medium">Office preview coming soon</p>
          </div>
        ) : (
          <iframe
            title={document.name}
            src={document.previewUrl}
            className="h-full min-h-[28rem] w-full rounded border border-border/40 bg-white shadow-sm"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: "top left",
              width: `${10000 / zoom}%`,
              height: `${10000 / zoom}%`,
            }}
          />
        )}
      </div>
    </aside>
  );
}

function ToolBtn({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
    >
      {icon}
    </button>
  );
}
