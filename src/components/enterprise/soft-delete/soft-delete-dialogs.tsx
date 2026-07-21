"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SOFT_DELETE_PURGE_CONFIRMATION_WORD } from "@/constants/enterprise-soft-delete";

interface SoftDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordLabel: string;
  busy?: boolean;
  onConfirm: (reason?: string) => void | Promise<void>;
}

/** Soft-delete confirmation — record moves to Enterprise Recovery Center. */
export function SoftDeleteConfirmDialog({
  open,
  onOpenChange,
  recordLabel,
  busy,
  onConfirm,
}: SoftDeleteConfirmDialogProps) {
  const [reason, setReason] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) {
          if (!next) setReason("");
          onOpenChange(next);
        }
      }}
    >
      <DialogContent className="max-w-md border-zinc-800 bg-zinc-950 text-zinc-50 sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base">Delete this record?</DialogTitle>
          <DialogDescription className="text-sm text-zinc-400">
            <span className="font-medium text-zinc-200">{recordLabel}</span> will be removed from
            all operational workspaces.
            <br />
            <br />
            It can later be restored from the Enterprise Recovery Center.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="deletion-reason" className="text-xs text-zinc-400">
            Deletion reason (optional)
          </Label>
          <Textarea
            id="deletion-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this record being deleted?"
            className="min-h-[72px] border-zinc-700 bg-zinc-900 text-sm"
            disabled={busy}
          />
        </div>
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
            variant="destructive"
            className="gap-1.5"
            disabled={busy}
            onClick={() => void onConfirm(reason.trim() || undefined)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PermanentDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordLabel: string;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
}

/** Permanent delete — SUPER_ADMIN only; requires typing DELETE. */
export function PermanentDeleteConfirmDialog({
  open,
  onOpenChange,
  recordLabel,
  busy,
  onConfirm,
}: PermanentDeleteConfirmDialogProps) {
  const [typed, setTyped] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) {
          if (!next) setTyped("");
          onOpenChange(next);
        }
      }}
    >
      <DialogContent className="max-w-md border-red-900/50 bg-zinc-950 text-zinc-50 sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base text-red-300">WARNING</DialogTitle>
          <DialogDescription className="text-sm text-zinc-400">
            This action permanently removes{" "}
            <span className="font-medium text-zinc-200">{recordLabel}</span> from the database.
            <br />
            <br />
            This action cannot be undone.
            <br />
            <br />
            Type <span className="font-mono font-semibold text-red-300">{SOFT_DELETE_PURGE_CONFIRMATION_WORD}</span> to
            continue.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="purge-confirm" className="text-xs text-zinc-400">
            Confirmation
          </Label>
          <Input
            id="purge-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={SOFT_DELETE_PURGE_CONFIRMATION_WORD}
            className="border-zinc-700 bg-zinc-900 font-mono"
            disabled={busy}
            autoComplete="off"
          />
        </div>
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
            variant="destructive"
            disabled={busy || typed !== SOFT_DELETE_PURGE_CONFIRMATION_WORD}
            onClick={() => void onConfirm()}
          >
            Permanently Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
