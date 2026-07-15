"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  onSaveAndClose?: () => void | boolean | Promise<void | boolean>;
  saving?: boolean;
}

/**
 * Prompt 019 / UX-01B — Enterprise unsaved-changes confirmation.
 * Never silently discard entered information.
 */
export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onDiscard,
  onSaveAndClose,
  saving,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>You have unsaved changes</DialogTitle>
          <DialogDescription>
            Closing now will discard information entered in this workspace. Choose how you want to
            proceed.
          </DialogDescription>
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
              {saving ? "Saving…" : "Save & Exit"}
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
            Discard Changes
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Continue Editing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
