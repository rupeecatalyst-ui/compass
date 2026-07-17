"use client";

import { INRCurrencyInput } from "@/components/catalyst-one/shared/inr-currency-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EMPLOYMENT_TYPES,
  normalizeEmploymentType,
  employmentTypeToLabel,
  type EmploymentTypeId,
} from "@/constants/employment-master";
import { getContextAwareVisibility } from "@/lib/context-aware-data-collection";
import type { LoanFileBusiness } from "@/types/catalyst-one";

interface EmploymentIncomeFieldsProps {
  employmentType: string;
  businessDetails?: LoanFileBusiness;
  onEmploymentTypeChange: (label: string) => void;
  onBusinessDetailsChange: (patch: Partial<LoanFileBusiness>) => void;
}

/**
 * Context-Aware employment + income fields.
 * Salaried → salary only. Self-employed → turnover / profit / receipts — never both families.
 */
export function EmploymentIncomeFields({
  employmentType,
  businessDetails,
  onEmploymentTypeChange,
  onBusinessDetailsChange,
}: EmploymentIncomeFieldsProps) {
  const typeId = normalizeEmploymentType(employmentType);
  const ctx = getContextAwareVisibility(typeId);

  const handleTypeChange = (id: EmploymentTypeId) => {
    onEmploymentTypeChange(employmentTypeToLabel(id));
    const next = getContextAwareVisibility(id);
    if (next.isSalariedFamily) {
      onBusinessDetailsChange({
        annualTurnover: undefined,
        annualProfit: undefined,
        annualGrossReceipts: undefined,
        annualProfessionalIncome: undefined,
      });
    } else if (next.isSelfEmployedFamily) {
      onBusinessDetailsChange({ monthlySalary: undefined });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Employment Type">
        <Select value={typeId} onValueChange={(v) => handleTypeChange(v as EmploymentTypeId)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EMPLOYMENT_TYPES.map((type) => (
              <SelectItem key={type.id} value={type.id} className="text-xs">
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {ctx.isVisible("salary") ? (
        <Field label="Monthly Salary (₹)">
          <INRCurrencyInput
            value={businessDetails?.monthlySalary}
            onChange={(v) => onBusinessDetailsChange({ monthlySalary: v })}
          />
        </Field>
      ) : null}

      {ctx.isVisible("business_turnover") ? (
        <Field label="Annual Turnover (₹)">
          <INRCurrencyInput
            value={businessDetails?.annualTurnover}
            onChange={(v) => onBusinessDetailsChange({ annualTurnover: v })}
          />
        </Field>
      ) : null}

      {ctx.isVisible("profit") && typeId === "self-employed-business" ? (
        <Field label="Annual Profit (₹)">
          <INRCurrencyInput
            value={businessDetails?.annualProfit}
            onChange={(v) => onBusinessDetailsChange({ annualProfit: v })}
          />
        </Field>
      ) : null}

      {ctx.isSelfEmployedFamily && typeId === "self-employed-professional" ? (
        <>
          <Field label="Annual Gross Receipts (₹)">
            <INRCurrencyInput
              value={businessDetails?.annualGrossReceipts}
              onChange={(v) => onBusinessDetailsChange({ annualGrossReceipts: v })}
            />
          </Field>
          <Field label="Annual Professional Income (₹)">
            <INRCurrencyInput
              value={businessDetails?.annualProfessionalIncome}
              onChange={(v) => onBusinessDetailsChange({ annualProfessionalIncome: v })}
            />
          </Field>
        </>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
