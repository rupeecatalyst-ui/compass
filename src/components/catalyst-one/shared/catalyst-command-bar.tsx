"use client";

import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** CRC-10.2C — Enterprise Command Bar shell (reusable across Catalyst One workspaces). */
export const CatalystCommandBar = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className?: string; "aria-label"?: string }
>(function CatalystCommandBar({ children, className, "aria-label": ariaLabel }, ref) {
  return (
    <div
      ref={ref}
      data-scrolled="false"
      aria-label={ariaLabel ?? "Workspace command bar"}
      className={cn(
        "shrink-0 z-30",
        "glass border-b border-border/60",
        "shadow-sm shadow-black/[0.03] dark:shadow-black/20",
        "transition-[box-shadow] duration-200 ease-out",
        "data-[scrolled=true]:shadow-lg data-[scrolled=true]:shadow-black/8",
        "dark:data-[scrolled=true]:shadow-black/30",
        className,
      )}
    >
      {children}
    </div>
  );
});

/** Pins command bar + scrollable workspace body (header fixed, body scrolls). */
export function WorkspaceCommandBarLayout({
  commandBar,
  children,
  onBodyScroll,
  className,
}: {
  commandBar: ReactNode;
  children: ReactNode;
  onBodyScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden bg-background", className)}>
      {commandBar}
      <div
        onScroll={onBodyScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin"
      >
        {children}
      </div>
    </div>
  );
}

export function attachCommandBarScrollState(
  commandBarEl: HTMLDivElement | null,
  scrollTop: number,
  threshold = 2,
) {
  if (!commandBarEl) return;
  const next = scrollTop > threshold ? "true" : "false";
  if (commandBarEl.dataset.scrolled !== next) {
    commandBarEl.dataset.scrolled = next;
  }
}

/** Top identity + actions row. */
export function CommandBarHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "border-b border-border/50 px-5 py-4 sm:px-6 sm:py-4",
        "bg-gradient-to-r from-background/80 via-muted/20 to-background/80",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CommandBarHeaderRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6",
        "pr-6 sm:pr-8 lg:pr-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CommandBarIdentity({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 flex-1", className)}>{children}</div>;
}

export function CommandBarEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground mb-1">
      {children}
    </p>
  );
}

export function CommandBarMetaGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CommandBarMetaField({
  label,
  value,
  mono,
  prominent,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  prominent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div
        className={cn(
          "mt-0.5 truncate text-foreground",
          prominent ? "text-base font-semibold sm:text-lg" : "text-sm font-medium",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </div>
    </div>
  );
}

/** Primary + secondary actions with reserved extension slot. */
export function CommandBarActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex shrink-0 flex-col items-stretch gap-2 sm:items-end lg:pt-0.5", className)}>
      {children}
    </div>
  );
}

export function CommandBarActionGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-2", className)}>
      {children}
    </div>
  );
}

/**
 * Reserved for future: notifications, assign RM, print, share, more (…).
 * Hidden on smaller screens; visible as dashed slot on xl+.
 */
export function CommandBarActionsExtension({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "hidden xl:flex min-h-[2rem] min-w-[10rem] items-center justify-end",
        "rounded-lg border border-dashed border-border/40 bg-muted/10 px-3",
        className,
      )}
      aria-hidden
    />
  );
}

/** Workflow controls row (stage cards, status, etc.). */
export function CommandBarWorkflow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "px-5 py-5 sm:px-6 sm:py-5",
        "bg-gradient-to-b from-muted/20 via-muted/10 to-transparent",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CommandBarWorkflowRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 xl:flex-row xl:items-stretch", className)}>
      {children}
    </div>
  );
}

export function CommandBarWorkflowMain({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid min-w-0 flex-1 grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5", className)}>{children}</div>;
}

/**
 * Reserved for future: workflow progress, SLA badge, Sarathi recommendations, quick actions.
 */
export function CommandBarWorkflowAside({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "hidden xl:flex w-44 2xl:w-56 shrink-0 rounded-xl",
        "border border-dashed border-border/40 bg-muted/10 min-h-[152px]",
        className,
      )}
      aria-hidden
    />
  );
}
