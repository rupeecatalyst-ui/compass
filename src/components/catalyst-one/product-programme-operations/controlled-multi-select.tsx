"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string };

export function ControlledMultiSelect({
  label,
  values,
  options,
  onChange,
  disabled,
}: {
  label: string;
  values: string[];
  options: readonly Option[] | Option[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) || option.id.toLowerCase().includes(q),
    );
  }, [options, query]);

  function toggle(id: string) {
    if (disabled) return;
    onChange(values.includes(id) ? values.filter((item) => item !== id) : [...values, id]);
  }

  return (
    <div className="space-y-2" data-testid={`multi-select-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      <p className="text-sm font-medium">{label}</p>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Search ${label.toLowerCase()}`}
        disabled={disabled}
      />
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-2">
        {filtered.map((option) => {
          const selected = values.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(option.id)}
              className={cn(
                "flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm",
                selected ? "bg-accent text-accent-foreground" : "hover:bg-muted",
              )}
            >
              <span>{option.label}</span>
              {selected ? <span className="text-xs">Selected</span> : null}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1">
        {values.map((id) => (
          <Button
            key={id}
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => toggle(id)}
          >
            {options.find((option) => option.id === id)?.label ?? id} ×
          </Button>
        ))}
      </div>
    </div>
  );
}
