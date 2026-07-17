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
import type { EcmContact } from "@/types/enterprise-contact-master";
import type { EcmDuplicateMatchField } from "@/lib/enterprise-contact-master/duplicate-check";

/**
 * Enterprise duplicate prevention dialog — Open Existing or Cancel only.
 * Never creates a second contact.
 */
export function PotentialDuplicateContactDialog({
  open,
  onOpenChange,
  contact,
  matchField,
  onOpenExisting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: EcmContact | null;
  matchField: EcmDuplicateMatchField | null;
  onOpenExisting: (contact: EcmContact) => void;
}) {
  if (!contact) return null;

  const message =
    matchField === "email"
      ? "A contact with this email address already exists."
      : "A contact with this mobile number already exists.";

  const email = contact.personalEmail || contact.officialEmail || "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" allowOutsideClose={false}>
        <DialogHeader>
          <DialogTitle className="text-base">Potential Duplicate Contact</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">{message}</DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
          <dl className="space-y-2.5">
            <div className="flex justify-between gap-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Contact Name
              </dt>
              <dd className="text-right font-medium">{contact.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Mobile Number
              </dt>
              <dd className="text-right tabular-nums">{contact.mobilePrimary}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Email Address
              </dt>
              <dd className="max-w-[60%] truncate text-right">{email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Contact ID
              </dt>
              <dd className="font-mono text-[11px] text-muted-foreground">{contact.id}</dd>
            </div>
          </dl>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-teal-700 hover:bg-teal-800"
            onClick={() => {
              onOpenChange(false);
              onOpenExisting(contact);
            }}
          >
            Open Existing Contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
