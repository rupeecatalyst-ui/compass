"use client";

/**
 * CO-BUG-009 — Enterprise Move to Deal confirmation (never window.confirm).
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function MoveToDealConfirmDialog({
  open,
  onOpenChange,
  lenderNames,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lenderNames: string[];
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const lenderLine =
    lenderNames.length === 0
      ? "the selected lender(s)"
      : lenderNames.length === 1
        ? lenderNames[0]!
        : `${lenderNames.length} lenders (${lenderNames.join(", ")})`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md sm:rounded-xl" allowOutsideClose={!busy}>
        <DialogHeader>
          <DialogTitle className="text-base">Move to Deal?</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create Enterprise Deal{lenderNames.length === 1 ? "" : "s"} for{" "}
            <span className="font-medium text-foreground">{lenderLine}</span> and open Loan
            Workspace (Lender Pipeline).
            <br />
            <br />
            Lender selection in LIFE is unchanged until Deals are created.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-teal-700 text-white hover:bg-teal-600"
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            {busy ? "Creating Deals…" : "Create Deal & Open Workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
