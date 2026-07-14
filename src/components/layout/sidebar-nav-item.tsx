
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarExpanded } from "@/hooks/use-sidebar-expanded";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { NavItem } from "@/config/navigation";

import { ROUTES } from "@/constants/routes";

function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard" || href === "/organization" || href === ROUTES.ADMIN_CREDIT_RISK_ENGINE || href === ROUTES.ADMIN_ARCHITECTURE || href === ROUTES.ADMIN_WORKFLOW_ENGINE || href === ROUTES.ADMIN_PRODUCT_LIBRARY || href === ROUTES.ADMIN_ENTERPRISE_ASSETS || href === ROUTES.ADMIN_FOUNDATION_LIBRARIES || href === ROUTES.ADMIN_UNIVERSAL_GUIDED_JOURNEY) return false;
  return pathname.startsWith(href.split("?")[0]!);
}

interface SidebarNavItemProps {
  item: NavItem;
  collapsed: boolean;
}

export function SidebarNavItem({ item, collapsed }: SidebarNavItemProps) {
  const pathname = usePathname();
  const { isExpanded, toggle } = useSidebarExpanded();
  const hasChildren = Boolean(item.children?.length && item.expandableKey);
  const expanded = item.expandableKey ? isExpanded(item.expandableKey) : false;
  const active =
    isNavActive(pathname, item.href) ||
    item.children?.some((child) => isNavActive(pathname, child.href));

  const Icon = item.icon;

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            className={cn(
              "flex items-center justify-center rounded-lg px-0 py-2 text-sm font-medium transition-all",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    );
  }

  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-all",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1">{item.title}</span>
        {item.badge && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{item.badge}</span>
        )}
      </Link>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-0.5">
        <Link
          href={item.href}
          className={cn(
            "flex flex-1 items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-all min-w-0",
            active
              ? "bg-sidebar-accent/80 text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">{item.title}</span>
          {item.badge && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{item.badge}</span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => item.expandableKey && toggle(item.expandableKey)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          aria-label={`Toggle ${item.title} menu`}
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>
      {expanded && item.children && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                "block rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                isNavActive(pathname, child.href)
                  ? "text-sidebar-accent-foreground bg-sidebar-accent/60"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/30",
              )}
            >
              {child.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
