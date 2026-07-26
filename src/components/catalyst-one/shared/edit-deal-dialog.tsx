"use client";

/**
 * CO-ARCH-003 Phase 2B Sprint 2 — Controlled Edit Deal workflow.
 * Editable: Lender, Program, Loan Amount, ROI, Tenure, Invoice Party, Internal Remarks.
 * Lender/program changes are auditable via Deal timeline (server).
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { INRCurrencyInput } from "@/components/catalyst-one/shared/inr-currency-input";
import { EnterpriseLenderSearch } from "@/components/catalyst-one/shared/enterprise-lender-search";
import { InvoicePartyField } from "@/components/catalyst-one/shared/commercial-payee-field";
import { validateDealEditFields } from "@/lib/deal-workspace/deal-edit-validation";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { isDealRegistryApiEnabled } from "@/constants/enterprise-deal-registry/flags";
import type { LoanFile } from "@/types/catalyst-one";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

export type EditDealSaveResult = {
  patch: Partial<LoanFile>;
  auditHint?: string;
};

export function EditDealDialog({
  open,
  onOpenChange,
  draft,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: LoanFile;
  onSaved: (result: EditDealSaveResult) => void | Promise<void>;
}) {
  const primaryLender = (draft.lenders ?? []).find((l) => l.status === "active");
  const [lenderId, setLenderId] = useState(
    primaryLender?.lenderRegistryId || draft.enterpriseLenderId || "",
  );
  const [lenderLabel, setLenderLabel] = useState(
    primaryLender?.lenderDisplayName || primaryLender?.lender || draft.lender || "",
  );
  const [programId, setProgramId] = useState(
    primaryLender?.lenderProgramId || draft.lenderProgramId || "",
  );
  const [programLabel, setProgramLabel] = useState(
    primaryLender?.lenderProgramLabel || "",
  );
  const [amount, setAmount] = useState<number>(
    draft.requiredAmount || draft.loanAmount || 0,
  );
  const [roi, setRoi] = useState<string>(
    draft.interestRate != null ? String(draft.interestRate) : "",
  );
  const [tenure, setTenure] = useState<string>(
    draft.tenure != null ? String(draft.tenure) : "",
  );
  const [invoicePartyId, setInvoicePartyId] = useState(
    draft.invoicePartyId || draft.commissionAccountingPayeeId || "",
  );
  const [invoicePartyLabel, setInvoicePartyLabel] = useState(
    draft.invoicePartyLabel || draft.commissionAccountingPayeeLabel || "",
  );
  const [remarks, setRemarks] = useState(draft.internalNotes || "");
  const [changeReason, setChangeReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setLenderId(primaryLender?.lenderRegistryId || draft.enterpriseLenderId || "");
    setLenderLabel(
      primaryLender?.lenderDisplayName || primaryLender?.lender || draft.lender || "",
    );
    setProgramId(primaryLender?.lenderProgramId || draft.lenderProgramId || "");
    setProgramLabel(primaryLender?.lenderProgramLabel || "");
    setAmount(draft.requiredAmount || draft.loanAmount || 0);
    setRoi(draft.interestRate != null ? String(draft.interestRate) : "");
    setTenure(draft.tenure != null ? String(draft.tenure) : "");
    setInvoicePartyId(draft.invoicePartyId || draft.commissionAccountingPayeeId || "");
    setInvoicePartyLabel(
      draft.invoicePartyLabel || draft.commissionAccountingPayeeLabel || "",
    );
    setRemarks(draft.internalNotes || "");
    setChangeReason("");
    setIssues([]);
  }, [open, draft, primaryLender]);

  const onLenderSelect = (next: {
    lender: EnterpriseLenderRecord;
    program?: EnterpriseLenderProgramRecord | null;
  }) => {
    setLenderId(next.lender.id);
    setLenderLabel(next.lender.displayName || next.lender.label);
    if (next.program) {
      setProgramId(next.program.id);
      setProgramLabel(next.program.label);
      if (next.program.roiPercent != null && !roi) {
        setRoi(String(next.program.roiPercent));
      }
      if (next.program.maxTenureMonths != null && !tenure) {
        setTenure(String(next.program.maxTenureMonths));
      }
    } else {
      setProgramId("");
      setProgramLabel("");
    }
  };

  const save = async () => {
    const validation = validateDealEditFields({
      lenderId,
      lenderProgramId: programId,
      invoicePartyId,
      requestedAmount: amount,
      interestRate: roi ? Number(roi) : null,
      tenure: tenure ? Number(tenure) : null,
      requireProgram: true,
      requireInvoiceParty: true,
    });
    if (validation.length) {
      setIssues(validation.map((v) => v.message));
      toast.error(validation[0].message);
      return;
    }
    setSaving(true);
    setIssues([]);
    try {
      const patch: Partial<LoanFile> = {
        lender: lenderLabel,
        requiredAmount: amount,
        loanAmount: amount,
        interestRate: roi ? Number(roi) : undefined,
        tenure: tenure ? Number(tenure) : undefined,
        internalNotes: remarks,
        invoicePartyId,
        invoicePartyLabel,
        commissionAccountingPayeeId: invoicePartyId,
        commissionAccountingPayeeLabel: invoicePartyLabel,
        lenderProgramId: programId,
        enterpriseLenderId: lenderId,
      };

      // Update primary active lender case snapshot
      if (draft.lenders?.length) {
        patch.lenders = draft.lenders.map((l) =>
          l.id === primaryLender?.id || (l.status === "active" && !primaryLender)
            ? {
                ...l,
                lender: lenderLabel,
                lenderDisplayName: lenderLabel,
                lenderRegistryId: lenderId,
                lenderProgramId: programId,
                lenderProgramLabel: programLabel,
                expectedLoanAmount: amount,
                finalRoi: roi ? Number(roi) : l.finalRoi,
                finalTenure: tenure ? Number(tenure) : l.finalTenure,
              }
            : l,
        );
      }

      if (isDealRegistryApiEnabled() && draft.enterpriseDealId) {
        let rowVersion = draft.enterpriseDealRowVersion ?? 1;
        try {
          const existing = await enterpriseDealApiClient.getDeal(draft.enterpriseDealId);
          if (existing?.rowVersion) rowVersion = existing.rowVersion;
        } catch {
          /* use local rowVersion */
        }
        await enterpriseDealApiClient.updateDeal(draft.enterpriseDealId, {
          rowVersion,
          lenderId,
          lenderProgramId: programId,
          requestedAmount: amount,
          invoicePartyId,
          lendingExtension: {
            interestRate: roi ? Number(roi) : null,
            tenure: tenure ? Number(tenure) : null,
            internalRemarks: remarks,
          },
          reason: changeReason.trim() || "deal_edit",
        });
      }

      await onSaved({
        patch,
        auditHint: `Lender/program edit: ${lenderLabel} / ${programLabel}`,
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Deal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Deal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <EnterpriseLenderSearch
            productCode={draft.productCode}
            productLabel={draft.loanProduct}
            loanProduct={draft.loanProduct}
            selectedLenderId={lenderId || null}
            selectedProgramId={programId || null}
            onSelect={onLenderSelect}
            requireProgram
          />

          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">
              Loan Amount *
            </Label>
            <INRCurrencyInput
              className="mt-1"
              value={amount}
              onChange={(v) => setAmount(v ?? 0)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">ROI %</Label>
              <Input
                className="mt-1 h-8 text-xs"
                inputMode="decimal"
                value={roi}
                onChange={(e) => setRoi(e.target.value)}
                placeholder="e.g. 8.75"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">
                Tenure (months)
              </Label>
              <Input
                className="mt-1 h-8 text-xs"
                inputMode="numeric"
                value={tenure}
                onChange={(e) => setTenure(e.target.value)}
                placeholder="e.g. 240"
              />
            </div>
          </div>

          <InvoicePartyField
            invoicePartyId={invoicePartyId}
            invoicePartyLabel={invoicePartyLabel}
            required
            onChange={(next) => {
              setInvoicePartyId(
                next.invoicePartyId || next.commissionAccountingPayeeId || "",
              );
              setInvoicePartyLabel(
                next.invoicePartyLabel || next.commissionAccountingPayeeLabel || "",
              );
            }}
          />

          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">
              Internal Remarks
            </Label>
            <Textarea
              className="mt-1 min-h-[72px] text-xs"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Internal notes for this Deal"
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">
              Change reason (optional — captured in audit)
            </Label>
            <Input
              className="mt-1 h-8 text-xs"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="Why is the lender / program changing?"
            />
          </div>

          {issues.length > 0 ? (
            <ul className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
              {issues.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save Deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
