"use client";

import { X } from "lucide-react";
import { UnsavedChangesDialog } from "@/components/catalyst-one/shared/unsaved-changes-dialog";
import { useWorkspaceClose } from "@/hooks/use-workspace-close";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WorkspaceHeaderProps {
  title: string;
  infoStrip?: React.ReactNode;
  onClose: () => void;
  hasUnsavedChanges?: boolean;
  onSaveAndClose?: () => void | boolean | Promise<void | boolean>;
  enableEscapeKey?: boolean;
  /** When provided, skips the internal close hook (parent manages Dialog Escape). */
  closeApi?: ReturnType<typeof useWorkspaceClose>;
  className?: string;
}

/** UX-01B — Standard enterprise workspace header: title left, Close right. */
export function WorkspaceHeader({
  title,
  infoStrip,
  onClose,
  hasUnsavedChanges,
  onSaveAndClose,
  enableEscapeKey = true,
  closeApi,
  className,
}: WorkspaceHeaderProps) {
  const internalClose = useWorkspaceClose({
    onClose,
    hasUnsavedChanges,
    onSaveAndClose,
    enableEscapeKey: closeApi ? false : enableEscapeKey,
  });
  const api = closeApi ?? internalClose;

  return (
    <>
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-4 border-b border-border/60",
          "bg-background/95 px-5 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6",
          className,
        )}
      >
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-tight text-foreground">{title}</h1>
          {infoStrip ? <div className="mt-0.5 min-w-0">{infoStrip}</div> : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={api.requestClose}
          aria-label="Close workspace"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Close
        </Button>
      </header>
      <UnsavedChangesDialog
        open={api.confirmOpen}
        onOpenChange={api.setConfirmOpen}
        onDiscard={api.handleDiscard}
        onSaveAndClose={onSaveAndClose ? api.handleSaveAndClose : undefined}
        saving={api.saving}
      />
    </>
  );
}
