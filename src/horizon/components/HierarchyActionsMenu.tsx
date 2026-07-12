"use client";

import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { HorizonNodeKind } from "../types";

export type HierarchyActionId =
  | "open_detail"
  | "add_child"
  | "park"
  | "mark_waiting"
  | "placeholder";

/**
 * Context / overflow menu for hierarchy nodes — placeholder actions only.
 */
export function HierarchyActionsMenu({
  kind,
  label,
  onAction,
  className,
}: {
  kind: HorizonNodeKind;
  label: string;
  onAction?: (action: HierarchyActionId) => void;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-zinc-500 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200",
            className,
          )}
          aria-label={`Actions for ${label}`}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 border-zinc-800 bg-zinc-950 text-zinc-100"
      >
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-zinc-500">
          {kind}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem
          className="cursor-pointer focus:bg-zinc-900 focus:text-zinc-50"
          onClick={() => onAction?.("open_detail")}
        >
          Open detail
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer focus:bg-zinc-900 focus:text-zinc-50"
          onClick={() => onAction?.("add_child")}
        >
          Add child (placeholder)
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer focus:bg-zinc-900 focus:text-zinc-50"
          onClick={() => onAction?.("park")}
        >
          Send to parking lot
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer focus:bg-zinc-900 focus:text-zinc-50"
          onClick={() => onAction?.("mark_waiting")}
        >
          Mark waiting on
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
