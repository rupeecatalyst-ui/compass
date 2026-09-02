"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MY_DEALS_KANBAN_DEFAULT_FIELD_IDS,
  MY_DEALS_KANBAN_FIELDS,
  type MyDealsKanbanFieldId,
} from "@/constants/my-deals-kanban";
import { hasMinimumRole } from "@/lib/permissions";
import type { Role } from "@/constants/roles";
import { ROLE_HIERARCHY, ROLES } from "@/constants/roles";
import { cn } from "@/lib/utils";

export function MyDealsKanbanFieldsControl({
  role,
  selectedFieldIds,
  onApply,
}: {
  role?: string | null;
  selectedFieldIds: MyDealsKanbanFieldId[];
  onApply: (next: MyDealsKanbanFieldId[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MyDealsKanbanFieldId[]>(selectedFieldIds);
  const actorRole = (role && role in ROLE_HIERARCHY ? role : ROLES.VIEWER) as Role;

  const visibleCatalog = useMemo(
    () =>
      MY_DEALS_KANBAN_FIELDS.filter(
        (field) => !field.minRole || hasMinimumRole(actorRole, field.minRole),
      ),
    [actorRole],
  );

  const openPanel = () => {
    setDraft(selectedFieldIds);
    setOpen(true);
  };

  const toggle = (id: MyDealsKanbanFieldId) => {
    setDraft((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  return (
    <div className="relative" data-surface="my-deals-kanban-fields">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 gap-1 px-2 text-[11px]"
        onClick={openPanel}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Kanban Fields
      </Button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-[min(100vw-2rem,22rem)] rounded-lg border border-zinc-700 bg-zinc-950 p-3 shadow-xl">
          <p className="text-[11px] font-semibold text-zinc-200">Optional card fields</p>
          <p className="mt-0.5 text-[10px] text-zinc-500">
            Customer, lender, product and amount stay visible.
          </p>
          <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
            {visibleCatalog.map((field) => {
              const checked = draft.includes(field.id);
              return (
                <label
                  key={field.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[11px] text-zinc-300 hover:bg-zinc-900",
                    field.defaultVisible ? "font-medium" : "",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(field.id)}
                    className="accent-teal-500"
                  />
                  {field.label}
                  {field.defaultVisible ? (
                    <span className="ml-auto text-[9px] uppercase tracking-wide text-zinc-500">
                      Default
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px]"
              onClick={() => setDraft(visibleCatalog.map((f) => f.id))}
            >
              Select All
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px]"
              onClick={() =>
                setDraft(
                  visibleCatalog.filter((f) => f.defaultVisible).map((f) => f.id),
                )
              }
            >
              Clear Optional Fields
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px]"
              onClick={() => setDraft([...MY_DEALS_KANBAN_DEFAULT_FIELD_IDS])}
            >
              Restore Default
            </Button>
            <Button
              type="button"
              size="sm"
              className="ml-auto h-6 px-2 text-[10px]"
              onClick={() => {
                onApply(draft);
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
