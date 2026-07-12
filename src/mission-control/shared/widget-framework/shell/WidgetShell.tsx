"use client";

import type { ReactNode } from "react";
import { cn } from "../../cn";
import type { MissionControlWidget, WidgetToolbarAction } from "../contracts";
import type { WidgetLoadState } from "../types";

export function WidgetShell({
  widget,
  state = "ready",
  children,
  footer,
  emptyTitle = "No data",
  emptyDescription = "This widget has nothing to display.",
  errorMessage = "Unable to load this widget.",
  className,
  onToolbarAction,
}: {
  widget: MissionControlWidget;
  state?: WidgetLoadState;
  children?: ReactNode;
  footer?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  errorMessage?: string;
  className?: string;
  /** Toolbar actions are inert unless a handler is provided */
  onToolbarAction?: (action: WidgetToolbarAction) => void;
}) {
  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-sm shadow-black/20",
        className,
      )}
      aria-labelledby={`widget-title-${widget.id}`}
      data-widget-id={widget.id}
      data-widget-category={widget.category}
      data-widget-size={widget.size}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            {widget.category}
          </p>
          <h2
            id={`widget-title-${widget.id}`}
            className="truncate text-sm font-semibold text-zinc-50"
          >
            {widget.title}
          </h2>
        </div>
        {(widget.toolbarActions?.length ?? 0) > 0 && (
          <div
            className="flex flex-wrap gap-1"
            role="toolbar"
            aria-label={`${widget.title} toolbar`}
          >
            {widget.toolbarActions!.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={action.disabled ?? true}
                onClick={() => onToolbarAction?.(action)}
                className="rounded-md border border-zinc-800 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500 outline-none transition-colors hover:border-zinc-700 hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`${action.label} (placeholder)`}
                title="Placeholder toolbar action"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-3 md:p-4">
        {state === "loading" && (
          <div
            className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-8 text-center text-xs text-zinc-500"
            role="status"
            aria-live="polite"
          >
            Loading {widget.title}…
          </div>
        )}
        {state === "empty" && (
          <div
            className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 px-3 py-8 text-center"
            role="status"
          >
            <p className="text-sm font-medium text-zinc-300">{emptyTitle}</p>
            <p className="mt-1 text-xs text-zinc-500">{emptyDescription}</p>
          </div>
        )}
        {state === "error" && (
          <div
            className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-8 text-center"
            role="alert"
          >
            <p className="text-sm font-medium text-rose-200">{errorMessage}</p>
          </div>
        )}
        {(state === "ready" || state === "idle") && children}
      </div>

      {(footer || widget.provider) && (
        <footer className="border-t border-zinc-800/80 px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-600">
          {footer ?? <>Provider · {widget.provider}</>}
        </footer>
      )}
    </section>
  );
}
