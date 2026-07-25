"use client";

import type { SyntheticEvent } from "react";
import { useState } from "react";
import { MoreVertical, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type RegistryEntityKind = "Opportunity" | "Deal";

interface RegistryRowActionsMenuProps {
  entityKind: RegistryEntityKind;
  /** Short ref shown in confirm copy (e.g. OPP-… / DEAL-…). */
  recordLabel: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
  deleteDisabled?: boolean;
  deleteDisabledReason?: string;
}

/**
 * BAT #15 — Row-level ⋮ Actions for Opportunity / Deal registry lists.
 * Layout is stable for future menu items.
 */
export function RegistryRowActionsMenu({
  entityKind,
  recordLabel,
  onOpen,
  onEdit,
  onDelete,
  deleteDisabled = false,
  deleteDisabledReason,
}: RegistryRowActionsMenuProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const stopRowClick = (e: SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <div
        className="flex justify-end"
        onClick={stopRowClick}
        onMouseDown={stopRowClick}
        onKeyDown={stopRowClick}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              aria-label={`${entityKind} actions`}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[9rem] text-xs">
            <DropdownMenuItem
              className="gap-2 text-xs"
              onClick={() => {
                onOpen();
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-xs"
              onClick={() => {
                onEdit();
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-xs text-destructive focus:text-destructive"
              disabled={deleteDisabled}
              title={deleteDisabled ? deleteDisabledReason : undefined}
              onClick={() => {
                if (!deleteDisabled) setConfirmOpen(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!busy) setConfirmOpen(next);
        }}
      >
        <DialogContent
          className="max-w-md sm:rounded-xl"
          onClick={stopRowClick}
          onMouseDown={stopRowClick}
        >
          <DialogHeader>
            <DialogTitle className="text-base">Delete {entityKind}?</DialogTitle>
            <DialogDescription className="space-y-2 text-sm">
              <span className="block">
                Are you sure you want to delete this {entityKind}
                {recordLabel ? (
                  <>
                    {" "}
                    <span className="font-medium text-foreground">{recordLabel}</span>
                  </>
                ) : null}
                ?
              </span>
              <span className="block text-muted-foreground">
                This action cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              className="gap-1.5"
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    await onDelete();
                    setConfirmOpen(false);
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
