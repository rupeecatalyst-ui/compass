"use client";

import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { DOCUMENT_REGISTRY_ACCEPT } from "@/constants/document-registry";
import { cn } from "@/lib/utils";

export function DocumentUploadZone({
  onFiles,
  disabled,
  compact,
  label = "Drag & drop files here, or click to browse",
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length || disabled) return;
      onFiles(Array.from(list));
    },
    [disabled, onFiles],
  );

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed transition-colors",
        compact ? "px-3 py-4" : "px-4 py-8",
        dragOver
          ? "border-teal-500/60 bg-teal-500/10"
          : "border-border/70 bg-muted/10 hover:border-teal-500/35 hover:bg-muted/20",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={DOCUMENT_REGISTRY_ACCEPT}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <Upload className={cn("text-muted-foreground", compact ? "h-4 w-4" : "h-5 w-5")} />
      <p className={cn("mt-2 text-center font-medium text-foreground", compact ? "text-[11px]" : "text-xs")}>
        {label}
      </p>
      <p className="mt-1 text-center text-[10px] text-muted-foreground">
        PDF · Images · Office · CSV · ZIP · up to 25 MB
      </p>
    </div>
  );
}

export function DocumentUploadProgressBar({
  percent,
  message,
}: {
  percent: number;
  message?: string;
}) {
  return (
    <div className="space-y-1.5 rounded-lg border border-border/60 bg-card px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-medium text-foreground">{message ?? "Uploading…"}</span>
        <span className="tabular-nums text-muted-foreground">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-teal-600 transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}
