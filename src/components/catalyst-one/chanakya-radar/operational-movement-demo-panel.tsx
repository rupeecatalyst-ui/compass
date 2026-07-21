"use client";

import { useState } from "react";
import {
  clearDemoOperationalMovements,
  injectDemoOperationalMovements,
  isOperationalMovementDemoEnabled,
  OPERATIONAL_MOVEMENT_DEMO_SAMPLES,
  operationalQuadrantTone,
} from "@/lib/chanakya-radar/operational-movement";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * CO-SPRINT-113A — Developer Demonstration Mode panel.
 * BUSINESS CERTIFIED — development / certification / UX demos only.
 * Renders only when `NODE_ENV === "development"`. Never ships as visible UI in production.
 */
export function OperationalMovementDemoPanel({ className }: { className?: string }) {
  const [lastInjectAt, setLastInjectAt] = useState<string | null>(null);

  if (!isOperationalMovementDemoEnabled()) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-amber-500/40 bg-amber-500/[0.06] px-3 py-2",
        className,
      )}
      data-dev-only="operational-movement-demo"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-400/90">
            Developer Demonstration Mode
          </p>
          <p className="text-[11px] text-zinc-400">
            Inject sample Movement Feed events — development only. Does not change loan data.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 border-amber-500/40 bg-transparent text-[11px] text-amber-100 hover:bg-amber-500/15"
            onClick={() => {
              injectDemoOperationalMovements();
              setLastInjectAt(new Date().toLocaleTimeString());
            }}
          >
            Inject demo movements
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] text-zinc-400 hover:text-zinc-200"
            onClick={() => {
              clearDemoOperationalMovements();
              setLastInjectAt(null);
            }}
          >
            Clear demos
          </Button>
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {OPERATIONAL_MOVEMENT_DEMO_SAMPLES.map((s) => (
          <li
            key={`${s.borrower}-${s.from}-${s.to}`}
            className="flex items-center gap-1.5 text-[10px] text-zinc-300"
          >
            <span className="font-medium">{s.borrower}</span>
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: operationalQuadrantTone(s.from) }}
              aria-hidden
            />
            <span className="text-zinc-500">→</span>
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: operationalQuadrantTone(s.to) }}
              aria-hidden
            />
          </li>
        ))}
      </ul>
      {lastInjectAt ? (
        <p className="mt-1.5 text-[10px] text-zinc-500">Last inject: {lastInjectAt}</p>
      ) : null}
    </div>
  );
}
