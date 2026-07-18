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
 * Use `premiumOverlay` for Global CHANAKYA: opaque panel + strong backdrop, no bleed-through.
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
  eyebrowLeading,
  allowOutsideClose = false,
  premiumOverlay = false,
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
  /** Optional mark / icon before the eyebrow label. */
  eyebrowLeading?: React.ReactNode;
  allowOutsideClose?: boolean;
  /** Fully opaque drawer + elevated backdrop (Global CHANAKYA). */
  premiumOverlay?: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        allowOutsideClose={allowOutsideClose}
        overlayClassName={
          premiumOverlay
            ? "z-[90] bg-zinc-950/55 backdrop-blur-[2px]"
            : undefined
        }
        className={cn(
          "flex w-full flex-col gap-0 border-l border-border/60 p-0 shadow-2xl",
          premiumOverlay
            ? "z-[91] bg-background sm:max-w-md md:max-w-md"
            : "z-[80] bg-background sm:max-w-xl md:max-w-2xl",
          "data-[state=open]:duration-400",
          className,
        )}
      >
        <SheetHeader
          className={cn(
            "shrink-0 space-y-0.5 border-b border-border/60 pr-12 text-left",
            premiumOverlay
              ? "bg-background px-4 py-3"
              : "bg-gradient-to-r from-background via-background to-teal-500/5 px-5 py-4",
          )}
        >
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700/90 dark:text-teal-300/90">
            {eyebrowLeading}
            <span>
              {eyebrow}
              {entityLabel ? ` · ${entityLabel}` : ""}
            </span>
          </p>
          <SheetTitle
            className={cn(
              "font-semibold tracking-tight text-foreground",
              premiumOverlay ? "text-base" : "text-lg",
            )}
          >
            {title}
          </SheetTitle>
          {description ? (
            <SheetDescription
              className={cn(
                "text-muted-foreground",
                premiumOverlay ? "text-[11px] leading-snug" : "text-xs leading-relaxed",
              )}
            >
              {description}
            </SheetDescription>
          ) : null}
        </SheetHeader>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            premiumOverlay ? "bg-background px-4 py-3" : "px-5 py-4",
          )}
        >
          {children}
        </div>

        <div
          className={cn(
            "shrink-0 space-y-2 border-t border-border/60",
            premiumOverlay ? "bg-muted px-4 py-2.5" : "bg-muted/20 px-5 py-3",
          )}
        >
          {onAskChanakya ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-full gap-1.5 border-violet-500/30 bg-background text-xs text-violet-900 hover:bg-violet-500/10 dark:text-violet-100"
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
