"use client";

/**
 * CO-CONTACT-IDENTITY-001 — Restore Contact dialog (business-friendly, no Prisma).
 */

import { useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { softDeleteApi } from "@/lib/enterprise-soft-delete";
import type { EcmContactIdentitySnapshot } from "@/types/enterprise-contact-master";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatWhen(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function RestoreContactDialog({
  open,
  onOpenChange,
  snapshot,
  onRestored,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: EcmContactIdentitySnapshot | null;
  /** Called with restored contact id after successful restore. */
  onRestored: (contactId: string) => void;
}) {
  const [restoring, setRestoring] = useState(false);

  if (!snapshot) return null;

  const handleRestore = async () => {
    if (!snapshot.contactId) {
      toast.error("Contact identity could not be resolved. Open Enterprise Recovery Center.");
      return;
    }
    setRestoring(true);
    try {
      await softDeleteApi.restore({
        module: "contacts",
        entityId: snapshot.contactId,
      });
      toast.success("Contact restored. Enterprise history preserved.");
      onOpenChange(false);
      onRestored(snapshot.contactId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not restore contact.";
      toast.error(
        /P2002|prisma|SQL/i.test(msg)
          ? "Restore could not complete. Please try again or use Enterprise Recovery Center."
          : msg,
      );
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="size-4 text-amber-600" />
            Contact Already Exists
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            A previously deleted Contact was found.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-3 text-sm">
          <div className="grid grid-cols-[110px_1fr] gap-1.5">
            <span className="text-muted-foreground">Contact Name</span>
            <span className="font-medium text-foreground">{snapshot.name}</span>
            <span className="text-muted-foreground">Mobile Number</span>
            <span className="font-medium tabular-nums text-foreground">
              {snapshot.mobilePrimary}
            </span>
            <span className="text-muted-foreground">Deleted On</span>
            <span className="text-foreground">{formatWhen(snapshot.deletedAt)}</span>
            <span className="text-muted-foreground">Deleted By</span>
            <span className="text-foreground">{snapshot.deletedBy || "—"}</span>
          </div>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs leading-relaxed text-foreground">
          <p className="font-medium text-amber-900 dark:text-amber-100">
            This Contact already has Enterprise history.
          </p>
          <p className="mt-1.5 text-muted-foreground">Restoring it will preserve:</p>
          <ul className="mt-1 list-inside list-disc text-muted-foreground">
            <li>Opportunities</li>
            <li>Activities</li>
            <li>Documents</li>
            <li>Timeline</li>
            <li>Relationships</li>
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={restoring}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-teal-700 text-white hover:bg-teal-600"
            disabled={restoring}
            onClick={() => void handleRestore()}
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            {restoring ? "Restoring…" : "Restore Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
