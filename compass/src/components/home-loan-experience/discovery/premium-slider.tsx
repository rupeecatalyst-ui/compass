"use client";

import { useReducedMotion } from "framer-motion";
import { formatInr } from "@/components/home-loan-experience/hl-utils";
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
}

export function PremiumSlider({
  value,
  min,
  max,
  minLabel,
  maxLabel,
  onChange,
  className,
}: PremiumSliderProps) {
  const reduceMotion = useReducedMotion();
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("space-y-8", className)}>
      <p className="text-center text-3xl font-semibold tracking-tight text-gradient sm:text-4xl">
        {formatSliderValue(value)}
      </p>

      <div className="relative px-1 pt-2">
        <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/80 to-accent/80 transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={Math.max(1, Math.round((max - min) / 200))}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-x-0 top-0 h-6 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-[#0a0f17] [&::-webkit-slider-thumb]:shadow-[0_0_20px_var(--glow)]"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
