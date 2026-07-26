"use client";

/**
 * Progressive Company Creation — modal overlay on Loan Information / Loan Journey.
 * Creates a provisional company with company name (minimum), then auto-links.
 * Never navigates away from the transaction.
 */

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { persistRegisterEcmCompany } from "@/lib/enterprise-persistence/ecm-persist";
import type { EcmCompany } from "@/types/enterprise-company-master";
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

export interface ProgressiveCompanyCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onCreated: (company: EcmCompany) => void;
}

export function ProgressiveCompanyCreateModal({
  open,
  onOpenChange,
  initialName = "",
  onCreated,
}: ProgressiveCompanyCreateModalProps) {
  const { user } = useAuthContext();
  const [companyName, setCompanyName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCompanyName(initialName);
      setError(null);
      setSaving(false);
    }
  }, [open, initialName]);

  async function handleSave() {
    const name = companyName.trim();
    if (name.length < 2) {
      setError("Company name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const actor =
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
        user?.email ||
        user?.id ||
        "user";
      const company = await persistRegisterEcmCompany({
        companyName: name,
        createdBy: actor,
        ownerName: actor,
        ownerId: user?.id,
      });
      onCreated(company);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create company.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-teal-700" aria-hidden />
            Create New Company
          </DialogTitle>
          <DialogDescription className="text-xs">
            Progressive company creation for the Loan Journey. Capture the company name now —
            complete enrichment later. The Loan Information workspace stays open.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-5 py-4">
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Company Name *</Label>
            <Input
              className="mt-1 h-9"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Legal / trading name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSave();
                }
              }}
            />
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <p className="text-[11px] text-muted-foreground">
            Minimum required now: Company Name. PAN, GST, address, and other fields can follow —
            never block the loan journey.
          </p>
        </div>
        <DialogFooter className="border-t border-border bg-muted/20 px-5 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
