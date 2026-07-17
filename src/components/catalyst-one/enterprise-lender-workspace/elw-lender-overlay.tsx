"use client";

import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EnterpriseLenderWorkspace } from "./enterprise-lender-workspace";
import { cn } from "@/lib/utils";

/**
 * Stacked lender workspace overlay — preserves Analyze Deal (or parent) context.
 */
export function EnterpriseLenderOverlay({
  open,
  onOpenChange,
  lenderId,
  productId,
  productLabel,
  returnLabel = "previous workspace",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lenderId: string | null;
  productId?: string;
  productLabel?: string;
  returnLabel?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        allowOutsideClose={false}
        className={cn(
          "flex h-full w-full flex-col gap-0 border-l border-border/60 bg-background p-0 shadow-2xl",
          "z-[95] sm:max-w-[min(100vw,94vw)] md:max-w-[92vw]",
        )}
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border/60 px-5 py-3 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
            Enterprise Lender Workspace
          </p>
          <SheetTitle className="text-base">Product policy · contextual desk</SheetTitle>
          <SheetDescription className="text-xs">
            Closing returns you to {returnLabel} with full context preserved.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {lenderId ? (
            <EnterpriseLenderWorkspace
              lenderId={lenderId}
              presentation="embedded"
              initialProductId={productId}
              initialProductLabel={productLabel}
              onClose={() => onOpenChange(false)}
              closeLabel={returnLabel}
            />
          ) : null}
        </div>

        <div className="shrink-0 border-t border-border/60 px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full gap-1.5 text-xs text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-3.5 w-3.5" />
            Close — return to {returnLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
