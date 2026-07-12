"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Health, HorizonSelection } from "../types";
import { EmptyState } from "./EmptyState";
import { HealthBadge } from "./HealthBadge";

/**
 * Right slide-over for node detail — stays on /horizon (no route change).
 */
export function DetailSlideOver({
  selection,
  open,
  onOpenChange,
  health,
  children,
}: {
  selection: HorizonSelection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  health?: Health;
  children?: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[92vw] border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-md"
      >
        <SheetHeader className="space-y-2 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/80">
            {selection?.kind ?? "Detail"}
          </p>
          <SheetTitle className="text-zinc-50">{selection?.title ?? "Selection"}</SheetTitle>
          {selection?.subtitle ? (
            <SheetDescription className="text-zinc-400">{selection.subtitle}</SheetDescription>
          ) : (
            <SheetDescription className="text-zinc-500">
              Same-page detail panel · placeholder content only
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {selection ? (
            <>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md border border-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
                  {selection.kind}
                </span>
                <span className="rounded-md border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
                  {selection.id}
                </span>
                {health ? <HealthBadge health={health} /> : null}
              </div>
              {children ?? (
                <EmptyState
                  title="Detail architecture ready"
                  description="Fields, relations, and actions will bind here without leaving Horizon."
                />
              )}
            </>
          ) : (
            <EmptyState title="Nothing selected" />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
