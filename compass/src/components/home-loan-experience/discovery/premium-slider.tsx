"use client";

import { useState } from "react";
import { useReducedMotion } from "framer-motion";
import { formatInr, parseInr } from "@/components/home-loan-experience/hl-utils";
import { cn } from "@/lib/utils";

function formatSliderValue(value: number): string {
  if (value >= 1_00_00_000) {
    const cr = value / 1_00_00_000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)} Crore`;
  }
  if (value >= 1_00_000) {
    const lakh = value / 1_00_000;
    return `₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)} Lakh`;
  }
  return `₹${formatInr(value)}`;
}

interface PremiumSliderProps {
  value: number;
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  onChange: (value: number) => void;
  className?: string;
  /** Integer rupees. Default 1 so the approved ceiling is always reachable. */
  step?: number;
  allowManualInput?: boolean;
  error?: string | null;
  overLimitMessage?: string;
  onManualError?: (message: string | null) => void;
}

export function PremiumSlider({
  value,
  min,
  max,
  minLabel,
  maxLabel,
  onChange,
  className,
  step = 1,
  allowManualInput = false,
  error = null,
  overLimitMessage,
  onManualError,
}: PremiumSliderProps) {
  const reduceMotion = useReducedMotion();
  const safeMax = max >= min ? max : min;
  const safeStep = Number.isInteger(step) && step > 0 ? step : 1;
  const clamped = Math.min(Math.max(Math.round(value), min), safeMax);
  const pct = safeMax === min ? 100 : ((clamped - min) / (safeMax - min)) * 100;
  const [draft, setDraft] = useState(formatInr(clamped));
  const overMaxMessage = overLimitMessage || `Enter an amount up to ${maxLabel}.`;

  return (
    <div className={cn("space-y-8", className)}>
      <p className="text-center text-3xl font-semibold tracking-tight text-gradient sm:text-4xl">
        {formatSliderValue(clamped)}
      </p>

      <div className="relative px-1 pt-2">
        <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/80 to-accent/80",
              reduceMotion ? "" : "transition-[width] duration-300 ease-out",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={safeMax}
          step={safeStep}
          value={clamped}
          onChange={(e) => {
            const next = Math.round(Number(e.target.value));
            onManualError?.(null);
            onChange(next);
            setDraft(formatInr(next));
          }}
          className="absolute inset-x-0 top-0 h-6 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-[#0a0f17] [&::-webkit-slider-thumb]:shadow-[0_0_20px_var(--glow)]"
          aria-valuemin={min}
          aria-valuemax={safeMax}
          aria-valuenow={clamped}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>

      {allowManualInput ? (
        <label className="block space-y-2">
          <span className="block text-center text-xs text-muted-foreground">Or enter the exact amount</span>
          <input
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(e) => {
              const raw = e.target.value;
              const parsed = parseInr(raw);
              setDraft(parsed ? formatInr(parsed) : raw.replace(/[^\d,]/g, ""));
              if (!parsed) {
                onManualError?.("Enter a valid requested amount.");
                return;
              }
              if (parsed > safeMax) {
                onManualError?.(overMaxMessage);
                return;
              }
              onManualError?.(null);
              onChange(parsed);
            }}
            className="mx-auto block w-full max-w-xs rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-center text-sm tracking-wide text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "requested-amount-error" : undefined}
          />
        </label>
      ) : null}

      {error ? (
        <p id="requested-amount-error" className="text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
