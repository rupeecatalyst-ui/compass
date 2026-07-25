"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Compact tab chrome with inline Edit affordance — RM stays in Strategic Workspace.
 */
export function StrategicTabToolbar({
  title,
  description,
  editing,
  onEditToggle,
  editLabel = "Modify",
  className,
  children,
}: {
  title: string;
  description?: string;
  editing?: boolean;
  onEditToggle?: () => void;
  editLabel?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-2",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-zinc-50">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">{description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {children}
        {onEditToggle ? (
          <Button
            type="button"
            size="sm"
            variant={editing ? "secondary" : "outline"}
            className="h-7 gap-1 border-white/15 bg-zinc-900/60 px-2.5 text-[11px]"
            onClick={onEditToggle}
          >
            <Pencil className="h-3 w-3" />
            {editing ? "Done" : editLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
