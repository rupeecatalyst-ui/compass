"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { searchCities, getCityLabel, type CityMasterEntry } from "@/constants/city-master";
import {
  ENTERPRISE_SEARCH_DROPDOWN_LIST_CLASS,
  ENTERPRISE_SEARCH_DROPDOWN_PANEL_CLASS,
  ENTERPRISE_SEARCH_MAX_RESULTS,
} from "@/constants/enterprise-search-autocomplete";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CitySelectProps {
  city?: string;
  state?: string;
  onSelect: (entry: CityMasterEntry) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

/** Searchable city picker — Enterprise Search Autocomplete standard. Selecting a city also supplies state. */
export function CitySelect({
  city,
  state,
  onSelect,
  placeholder = "Search city...",
  className,
  inputClassName,
}: CitySelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(
    () => searchCities(query).slice(0, ENTERPRISE_SEARCH_MAX_RESULTS),
    [query],
  );
  const selectedLabel = getCityLabel(city, state);
  const searching = open || query.trim().length > 0;
  const showList = open && query.trim().length > 0;
  const displayValue = searching ? query : selectedLabel ?? "";

  const closeList = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closeList();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeList();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative space-y-1", className)}>
      <Input
        ref={inputRef}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        className={cn("h-8 text-xs", inputClassName)}
        placeholder={placeholder}
        value={displayValue}
        autoComplete="off"
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(next.trim().length > 0);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(false);
        }}
      />
      {showList ? (
        <div
          id={listId}
          role="listbox"
          className={ENTERPRISE_SEARCH_DROPDOWN_PANEL_CLASS}
          data-surface="enterprise-search-autocomplete"
        >
          <div className={ENTERPRISE_SEARCH_DROPDOWN_LIST_CLASS}>
            {results.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No city found.</p>
            ) : (
              results.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  role="option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(entry);
                    closeList();
                    window.requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted/60",
                    city === entry.city && state === entry.state && "bg-muted/40",
                  )}
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      city === entry.city && state === entry.state
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{entry.city}</span>
                  <span className="shrink-0 text-muted-foreground">{entry.state}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
