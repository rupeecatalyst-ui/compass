"use client";

import type { Mode, ModeId } from "../types";
import { cn } from "@/lib/utils";

export function ModeSwitcher({
  mode,
  modes,
  onChange,
}: {
  mode: ModeId;
  modes: readonly Mode[];
  onChange: (mode: ModeId) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950/80 p-0.5"
      role="group"
      aria-label="Horizon workspace mode"
    >
      {modes.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          aria-pressed={mode === item.id}
          title={item.description}
          className={cn(
            "rounded-md px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider outline-none transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500/40",
            mode === item.id
              ? "bg-zinc-800 text-cyan-100"
              : "text-zinc-500 hover:text-zinc-300",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
