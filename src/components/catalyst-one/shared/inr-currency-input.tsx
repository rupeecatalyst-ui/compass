"use client";

import { Input } from "@/components/ui/input";
import { formatINRInput, parseINRInput } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

interface INRCurrencyInputProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

/** UX-02 — Enterprise INR currency input (Indian grouping, no spinner arrows). */
export function INRCurrencyInput({
  value,
  onChange,
  placeholder = "e.g. 25,00,000",
  className,
  disabled,
  readOnly,
}: INRCurrencyInputProps) {
  return (
    <Input
      className={cn(
        "h-8 text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        readOnly && "bg-muted/40",
        className,
      )}
      inputMode="numeric"
      placeholder={placeholder}
      value={formatINRInput(value)}
      disabled={disabled}
      readOnly={readOnly || disabled}
      onChange={(e) => {
        const amount = parseINRInput(e.target.value);
        onChange(amount > 0 ? amount : undefined);
      }}
    />
  );
}
