"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function DeskMultiSelect({
  label,
  options,
  selected,
  onChange,
  extraAction,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  selected: string[];
  onChange: (next: string[]) => void;
  extraAction?: { label: string; active: boolean; onToggle: () => void };
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const summary =
    selected.length === 0
      ? "None"
      : selected.length === options.length
        ? "All"
        : `${selected.length} selected`;

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }

  return (
    <div ref={rootRef} className="relative min-w-[9.5rem] text-[11px] text-muted-foreground">
      <span>{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="mt-1 flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-left text-[12px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="truncate">{summary}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="absolute left-0 top-full z-40 mt-1 max-h-64 w-56 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <div className="mb-1 flex gap-1">
            <button
              type="button"
              onClick={() => onChange(options.map((option) => option.id))}
              className="rounded-md px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded-md px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear All
            </button>
          </div>
          {extraAction ? (
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[12px] text-foreground hover:bg-accent hover:text-accent-foreground">
              <input
                type="checkbox"
                checked={extraAction.active}
                onChange={extraAction.onToggle}
                className="accent-primary"
              />
              {extraAction.label}
            </label>
          ) : null}
          {options.map((option) => {
            const checked = selected.includes(option.id);
            return (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[12px] text-foreground hover:bg-accent hover:text-accent-foreground",
                  checked && "bg-accent/40",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option.id)}
                  className="accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="truncate">{option.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
