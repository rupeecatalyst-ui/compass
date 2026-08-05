"use client";

import { useEffect, useState } from "react";
import { ArrowRight, UserPlus } from "lucide-react";
import {
  isEcmContactActiveExistsClientError,
  isEcmContactSoftDeletedClientError,
  isEcmDuplicateContactError,
  progressiveRequiresMobile,
  registerProgressiveLoanContact,
  toEcmContactLifecycleLabel,
  type EcmDuplicateMatchField,
  type ProgressiveParticipantKind,
} from "@/lib/enterprise-contact-master";
import type {
  EcmContact,
  EcmContactIdentitySnapshot,
} from "@/types/enterprise-contact-master";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { ecmApiClient } from "@/lib/enterprise-persistence/ecm-api-client";
import { WEALTH_PARTNER_ONBOARD_COPY } from "@/constants/enterprise-identity-model";
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
import { RestoreContactDialog } from "@/components/catalyst-one/contacts/restore-contact-dialog";

export interface ProgressiveContactCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill from search query. */
  initialName?: string;
  participantKind: ProgressiveParticipantKind;
  onCreated: (contact: EcmContact) => void;
  onOpenExisting?: (contact: EcmContact) => void;
  /**
   * CO-ID-001 — identity creation intent.
   * wealth_partner_onboarding creates Contact in ECM then returns to WP onboarding.
   */
  identityIntent?: "loan_journey" | "wealth_partner_onboarding";
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
 * CO-CONTACT-IDENTITY-001 — search registry before create; restore soft-deleted identities.
 */
export function ProgressiveContactCreateModal({
  open,
  onOpenChange,
  initialName = "",
  participantKind,
  onCreated,
  onOpenExisting,
  identityIntent = "loan_journey",
}: ProgressiveContactCreateModalProps) {
  const { user } = useAuthContext();
  const [name, setName] = useState(initialName);
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [dupContact, setDupContact] = useState<EcmContact | null>(null);
  const [dupField, setDupField] = useState<EcmDuplicateMatchField | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreSnapshot, setRestoreSnapshot] =
    useState<EcmContactIdentitySnapshot | null>(null);
  const needMobile = progressiveRequiresMobile(participantKind);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setMobile("");
      setError(null);
      setSaving(false);
      setDupOpen(false);
      setDupContact(null);
      setRestoreOpen(false);
      setRestoreSnapshot(null);
    }
  }, [open, initialName]);

  const openExistingContact = (contact: EcmContact) => {
    onOpenChange(false);
    if (onOpenExisting) onOpenExisting(contact);
    else onCreated(contact);
  };

  const handleSave = async () => {
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
      const forWealthPartner = identityIntent === "wealth_partner_onboarding";
      const roles = forWealthPartner
        ? (["partner"] as const)
        : (["customer"] as const);

      // CO-CONTACT-IDENTITY-001 — resolve identity before INSERT.
      if (isEnterprisePersistencePrisma() && digits.length >= 10) {
        const identity = await ecmApiClient.lookupContactIdentity(digits);
        if (identity.status === "active" && identity.contact) {
          setDupContact(identity.contact);
          setDupField("mobile");
          setDupOpen(true);
          setSaving(false);
          return;
        }
        if (identity.status === "soft_deleted" && identity.snapshot) {
          setRestoreSnapshot(identity.snapshot);
          setRestoreOpen(true);
          setSaving(false);
          return;
        }
      }

      let contact: EcmContact;
      if (isEnterprisePersistencePrisma()) {
        contact = await ecmApiClient.createContact({
          name: trimmed,
          mobilePrimary: needMobile || digits.length >= 10 ? digits : `pending-${Date.now()}`,
          roles: [...roles],
          status: "provisional",
          createdBy: user?.id || "ui",
          ownerName:
            [user?.firstName, user?.lastName].filter(Boolean).join(" ") || undefined,
        });
      } else {
        contact = registerProgressiveLoanContact({
          name: trimmed,
          mobilePrimary: needMobile ? digits : digits || undefined,
          kind: participantKind,
          createdBy: user?.id || "ui",
          ownerName:
            [user?.firstName, user?.lastName].filter(Boolean).join(" ") || undefined,
          roles: [...roles],
        });
      }
      onCreated(contact);
      onOpenChange(false);
    } catch (e) {
      if (isEcmContactSoftDeletedClientError(e)) {
        setRestoreSnapshot(e.snapshot);
        setRestoreOpen(true);
        setError(null);
      } else if (isEcmContactActiveExistsClientError(e)) {
        try {
          const existing = await ecmApiClient.getContact(e.snapshot.contactId);
          setDupContact(existing);
          setDupField("mobile");
          setDupOpen(true);
          setError(null);
        } catch {
          setError("An active Contact already exists for this mobile number.");
        }
      } else if (isEcmDuplicateContactError(e)) {
        setDupContact(e.match);
        setDupField(e.matchField);
        setDupOpen(true);
        setError(null);
      } else {
        const msg = e instanceof Error ? e.message : "Could not create contact.";
        setError(
          /P2002|prisma|SQL/i.test(msg)
            ? "This mobile number is already linked to an Enterprise Contact."
            : msg,
        );
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
              {identityIntent === "wealth_partner_onboarding"
                ? WEALTH_PARTNER_ONBOARD_COPY.createContactCta
                : "Create New Contact"}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              {identityIntent === "wealth_partner_onboarding" ? (
                <>
                  {WEALTH_PARTNER_ONBOARD_COPY.createContactHint} Identity is created in the
                  Enterprise Contact Registry only — then onboarding continues automatically.
                </>
              ) : (
                <>
                  Progressive Contact Creation for {kindLabel(participantKind)}. The Loan Journey
                  stays open — create the minimum viable Contact and continue. Status will be{" "}
                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                    {toEcmContactLifecycleLabel("provisional").toUpperCase()}
                  </span>{" "}
                  until Chanakya helps complete supporting details.
                </>
              )}
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
                  Optional for co-applicants, guarantors, and other participants. Missing fields
                  never stop the Loan Journey.
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
              onClick={() => void handleSave()}
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
          openExistingContact(existing);
        }}
      />

      <RestoreContactDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        snapshot={restoreSnapshot}
        onRestored={(contactId) => {
          void (async () => {
            try {
              const restored = await ecmApiClient.getContact(contactId);
              openExistingContact(restored);
            } catch {
              onOpenChange(false);
            }
          })();
        }}
      />
    </>
  );
}
