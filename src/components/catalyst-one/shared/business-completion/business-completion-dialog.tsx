"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getProductsForLendingType,
  LENDING_TYPES,
  TRANSACTION_TYPES,
  type PropertyType,
} from "@/constants/loan-stage-master";
import type { OccupancyMasterEntry } from "@/constants/occupancy-master";
import { OrganizationRegistrySelect } from "@/components/catalyst-one/shared/organization-registry-select";
import { OccupancySelect } from "@/components/catalyst-one/shared/occupancy-select";
import { PropertyTypeSelect } from "@/components/catalyst-one/shared/property-type-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  BusinessCompletionField,
  BusinessCompletionRequest,
  BusinessCompletionValues,
} from "@/types/business-completion";
import type { LendingType, TransactionType } from "@/types/catalyst-one";

export interface BusinessCompletionDialogProps {
  open: boolean;
  request: BusinessCompletionRequest | null;
  /** Current entity snapshot — used to seed controls and drive product-aware pickers. */
  contextValues?: BusinessCompletionValues & {
    loanProduct?: string;
    lendingType?: string;
  };
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  /** Persist missing fields and resume the original business process. */
  onSaveAndContinue: (values: BusinessCompletionValues) => void | Promise<void>;
}

/**
 * Centered Business Completion Card (CF-WF-001).
 * Dynamically renders only the mandatory fields for the blocked process.
 */
export function BusinessCompletionDialog({
  open,
  request,
  contextValues,
  saving = false,
  onOpenChange,
  onSaveAndContinue,
}: BusinessCompletionDialogProps) {
  const fields = request?.fields ?? [];
  const [values, setValues] = useState<BusinessCompletionValues>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !request) return;
    const seed: BusinessCompletionValues = {};
    for (const field of request.fields) {
      seed[field.fieldKey] = contextValues?.[field.fieldKey];
    }
    setValues(seed);
    setError(null);
  }, [open, request, contextValues]);

  const loanProduct =
    String(values.loanProduct ?? contextValues?.loanProduct ?? "") || undefined;
  const lendingType = (values.lendingType ??
    contextValues?.lendingType ??
    "secured") as LendingType;

  const productOptions = useMemo(
    () => getProductsForLendingType(lendingType),
    [lendingType],
  );

  const setField = (key: string, value: string | number | undefined) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!request) return;
    for (const field of request.fields) {
      const v = values[field.fieldKey];
      if (field.required !== false && (v === undefined || v === null || String(v).trim() === "")) {
        setError(`${field.label} is required.`);
        return;
      }
    }
    setError(null);
    await onSaveAndContinue(values);
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(520px,94vw)] overflow-y-auto sm:rounded-2xl">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {request.processTitle}
          </DialogTitle>
          <DialogDescription>
            {request.message ?? "Missing fields required to continue this business process."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Missing Fields
          </p>
          <ul className="mb-3 list-inside list-disc text-sm text-muted-foreground">
            {fields.map((f) => (
              <li key={f.fieldKey}>{f.label}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          {fields.map((field) => (
            <CompletionFieldControl
              key={field.fieldKey}
              field={field}
              value={values[field.fieldKey]}
              loanProduct={loanProduct}
              productOptions={productOptions}
              onChange={(next) => setField(field.fieldKey, next)}
              onLendingTypeChange={(lt) => {
                setField("lendingType", lt);
                setField("loanProduct", undefined);
              }}
              onBtInstitution={(id, name) => {
                setField("btInstitutionId", id);
                setField("btInstitutionName", name);
              }}
              onOccupancy={(entry) => setField("occupancyId", entry.id)}
            />
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="ghost"
            className="rounded-lg"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-lg"
            disabled={saving}
            onClick={() => void handleSubmit()}
          >
            {saving ? "Saving…" : "Save & Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CompletionFieldControl({
  field,
  value,
  loanProduct,
  productOptions,
  onChange,
  onLendingTypeChange,
  onBtInstitution,
  onOccupancy,
}: {
  field: BusinessCompletionField;
  value: string | number | undefined;
  loanProduct?: string;
  productOptions: readonly string[];
  onChange: (value: string | number | undefined) => void;
  onLendingTypeChange: (type: LendingType) => void;
  onBtInstitution: (id: string, name: string) => void;
  onOccupancy: (entry: OccupancyMasterEntry) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">
        {field.label}
        {field.required !== false && <span className="text-destructive"> *</span>}
      </Label>

      {field.control === "property_type" && (
        <PropertyTypeSelect
          value={typeof value === "string" ? value : undefined}
          onSelect={(type: PropertyType) => onChange(type)}
        />
      )}

      {field.control === "occupancy" && (
        <OccupancySelect
          loanProduct={loanProduct ?? ""}
          value={typeof value === "string" ? value : undefined}
          onSelect={onOccupancy}
        />
      )}

      {field.control === "lending_type" && (
        <Select
          value={typeof value === "string" ? value : undefined}
          onValueChange={(v) => onLendingTypeChange(v as LendingType)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select lending type" />
          </SelectTrigger>
          <SelectContent>
            {LENDING_TYPES.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.control === "transaction_type" && (
        <Select
          value={typeof value === "string" ? value : undefined}
          onValueChange={(v) => onChange(v as TransactionType)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select transaction type" />
          </SelectTrigger>
          <SelectContent>
            {TRANSACTION_TYPES.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.control === "loan_product" && (
        <Select
          value={typeof value === "string" ? value : undefined}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {productOptions.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.control === "bt_institution" && (
        <OrganizationRegistrySelect
          value={typeof value === "string" ? value : undefined}
          onSelect={(org) => onBtInstitution(org.id, org.name)}
        />
      )}

      {(field.control === "bt_amount" ||
        field.control === "final_loan_amount" ||
        field.control === "number") && (
        <Input
          type="number"
          className="h-9"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(Number.isFinite(n) && e.target.value !== "" ? n : undefined);
          }}
        />
      )}

      {field.control === "text" && (
        <Input
          className="h-9"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
