"use client";

import { X } from "lucide-react";
import { UnsavedChangesDialog } from "@/components/catalyst-one/shared/unsaved-changes-dialog";
import { useWorkspaceClose } from "@/hooks/use-workspace-close";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WorkspaceHeaderProps {
  title: string;
  infoStrip?: React.ReactNode;
  /** Prompt 011 — context-preserving nav (e.g. Back To Opportunity Workspace). */
  leadingAction?: React.ReactNode;
  /** UX-04E — Execution console layout with identity + live feed. */
  executionLayout?: {
    borrowerName: string;
    fileNumber: string;
    requiredAmount: string;
    rm: string;
    priorityBadge: React.ReactNode;
    chanakyaFeed: React.ReactNode;
    saveActions?: React.ReactNode;
  };
  onClose: () => void;
  hasUnsavedChanges?: boolean;
  onSaveAndClose?: () => void | boolean | Promise<void | boolean>;
  enableEscapeKey?: boolean;
  closeApi?: ReturnType<typeof useWorkspaceClose>;
  className?: string;
}

export function WorkspaceHeader({
  title,
  infoStrip,
  leadingAction,
  executionLayout,
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
          "flex shrink-0 flex-col gap-1.5 border-b border-border/60",
          "bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-5",
          className,
        )}
      >
        {executionLayout ? (
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center">
              <div className="shrink-0 min-w-[200px]">
                <p className="text-lg font-bold leading-tight tracking-tight text-foreground sm:text-xl">
                  {executionLayout.borrowerName}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                  <span className="font-medium text-foreground/80">{executionLayout.fileNumber}</span>
                  <span>·</span>
                  <span className="tabular-nums">{executionLayout.requiredAmount}</span>
                  <span>·</span>
                  <span>RM {executionLayout.rm}</span>
                  <span>·</span>
                  {executionLayout.priorityBadge}
                </div>
              </div>
              {executionLayout.chanakyaFeed}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {leadingAction}
              {executionLayout.saveActions}
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
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {leadingAction}
                <h1 className="text-sm font-semibold tracking-tight text-foreground">{title}</h1>
              </div>
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
          </div>
        )}
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
