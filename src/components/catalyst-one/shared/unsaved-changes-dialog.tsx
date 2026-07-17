"use client";

import { WORKSPACE_UNSAVED } from "@/constants/enterprise-workspace-ux";
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
 * Workspace Exit Standard — never silently discard entered information.
 * Actions: Save & Close · Discard · Cancel
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
          <DialogTitle>{WORKSPACE_UNSAVED.title}</DialogTitle>
          <DialogDescription>{WORKSPACE_UNSAVED.description}</DialogDescription>
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
              {saving ? "Saving…" : WORKSPACE_UNSAVED.saveAndClose}
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
            {WORKSPACE_UNSAVED.discard}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {WORKSPACE_UNSAVED.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
