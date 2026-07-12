"use client";

import { Search, X } from "lucide-react";
import { cn } from "../../shared/cn";

export function SearchBar({
  value,
  onChange,
  onSubmit,
  className,
  placeholder = "Search Catalyst One…",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <form
      className={cn(
        "flex items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-950/90 px-3 py-2.5 shadow-[0_0_0_1px_rgba(45,212,191,0.06)] focus-within:border-teal-500/40",
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      role="search"
    >
      <Search className="h-4 w-4 shrink-0 text-teal-300/80" aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Enterprise search"
        className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
        autoComplete="off"
        spellCheck={false}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded-md p-1 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <kbd className="hidden rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-500 sm:inline">
          ⌘K
        </kbd>
      )}
    </form>
  );
}
