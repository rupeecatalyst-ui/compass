"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Inline editing architecture — local edit state only.
 * Persistence / business rules are out of scope for this sprint.
 */
export function InlineEditableText({
  value,
  onCommit,
  className,
  inputClassName,
  multiline,
  ariaLabel,
}: {
  value: string;
  onCommit?: (next: string) => void;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value) onCommit?.(trimmed || value);
  };

  if (!editing) {
    return (
      <button
        type="button"
        className={cn(
          "rounded-sm text-left transition hover:bg-zinc-800/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/50",
          className,
        )}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        aria-label={`Edit ${ariaLabel}`}
      >
        {value || "—"}
      </button>
    );
  }

  if (multiline) {
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        aria-label={ariaLabel}
        className={cn(
          "w-full resize-none rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-teal-500/50",
          inputClassName,
        )}
        rows={3}
      />
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      aria-label={ariaLabel}
      className={cn(
        "w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-teal-500/50",
        inputClassName,
      )}
    />
  );
}
