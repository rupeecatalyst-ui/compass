"use client";

import Link from "next/link";
import {
  Bell,
  Boxes,
  FileText,
  History,
  Radar,
  Shield,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import type { QuickAction } from "../types";
import { cn } from "../../shared/cn";

const ICONS: Record<string, LucideIcon> = {
  Radar,
  Bell,
  Shield,
  History,
  Boxes,
  FileText,
  Terminal,
};

export function QuickActionButton({ action }: { action: QuickAction }) {
  const Icon = ICONS[action.icon] ?? FileText;

  return (
    <Link
      href={action.href}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 transition-colors",
        "hover:border-zinc-600 hover:bg-zinc-900",
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 group-hover:text-zinc-50">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-zinc-100">{action.label}</span>
        {action.description && (
          <span className="block truncate text-[11px] text-zinc-500">{action.description}</span>
        )}
      </span>
    </Link>
  );
}
