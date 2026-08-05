"use client";

/**
 * BAT #19 — Modify Loan Details in-place (reuses Lead Information form helpers).
 * Opens as a sheet so RMs stay in Opportunity Planning Workspace.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { EnterpriseFinancialInput } from "@/components/catalyst-one/shared/enterprise-financial-input";
import {
  absoluteRupeesFromStoredString,
  absoluteRupeesToStoredString,
} from "@/lib/enterprise-financial-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  emptyLeadInformationForm,
  LEAD_INFORMATION_EMPLOYMENT_OPTIONS,
  LEAD_INFORMATION_LENDING_TYPE_OPTIONS,
  LEAD_INFORMATION_NONE,
  LEAD_INFORMATION_PRODUCT_OPTIONS,
  LEAD_INFORMATION_TRANSACTION_OPTIONS,
  parseLeadInformationLendingExtension,
  resolveDefaultLendingTypeForProduct,
  type LeadInformationFormState,
} from "@/constants/lead-information-workspace";
import { useProductMasterOptions } from "@/lib/enterprise-product-master";
import {
  buildLeadInformationPatchBody,
  formFromOpportunity,
} from "@/lib/lead-information/form-helpers";
import {
  parseRequestedAmountInput,
  validateLeadInformationForm,
} from "@/lib/lead-information/validate-lead-information";
import {
  enterpriseOpportunityApiClient,
  OpportunityApiError,
  type EnterpriseOpportunityApiRecord,
} from "@/lib/enterprise-opportunity/opportunity-api-client";
import { ExistingLoanInformationSection } from "@/components/catalyst-one/shared/existing-loan-information-section";
import { toast } from "sonner";

function selectValue(raw: string): string {
  return raw.trim() ? raw : LEAD_INFORMATION_NONE;
}

function fromSelectValue(value: string): string {
  return value === LEAD_INFORMATION_NONE ? "" : value;
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}

export function ModifyLoanDetailsSheet({
  open,
  opportunityId,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  opportunityId: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [opp, setOpp] = useState<EnterpriseOpportunityApiRecord | null>(null);
  const [form, setForm] = useState<LeadInformationFormState>(emptyLeadInformationForm);
  const [errors, setErrors] = useState<
    Partial<Record<keyof LeadInformationFormState, string>>
  >({});
  const { options: productOptions } = useProductMasterOptions(true);
  const productCatalog =
    productOptions.length > 0 ? productOptions : LEAD_INFORMATION_PRODUCT_OPTIONS;

  const load = useCallback(async () => {
    if (!opportunityId) return;
    setLoading(true);
    try {
      const row = await enterpriseOpportunityApiClient.getOpportunity(opportunityId);
      setOpp(row);
      setForm(formFromOpportunity(row));
      setErrors({});
    } catch (err) {
      const message =
        err instanceof OpportunityApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not load Opportunity.";
      toast.error(message);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [opportunityId, onOpenChange]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const patchForm = <K extends keyof LeadInformationFormState>(
    key: K,
    value: LeadInformationFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const onProductChange = (codeOrNone: string) => {
    const code = fromSelectValue(codeOrNone);
    const hit = productCatalog.find((p) => p.code === code);
    const defaultLending = resolveDefaultLendingTypeForProduct(
      hit?.code ?? "",
      hit?.label ?? "",
    );
    setForm((prev) => ({
      ...prev,
      productCode: hit?.code ?? "",
      productLabel: hit?.label ?? "",
      lendingType: defaultLending || prev.lendingType,
    }));
  };

  const persist = async () => {
    if (!opportunityId || !opp) return;
    const check = validateLeadInformationForm(form, { requireMandatory: false });
    setErrors(check.errors);
    if (!check.valid) {
      toast.error("Fix validation errors before saving.");
      return;
    }
    setSaving(true);
    try {
      await enterpriseOpportunityApiClient.updateOpportunity(
        opportunityId,
        buildLeadInformationPatchBody(
          form,
          opp.rowVersion,
          parseLeadInformationLendingExtension(opp.lendingExtension),
        ),
      );
      toast.success("Loan details updated.");
      await onSaved();
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof OpportunityApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not save Loan Details.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Modify Loan Details</SheetTitle>
          <SheetDescription>
            Update Opportunity Registry fields without leaving Planning Workspace.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          {loading ? (
            <ChanakyaLoadingExperience
              module="opportunity"
              statusLabel="Loading Opportunity details..."
              density="inline"
              useEbiSignals={false}
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Product" required error={errors.productCode}>
                  <Select value={selectValue(form.productCode)} onValueChange={onProductChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Not Selected" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LEAD_INFORMATION_NONE}>Not Selected</SelectItem>
                      {productCatalog.map((p) => (
                        <SelectItem key={p.code} value={p.code}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Required Amount (₹)" required error={errors.requestedAmount}>
                  <EnterpriseFinancialInput
                    value={absoluteRupeesFromStoredString(form.requestedAmount)}
                    onChange={(absolute) =>
                      patchForm("requestedAmount", absoluteRupeesToStoredString(absolute))
                    }
                    placeholder="e.g. 45"
                    defaultUnit="lakh"
                  />
                </Field>
                <Field label="Lending Type" required error={errors.lendingType}>
                  <Select
                    value={selectValue(form.lendingType)}
                    onValueChange={(v) => patchForm("lendingType", fromSelectValue(v))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Not Specified" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LEAD_INFORMATION_NONE}>Not Specified</SelectItem>
                      {LEAD_INFORMATION_LENDING_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Transaction Type">
                  <Select
                    value={selectValue(form.transactionType)}
                    onValueChange={(v) => {
                      const next = fromSelectValue(v);
                      setForm((prev) => ({
                        ...prev,
                        transactionType: next,
                        ...(next !== "balance_transfer"
                          ? {
                              btInstitutionId: "",
                              btInstitutionName: "",
                              btAmount: "",
                            }
                          : {}),
                      }));
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Not Specified" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LEAD_INFORMATION_NONE}>Not Specified</SelectItem>
                      {LEAD_INFORMATION_TRANSACTION_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Employment Type">
                  <Select
                    value={selectValue(form.employmentTypeCode)}
                    onValueChange={(v) =>
                      patchForm("employmentTypeCode", fromSelectValue(v))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Not Specified" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LEAD_INFORMATION_NONE}>Not Specified</SelectItem>
                      {LEAD_INFORMATION_EMPLOYMENT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <ExistingLoanInformationSection
                visible={form.transactionType === "balance_transfer"}
                institutionId={form.btInstitutionId || undefined}
                institutionName={form.btInstitutionName || undefined}
                outstandingAmount={
                  form.btAmount.trim()
                    ? (parseRequestedAmountInput(form.btAmount) ?? undefined)
                    : undefined
                }
                onInstitutionChange={(id, name) => {
                  setForm((prev) => ({
                    ...prev,
                    btInstitutionId: id,
                    btInstitutionName: name,
                  }));
                }}
                onOutstandingChange={(amount) => {
                  setForm((prev) => ({
                    ...prev,
                    btAmount:
                      typeof amount === "number" && Number.isFinite(amount)
                        ? String(amount)
                        : "",
                  }));
                }}
                institutionError={errors.btInstitutionId}
                amountError={errors.btAmount}
              />
            </>
          )}
        </div>

        <SheetFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={saving || loading}
            onClick={() => void persist()}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
