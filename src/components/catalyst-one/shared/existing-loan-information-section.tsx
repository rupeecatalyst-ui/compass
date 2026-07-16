"use client";

import { OrganizationRegistrySelect } from "@/components/catalyst-one/shared/organization-registry-select";
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
 * Captures Current Lending Institution + Outstanding Loan Amount only.
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
      <div className="overflow-hidden">
        <div
          className={cn(
            "mt-3 space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3 transition-opacity duration-300",
            visible ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          <div>
            <h4 className="text-xs font-semibold tracking-tight text-foreground">
              Existing Loan Information
            </h4>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Required for Balance Transfer — only these fields at this stage.
            </p>
          </div>

          {readOnly ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Current Lending Institution
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Current Lending Institution *</Label>
                <OrganizationRegistrySelect
                  value={institutionId}
                  placeholder="Search lending institution…"
                  onSelect={(org) => onInstitutionChange(org.id, org.name)}
                />
                {institutionError ? (
                  <p className="text-[11px] text-destructive">{institutionError}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
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
