"use client";

import { RefreshCw, Save, X } from "lucide-react";
import {
  WORKSPACE_EXIT_LABEL,
  WORKSPACE_REFRESH_LABEL,
  WORKSPACE_SAVE_AND_EXIT_LABEL,
  WORKSPACE_SAVE_LABEL,
} from "@/constants/enterprise-workspace-ux";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WorkspaceActionMode = "editable" | "readonly";

export interface WorkspacePrimaryActionsProps {
  mode: WorkspaceActionMode;
  onClose: () => void;
  onSave?: () => void | Promise<void>;
  onSaveAndExit?: () => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
  saving?: boolean;
  refreshing?: boolean;
  /** Hide Save when persistence is handled elsewhere (rare). */
  hideSave?: boolean;
  /** Compact sizing for dense journey chrome. */
  density?: "default" | "compact";
  className?: string;
}

/**
 * Platform-wide workspace action strip — always top-right with Close.
 * Editable: Save · Save & Exit · Close
 * Read-only: Refresh (optional) · Close
 */
export function WorkspacePrimaryActions({
  mode,
  onClose,
  onSave,
  onSaveAndExit,
  onRefresh,
  saving = false,
  refreshing = false,
  hideSave = false,
  density = "default",
  className,
}: WorkspacePrimaryActionsProps) {
  const compact = density === "compact";
  const btn = cn(
    compact ? "h-7 gap-1 px-2 text-[11px]" : "h-8 gap-1.5 px-2.5 text-xs",
  );

  return (
    <div className={cn("flex shrink-0 flex-wrap items-center gap-1.5", className)}>
      {mode === "editable" && !hideSave && onSave ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={btn}
          disabled={saving}
          onClick={() => void onSave()}
        >
          <Save className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
          {saving ? "Saving…" : WORKSPACE_SAVE_LABEL}
        </Button>
      ) : null}

      {mode === "editable" && onSaveAndExit ? (
        <Button
          type="button"
          size="sm"
          className={cn(btn, "bg-teal-700 text-white hover:bg-teal-800")}
          disabled={saving}
          onClick={() => void onSaveAndExit()}
        >
          <Save className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
          {saving ? "Saving…" : WORKSPACE_SAVE_AND_EXIT_LABEL}
        </Button>
      ) : null}

      {mode === "readonly" && onRefresh ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={btn}
          disabled={refreshing}
          onClick={() => void onRefresh()}
        >
          <RefreshCw
            className={cn(
              compact ? "h-3 w-3" : "h-3.5 w-3.5",
              refreshing && "animate-spin",
            )}
            aria-hidden
          />
          {WORKSPACE_REFRESH_LABEL}
        </Button>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          btn,
          "text-muted-foreground hover:text-foreground",
        )}
        onClick={onClose}
        aria-label="Close workspace"
      >
        <X className={compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5"} aria-hidden />
        {WORKSPACE_EXIT_LABEL}
      </Button>
    </div>
  );
}
