"use client";

/**
 * CO-UX-015 — Enterprise Financial Input
 * Single reusable monetary entry: magnitude + Indian unit → absolute rupees.
 * Storage / APIs / calculations remain absolute numeric (UI-only conversion).
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ENTERPRISE_FINANCIAL_DEFAULT_UNIT,
  ENTERPRISE_FINANCIAL_UNIT_OPTIONS,
  type EnterpriseFinancialUnit,
} from "@/constants/enterprise-financial-input";
import {
  absoluteToUnitMagnitude,
  formatFinancialEquivalent,
  formatFinancialMagnitudeInput,
  inferFinancialUnit,
  parseFinancialMagnitudeInput,
  unitMagnitudeToAbsolute,
} from "@/lib/enterprise-financial-input";
import { cn } from "@/lib/utils";

export interface EnterpriseFinancialInputProps {
  /** Absolute rupee amount (storage SSOT). */
  value?: number | null;
  /** Emits absolute rupees (or undefined when cleared / invalid empty). */
  onChange: (absoluteRupees: number | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  id?: string;
  /** Hide the ₹ equivalent line (rare — prefer leave on). */
  showEquivalent?: boolean;
  /** Optional default unit when value is empty. */
  defaultUnit?: EnterpriseFinancialUnit;
}

export function EnterpriseFinancialInput({
  value,
  onChange,
  placeholder = "e.g. 45",
  className,
  disabled,
  readOnly,
  id,
  showEquivalent = true,
  defaultUnit = ENTERPRISE_FINANCIAL_DEFAULT_UNIT,
}: EnterpriseFinancialInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const locked = Boolean(disabled || readOnly);

  const [unit, setUnit] = useState<EnterpriseFinancialUnit>(() =>
    value != null && Number(value) > 0 ? inferFinancialUnit(value) : defaultUnit,
  );
  const [magnitudeText, setMagnitudeText] = useState(() => {
    const u =
      value != null && Number(value) > 0 ? inferFinancialUnit(value) : defaultUnit;
    return formatFinancialMagnitudeInput(absoluteToUnitMagnitude(value, u));
  });
  const lastEmittedRef = useRef<number | undefined>(
    value != null && Number.isFinite(Number(value)) && Number(value) > 0
      ? Number(value)
      : undefined,
  );

  useEffect(() => {
    const nextAbs =
      value != null && Number.isFinite(Number(value)) && Number(value) > 0
        ? Number(value)
        : undefined;
    if (nextAbs === lastEmittedRef.current) return;
    const nextUnit = nextAbs != null ? inferFinancialUnit(nextAbs) : defaultUnit;
    setUnit(nextUnit);
    setMagnitudeText(
      formatFinancialMagnitudeInput(absoluteToUnitMagnitude(nextAbs, nextUnit)),
    );
    lastEmittedRef.current = nextAbs;
  }, [value, defaultUnit]);

  const emitAbsolute = (absolute: number | undefined) => {
    lastEmittedRef.current = absolute;
    onChange(absolute);
  };

  const applyMagnitudeText = (raw: string, nextUnit: EnterpriseFinancialUnit) => {
    // Allow empty and in-progress decimal entry (e.g. "2.")
    if (raw === "") {
      setMagnitudeText("");
      emitAbsolute(undefined);
      return;
    }
    if (!/^\d*\.?\d*$/.test(raw)) return;
    // Reject leading-only minus via pattern already
    setMagnitudeText(raw);
    if (raw === "." || raw.endsWith(".")) {
      // Incomplete decimal — wait for more digits before emitting
      return;
    }
    const magnitude = parseFinancialMagnitudeInput(raw);
    if (magnitude == null) {
      emitAbsolute(undefined);
      return;
    }
    const absolute = unitMagnitudeToAbsolute(magnitude, nextUnit);
    emitAbsolute(absolute != null && absolute > 0 ? absolute : undefined);
  };

  const onUnitChange = (next: EnterpriseFinancialUnit) => {
    setUnit(next);
    applyMagnitudeText(magnitudeText, next);
  };

  const absoluteForDisplay = useMemo(() => {
    if (!magnitudeText || magnitudeText === "." || magnitudeText.endsWith(".")) {
      return value != null && Number(value) > 0 ? Number(value) : undefined;
    }
    const magnitude = parseFinancialMagnitudeInput(magnitudeText);
    if (magnitude == null) return undefined;
    const absolute = unitMagnitudeToAbsolute(magnitude, unit);
    return absolute != null && absolute > 0 ? absolute : undefined;
  }, [magnitudeText, unit, value]);
  const equivalent = formatFinancialEquivalent(absoluteForDisplay);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-stretch gap-1.5">
        <Input
          id={inputId}
          className={cn(
            "h-8 min-w-0 flex-1 text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            locked && "bg-muted/40",
          )}
          inputMode="decimal"
          placeholder={placeholder}
          value={magnitudeText}
          disabled={disabled}
          readOnly={readOnly || disabled}
          aria-label="Financial amount"
          onChange={(e) => {
            if (locked) return;
            applyMagnitudeText(e.target.value, unit);
          }}
        />
        <Select
          value={unit}
          onValueChange={(v) => onUnitChange(v as EnterpriseFinancialUnit)}
          disabled={locked}
        >
          <SelectTrigger
            className="h-8 w-[7.25rem] shrink-0 text-xs"
            aria-label="Amount unit"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTERPRISE_FINANCIAL_UNIT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {showEquivalent ? (
        <p
          className="min-h-[1rem] text-[11px] tabular-nums text-muted-foreground"
          aria-live="polite"
        >
          {equivalent ? (
            <>
              <span className="font-medium text-foreground/80">{equivalent}</span>
            </>
          ) : (
            <span>Equivalent value</span>
          )}
        </p>
      ) : null}
    </div>
  );
}
