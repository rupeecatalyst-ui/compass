"use client";

import { useEffect, useState } from "react";
import { ArrowRight, UserPlus } from "lucide-react";
import {
  isEcmDuplicateContactError,
  progressiveRequiresMobile,
  registerProgressiveLoanContact,
  toEcmContactLifecycleLabel,
  type EcmDuplicateMatchField,
  type ProgressiveParticipantKind,
} from "@/lib/enterprise-contact-master";
import type { EcmContact } from "@/types/enterprise-contact-master";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthContext } from "@/components/providers/auth-provider";
import { PotentialDuplicateContactDialog } from "@/components/catalyst-one/contacts/potential-duplicate-contact-dialog";

export interface ProgressiveContactCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill from search query. */
  initialName?: string;
  participantKind: ProgressiveParticipantKind;
  onCreated: (contact: EcmContact) => void;
  onOpenExisting?: (contact: EcmContact) => void;
}

function kindLabel(kind: ProgressiveParticipantKind): string {
  switch (kind) {
    case "primary_applicant":
      return "Primary Applicant";
    case "co_applicant":
      return "Co-Applicant";
    case "guarantor":
      return "Guarantor";
    default:
      return "Participant";
  }
}

/**
 * Progressive Contact Creation — modal overlay on the Loan Journey.
 * Creates a PROVISIONAL contact with minimum mandatory fields, then auto-links.
 * Never navigates away from the transaction.
 */
export function ProgressiveContactCreateModal({
  open,
  onOpenChange,
  initialName = "",
  participantKind,
  onCreated,
  onOpenExisting,
}: ProgressiveContactCreateModalProps) {
  const { user } = useAuthContext();
  const [name, setName] = useState(initialName);
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [dupContact, setDupContact] = useState<EcmContact | null>(null);
  const [dupField, setDupField] = useState<EcmDuplicateMatchField | null>(null);
  const needMobile = progressiveRequiresMobile(participantKind);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setMobile("");
      setError(null);
      setSaving(false);
      setDupOpen(false);
      setDupContact(null);
    }
  }, [open, initialName]);

  const handleSave = () => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Full Name is required.");
      return;
    }
    const digits = mobile.replace(/\D/g, "");
    if (needMobile && digits.length < 10) {
      setError("Mobile Number is required for the Primary Applicant (min 10 digits).");
      return;
    }

    setSaving(true);
    try {
      const contact = registerProgressiveLoanContact({
        name: trimmed,
        mobilePrimary: needMobile ? digits : digits || undefined,
        kind: participantKind,
        createdBy: user?.id || "ui",
        ownerName: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || undefined,
      });
      onCreated(contact);
      onOpenChange(false);
    } catch (e) {
      if (isEcmDuplicateContactError(e)) {
        setDupContact(e.match);
        setDupField(e.matchField);
        setDupOpen(true);
        setError(null);
      } else {
        setError(e instanceof Error ? e.message : "Could not create contact.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <UserPlus className="h-4 w-4" />
            Create New Contact
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Progressive Contact Creation for {kindLabel(participantKind)}. The Loan Journey stays open —
            create the minimum viable Contact and continue. Status will be{" "}
            <span className="font-semibold text-amber-700 dark:text-amber-300">
              {toEcmContactLifecycleLabel("provisional").toUpperCase()}
            </span>{" "}
            until Chanakya helps complete supporting details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-[11px]">Full Name *</Label>
            <Input
              className="h-9 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full legal name"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px]">
              Mobile Number{needMobile ? " *" : " (optional)"}
            </Label>
            <Input
              className="h-9 text-sm"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder={needMobile ? "10-digit mobile" : "Add later if needed"}
              inputMode="tel"
            />
            {!needMobile ? (
              <p className="text-[10px] text-muted-foreground">
                Optional for co-applicants, guarantors, and other participants. Missing fields never stop
                the Loan Journey.
              </p>
            ) : null}
          </div>
          {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save & Continue"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <PotentialDuplicateContactDialog
      open={dupOpen}
      onOpenChange={setDupOpen}
      contact={dupContact}
      matchField={dupField}
      onOpenExisting={(existing) => {
        setDupOpen(false);
        onOpenChange(false);
        if (onOpenExisting) onOpenExisting(existing);
        else onCreated(existing);
      }}
    />
    </>
  );
}
