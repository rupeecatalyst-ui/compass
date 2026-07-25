"use client";

import { EnterpriseLenderRegistrySelect } from "@/components/catalyst-one/shared/enterprise-lender-registry-select";
import { INRCurrencyInput } from "@/components/catalyst-one/shared/inr-currency-input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface ExistingLoanInformationSectionProps {
  visible: boolean;
  institutionId?: string;
  outstandingAmount?: number;
  onInstitutionChange: (id: string, name: string) => void;
  onOutstandingChange: (amount: number | undefined) => void;
  institutionError?: string;
  amountError?: string;
  readOnly?: boolean;
  institutionName?: string;
  className?: string;
}

/**
 * Dynamic Transaction Type — Existing Loan Information.
 * Revealed only when Transaction Type = Balance Transfer.
 * Captures Existing Lender (Enterprise Lender Registry) + Outstanding Loan Amount.
 *
 * BAT #14 — Existing Lender is full-width at the top of the card so the
 * autocomplete can open downward with adequate space (no overflow clip).
 */
export function ExistingLoanInformationSection({
  visible,
  institutionId,
  outstandingAmount,
  onInstitutionChange,
  onOutstandingChange,
  institutionError,
  amountError,
  readOnly = false,
  institutionName,
  className,
}: ExistingLoanInformationSectionProps) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-300 ease-out",
        visible ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        className,
      )}
      aria-hidden={!visible}
    >
      {/*
        When expanded, overflow must be visible so the lender autocomplete
        is not clipped by the accordion shell (BAT #14).
      */}
      <div className={cn(visible ? "min-h-0 overflow-visible" : "overflow-hidden")}>
        <div
          className={cn(
            "relative z-20 mt-3 space-y-4 rounded-lg border border-border/80 bg-muted/20 p-3.5 transition-opacity duration-300 sm:p-4",
            visible ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <div>
            <h4 className="text-xs font-semibold tracking-tight text-foreground">
              Existing Loan Information
            </h4>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Required for Balance Transfer — search and select the current lending institution.
            </p>
          </div>

          {readOnly ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Existing Lender
                </p>
                <p className="mt-0.5 text-xs font-medium">{institutionName || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Outstanding Loan Amount
                </p>
                <p className="mt-0.5 text-xs font-medium">
                  {typeof outstandingAmount === "number" && outstandingAmount > 0
                    ? new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      }).format(outstandingAmount)
                    : "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Primary: full-width lender search at top — best dropdown affordance */}
              <div className="relative z-30 space-y-1.5">
                <Label className="text-[11px]">Existing Lender *</Label>
                <EnterpriseLenderRegistrySelect
                  value={institutionId}
                  selectedName={institutionName}
                  onSelect={(lender) => onInstitutionChange(lender.id, lender.name)}
                  placeholder="Search existing lender…"
                  className="w-full"
                  inputClassName="h-9 text-sm"
                  listMaxHeightClassName="max-h-56"
                />
                {institutionError ? (
                  <p className="text-[11px] text-destructive">{institutionError}</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    Type to filter active lenders from the Enterprise Lender Registry.
                  </p>
                )}
              </div>

              {/* Secondary: amount below — leaves vertical room for the open list */}
              <div className="max-w-md space-y-1.5">
                <Label className="text-[11px]">Outstanding Loan Amount *</Label>
                <INRCurrencyInput
                  value={outstandingAmount}
                  onChange={onOutstandingChange}
                />
                {amountError ? (
                  <p className="text-[11px] text-destructive">{amountError}</p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
