"use client";

import Link from "next/link";
import {
  Activity,
  Bell,
  Bot,
  Boxes,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  History,
  LayoutDashboard,
  Radar,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { getMissionControlNavigationItems } from "../navigation";
import { cn } from "../shared/cn";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Briefcase,
  Radar,
  Bell,
  Search,
  Shield,
  Activity,
  Bot,
  SlidersHorizontal,
  Terminal,
  History,
  Boxes,
  FileSearch,
  Settings,
};

export function McNavigationRail({
  collapsed,
  onToggle,
  activeHref,
}: {
  collapsed: boolean;
  onToggle: () => void;
  activeHref: string;
}) {
  const items = getMissionControlNavigationItems();

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 transition-[width] duration-200",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <div className="flex h-11 items-center justify-end border-b border-zinc-800 px-2">
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {items.map((item) => {
          const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
          const active =
            item.href === "/mission-control"
              ? activeHref === item.href
              : activeHref === item.href || activeHref.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.id}
              href={item.href}
              title={item.label}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-2 text-xs transition-colors",
                active
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
