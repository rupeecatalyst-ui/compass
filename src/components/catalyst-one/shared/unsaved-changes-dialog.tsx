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

/** UX-01B — Standard unsaved-changes confirmation before leaving a workspace. */
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
          <DialogTitle>Unsaved Changes</DialogTitle>
          <DialogDescription>You have unsaved changes.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onDiscard} disabled={saving}>
            Discard Changes
          </Button>
          {onSaveAndClose && (
            <Button type="button" size="sm" onClick={() => void onSaveAndClose()} disabled={saving}>
              {saving ? "Saving..." : "Save & Close"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
