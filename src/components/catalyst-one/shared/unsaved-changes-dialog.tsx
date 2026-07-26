"use client";

import {
  WORKSPACE_UNSAVED,
  WORKSPACE_UNSAVED_MY_DEALS,
} from "@/constants/enterprise-workspace-ux";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type UnsavedChangesDialogVariant = "close" | "my-deals";

export interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  onSaveAndClose?: () => void | boolean | Promise<void | boolean>;
  saving?: boolean;
  /** close = Save & Close; my-deals = Save & Go (Chanakya confirm). */
  variant?: UnsavedChangesDialogVariant;
}

/**
 * Workspace Exit Standard — never silently discard entered information.
 * Close: Save & Close · Discard Changes · Cancel
 * My Deals: Save & Go · Discard Changes · Cancel
 */
export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onDiscard,
  onSaveAndClose,
  saving,
  variant = "close",
}: UnsavedChangesDialogProps) {
  const copy =
    variant === "my-deals"
      ? {
          title: WORKSPACE_UNSAVED_MY_DEALS.title,
          description: WORKSPACE_UNSAVED_MY_DEALS.description,
          primary: WORKSPACE_UNSAVED_MY_DEALS.saveAndGo,
          discard: WORKSPACE_UNSAVED_MY_DEALS.discard,
          cancel: WORKSPACE_UNSAVED_MY_DEALS.cancel,
        }
      : {
          title: WORKSPACE_UNSAVED.title,
          description: WORKSPACE_UNSAVED.description,
          primary: WORKSPACE_UNSAVED.saveAndClose,
          discard: WORKSPACE_UNSAVED.discard,
          cancel: WORKSPACE_UNSAVED.cancel,
        };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          {onSaveAndClose && (
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => void onSaveAndClose()}
              disabled={saving}
            >
              {saving ? "Saving…" : copy.primary}
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={onDiscard}
            disabled={saving}
          >
            {copy.discard}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {copy.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
