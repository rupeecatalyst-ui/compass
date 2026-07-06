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
import type { LoanFileBusiness } from "@/types/catalyst-one";

interface EmploymentIncomeFieldsProps {
  employmentType: string;
  businessDetails?: LoanFileBusiness;
  onEmploymentTypeChange: (label: string) => void;
  onBusinessDetailsChange: (patch: Partial<LoanFileBusiness>) => void;
}

/** UX-02 — Dynamic employment and income fields by employment type. */
export function EmploymentIncomeFields({
  employmentType,
  businessDetails,
  onEmploymentTypeChange,
  onBusinessDetailsChange,
}: EmploymentIncomeFieldsProps) {
  const typeId = normalizeEmploymentType(employmentType);

  const handleTypeChange = (id: EmploymentTypeId) => {
    onEmploymentTypeChange(employmentTypeToLabel(id));
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

      {typeId === "salaried" && (
        <Field label="Monthly Salary (₹)">
          <INRCurrencyInput
            value={businessDetails?.monthlySalary}
            onChange={(v) => onBusinessDetailsChange({ monthlySalary: v })}
          />
        </Field>
      )}

      {typeId === "self_employed" && (
        <>
          <Field label="Annual Turnover (₹)">
            <INRCurrencyInput
              value={businessDetails?.annualTurnover}
              onChange={(v) => onBusinessDetailsChange({ annualTurnover: v })}
            />
          </Field>
          <Field label="Annual Profit (₹)">
            <INRCurrencyInput
              value={businessDetails?.annualProfit}
              onChange={(v) => onBusinessDetailsChange({ annualProfit: v })}
            />
          </Field>
        </>
      )}

      {typeId === "professional" && (
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
      )}
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
