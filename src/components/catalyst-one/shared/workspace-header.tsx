"use client";

import { UnsavedChangesDialog } from "@/components/catalyst-one/shared/unsaved-changes-dialog";
import {
  WorkspacePrimaryActions,
} from "@/components/catalyst-one/shared/workspace-primary-actions";
import { useWorkspaceClose } from "@/hooks/use-workspace-close";
import { cn } from "@/lib/utils";

export interface WorkspaceHeaderProps {
  title: string;
  infoStrip?: React.ReactNode;
  /** Prompt 011 — context-preserving nav (e.g. Back To Opportunity Workspace). */
  leadingAction?: React.ReactNode;
  /** Enterprise Action Center (and other header actions) — before Save/Close. */
  headerActions?: React.ReactNode;
  /** UX-04E — Execution console layout with identity + live feed. */
  executionLayout?: {
    borrowerName: string;
    fileNumber: string;
    requiredAmount: string;
    rm: string;
    priorityBadge: React.ReactNode;
    chanakyaFeed: React.ReactNode;
  };
  onClose: () => void;
  hasUnsavedChanges?: boolean;
  onSave?: () => void | Promise<void>;
  onSaveAndClose?: () => void | boolean | Promise<void | boolean>;
  onRefresh?: () => void | Promise<void>;
  /** editable (default when onSave provided) | readonly */
  actionMode?: "editable" | "readonly";
  enableEscapeKey?: boolean;
  closeApi?: ReturnType<typeof useWorkspaceClose>;
  /** Case C — toast when closing with no unsaved changes. */
  acknowledgeCleanClose?: boolean;
  saving?: boolean;
  className?: string;
}

export function WorkspaceHeader({
  title,
  infoStrip,
  leadingAction,
  headerActions,
  executionLayout,
  onClose,
  hasUnsavedChanges,
  onSave,
  onSaveAndClose,
  onRefresh,
  actionMode,
  enableEscapeKey = true,
  closeApi,
  acknowledgeCleanClose = false,
  saving = false,
  className,
}: WorkspaceHeaderProps) {
  const internalClose = useWorkspaceClose({
    onClose,
    hasUnsavedChanges,
    onSaveAndClose,
    enableEscapeKey: closeApi ? false : enableEscapeKey,
    acknowledgeCleanClose,
  });
  const api = closeApi ?? internalClose;
  const mode =
    actionMode ??
    (onSave || onSaveAndClose ? "editable" : onRefresh ? "readonly" : "readonly");

  const handleSaveAndExit = async () => {
    if (onSaveAndClose) {
      await api.handleSaveAndClose();
      return;
    }
    if (onSave) await onSave();
    onClose();
  };

  const actions = (
    <div className="flex shrink-0 items-center gap-1.5">
      {leadingAction && executionLayout ? leadingAction : null}
      {headerActions}
      <WorkspacePrimaryActions
        mode={mode}
        onClose={api.requestClose}
        onSave={mode === "editable" ? onSave : undefined}
        onSaveAndExit={
          mode === "editable" && (onSaveAndClose || onSave)
            ? handleSaveAndExit
            : undefined
        }
        onRefresh={mode === "readonly" ? onRefresh : undefined}
        saving={saving || api.saving}
        density="compact"
      />
    </div>
  );

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
                <p className="text-base font-bold leading-tight tracking-tight text-foreground sm:text-lg">
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
            {actions}
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
            {actions}
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
