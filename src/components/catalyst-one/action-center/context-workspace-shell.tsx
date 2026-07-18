"use client";

import { Sparkles, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Premium slide-over Context Workspace — temporary workspace, not a CRM popup.
 * Parent business context remains visible underneath.
 */
export function ContextWorkspaceShell({
  open,
  onOpenChange,
  title,
  description,
  entityLabel,
  children,
  footer,
  onAskChanakya,
  className,
  eyebrow = "Context Workspace",
  allowOutsideClose = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  entityLabel?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onAskChanakya?: () => void;
  className?: string;
  eyebrow?: string;
  allowOutsideClose?: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        allowOutsideClose={allowOutsideClose}
        className={cn(
          "flex w-full flex-col gap-0 border-l border-border/60 bg-background p-0 shadow-2xl",
          "z-[80] sm:max-w-xl md:max-w-2xl",
          "data-[state=open]:duration-400",
          className,
        )}
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border/60 bg-gradient-to-r from-background via-background to-teal-500/5 px-5 py-4 pr-12 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700/90 dark:text-teal-300/90">
            {eyebrow}
            {entityLabel ? ` · ${entityLabel}` : ""}
          </p>
          <SheetTitle className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </SheetTitle>
          {description ? (
            <SheetDescription className="text-xs leading-relaxed text-muted-foreground">
              {description}
            </SheetDescription>
          ) : null}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        <div className="shrink-0 space-y-2 border-t border-border/60 bg-muted/20 px-5 py-3">
          {onAskChanakya ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-full gap-1.5 border-violet-500/30 bg-violet-500/5 text-xs text-violet-900 hover:bg-violet-500/10 dark:text-violet-100"
              onClick={onAskChanakya}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask Chanakya
            </Button>
          ) : null}
          {footer}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full gap-1.5 text-xs text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-3.5 w-3.5" />
            Close workspace
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
