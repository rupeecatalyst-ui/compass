"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  isContextDomain,
  isNavHrefActive,
  type NavItem,
} from "@/config/navigation";
import { useSidebarContext } from "@/components/providers/sidebar-provider";
import {
  clearActiveOpportunityContext,
  isTransactionContextRoute,
} from "@/lib/lead-opportunity-journey/active-context";

function onMainNavClick(href: string, onNavigate?: () => void) {
  if (!href || href === "#") return;
  if (isTransactionContextRoute(href.split("?")[0] ?? href)) {
    clearActiveOpportunityContext();
  }
  onNavigate?.();
}

interface SidebarNavItemProps {
  item: NavItem;
  collapsed: boolean;
  /** Called when a navigable link is activated (e.g. close mobile sheet). */
  onNavigate?: () => void;
}

/**
 * Column 1 primary nav item.
 * Context domains open Column 2 — they never expand the primary sidebar.
 */
export function SidebarNavItem({ item, collapsed, onNavigate }: SidebarNavItemProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    activeContextKey,
    openContextDomain,
    clearContextDomain,
    setContextPanelCollapsed,
  } = useSidebarContext();

  const isDomain = isContextDomain(item);
  const childActive =
    item.children?.some((child) => isNavHrefActive(pathname, child.href)) ?? false;
  const contextSelected = Boolean(
    isDomain && item.expandableKey && activeContextKey === item.expandableKey,
  );
  const active =
    (!isDomain && isNavHrefActive(pathname, item.href)) || childActive || contextSelected;

  const Icon = item.icon;

  const activateContextDomain = () => {
    if (!item.expandableKey) return;
    openContextDomain(item.expandableKey);
    setContextPanelCollapsed(false);
    const first = item.children?.[0];
    if (first && !childActive) {
      onMainNavClick(first.href, onNavigate);
      router.push(first.href);
    } else {
      onNavigate?.();
    }
  };

  if (collapsed) {
    if (isDomain) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={activateContextDomain}
              className={cn(
                "flex w-full items-center justify-center rounded-lg px-0 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
              )}
              aria-label={item.title}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            onClick={() => {
              clearContextDomain();
              onMainNavClick(item.href, onNavigate);
            }}
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

  if (isDomain) {
    return (
      <button
        type="button"
        onClick={activateContextDomain}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-all",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
        )}
        aria-pressed={contextSelected}
        aria-label={`${item.title} — open context navigation`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left truncate">{item.title}</span>
        <PanelRight
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            contextSelected ? "text-primary" : "text-muted-foreground",
          )}
          aria-hidden
        />
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={() => {
        clearContextDomain();
        onMainNavClick(item.href, onNavigate);
      }}
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
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
          {item.badge}
        </span>
      )}
    </Link>
  );
}
