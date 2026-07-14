"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  getProductsForLendingType,
  LENDING_TYPES,
  TRANSACTION_TYPES,
  type PropertyType,
} from "@/constants/loan-stage-master";
import type { OccupancyMasterEntry } from "@/constants/occupancy-master";
import { useAuthContext } from "@/components/providers/auth-provider";
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
 * CHANAKYA Business Guidance Card (CF-CHANAKYA-001 / CF-WF-001).
 * Collects only what the process needs — never framed as validation failure.
 */
export function BusinessCompletionDialog({
  open,
  request,
  contextValues,
  saving = false,
  onOpenChange,
  onSaveAndContinue,
}: BusinessCompletionDialogProps) {
  const { user } = useAuthContext();
  const firstName = user?.firstName?.trim() || "there";
  const fields = request?.fields ?? [];
  const [values, setValues] = useState<BusinessCompletionValues>({});
  const [nudge, setNudge] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !request) return;
    const seed: BusinessCompletionValues = {};
    for (const field of request.fields) {
      seed[field.fieldKey] = contextValues?.[field.fieldKey];
    }
    setValues(seed);
    setNudge(null);
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
        setNudge(`I still need ${field.label} before I can continue.`);
        return;
      }
    }
    setNudge(null);
    await onSaveAndContinue(values);
  };

  if (!request) return null;

  const processLabel = request.processTitle?.trim() || "this business journey";
  const whyText =
    request.message?.trim() ||
    `I need ${fields.length === 1 ? "one more detail" : "a few more details"} before I can continue ${processLabel}.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(520px,94vw)] overflow-y-auto border-violet-500/20 bg-gradient-to-b from-background via-background to-violet-50/40 p-0 sm:rounded-2xl dark:to-violet-950/30">
        <DialogHeader className="space-y-3 border-b border-violet-500/15 px-5 pb-4 pt-5 text-left">
          <div className="flex gap-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-violet-400/35 shadow-sm">
              <Image
                src="/images/chanakya-portrait.png"
                alt="CHANAKYA"
                fill
                className="object-cover"
                sizes="44px"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
                CHANAKYA · Business Guidance
              </p>
              <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                Hi {firstName},
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {whyText}
              </DialogDescription>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Once you save, I&apos;ll continue automatically from where we left off —{" "}
            <span className="font-medium text-foreground">{processLabel}</span>.
          </p>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700/80 dark:text-violet-300/80">
            Details I need
          </p>
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

          {nudge && (
            <p className="rounded-lg border border-violet-300/50 bg-violet-50/80 px-3 py-2 text-xs text-violet-950 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-100">
              {nudge}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-violet-500/15 px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            className="rounded-lg"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Come back later
          </Button>
          <Button
            type="button"
            className="rounded-lg bg-violet-600 hover:bg-violet-500"
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

/** @deprecated Prefer BusinessCompletionDialog — alias for CF-CHANAKYA-001 naming */
export const ChanakyaBusinessGuidanceDialog = BusinessCompletionDialog;

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
        {field.required !== false && <span className="text-violet-600"> *</span>}
      </Label>
      {field.helpText && (
        <p className="text-[11px] leading-snug text-muted-foreground">{field.helpText}</p>
      )}

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
