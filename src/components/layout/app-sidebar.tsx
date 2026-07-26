"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Pin,
  Search,
  Star,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { allNavigationGroups, recentPages, favoritePages } from "@/config/navigation";
import { ROUTES } from "@/constants/routes";
import { filterNavigationByRole } from "@/lib/navigation-utils";
import { useAuthContext } from "@/components/providers/auth-provider";
import { CatalystBranding } from "@/components/catalyst-one/catalyst-branding";
import { ANIMATION } from "@/constants/animations";
import {
  SIDEBAR_EDGE_HOVER_PX,
  SIDEBAR_NAV_MODE_LABEL,
  SIDEBAR_NAV_MODES,
  type SidebarNavMode,
} from "@/constants/sidebar-navigation";
import { useSidebar } from "@/hooks/use-sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserProfile } from "@/components/layout/user-profile";
import { Separator } from "@/components/ui/separator";
import { SidebarNavItem } from "@/components/layout/sidebar-nav-item";

interface AppSidebarProps {
  onSearchClick?: () => void;
}

export function AppSidebar({ onSearchClick }: AppSidebarProps) {
  const {
    collapsed,
    toggle,
    navMode,
    setNavMode,
    noteNavInteraction,
    setPeekOpen,
    schedulePeekLeave,
    cancelPeekLeave,
    peekOpen,
  } = useSidebar();
  const { user } = useAuthContext();
  const visibleNavigation = filterNavigationByRole(allNavigationGroups, user?.role);

  const onNavPointerEnter = () => {
    noteNavInteraction();
    cancelPeekLeave();
    if (navMode === "auto" && collapsed) {
      setPeekOpen(true);
    }
  };

  const onNavPointerLeave = () => {
    // Only re-collapse temporary Auto peeks — do not collapse during the initial expanded period
    if (navMode === "auto" && peekOpen) {
      schedulePeekLeave();
    }
  };

  return (
    <>
      {/* Auto mode — left-edge hover strip to peek navigation */}
      {navMode === "auto" && collapsed ? (
        <div
          aria-hidden
          className="fixed left-0 top-0 z-[45] hidden h-screen md:block"
          style={{ width: SIDEBAR_EDGE_HOVER_PX }}
          onPointerEnter={() => {
            cancelPeekLeave();
            setPeekOpen(true);
            noteNavInteraction();
          }}
        />
      ) : null}

      <motion.aside
        initial={false}
        animate={{
          width: collapsed
            ? ANIMATION.sidebar.collapsed.width
            : ANIMATION.sidebar.expanded.width,
        }}
        transition={ANIMATION.sidebar.transition}
        className="hidden h-screen shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar md:flex"
        onPointerEnter={onNavPointerEnter}
        onPointerLeave={onNavPointerLeave}
        onFocusCapture={noteNavInteraction}
        onClickCapture={noteNavInteraction}
      >
        {/* Branding — always returns to User Home Dashboard */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          {collapsed ? (
            <Link
              href={ROUTES.DASHBOARD}
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent"
              aria-label="Rupee Catalyst — User Home Dashboard"
              title="Go to User Home Dashboard"
            >
              <span className="text-xs font-bold text-white">C1</span>
            </Link>
          ) : (
            <Link
              href={ROUTES.DASHBOARD}
              className="min-w-0 block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              aria-label="Rupee Catalyst — User Home Dashboard"
              title="Go to User Home Dashboard"
            >
              <CatalystBranding variant="sidebar" />
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start gap-2 border-sidebar-border bg-sidebar-accent/30 text-muted-foreground",
                  collapsed && "justify-center px-0",
                )}
                onClick={onSearchClick}
              >
                <Search className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left text-sm">Search...</span>
                    <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                      ⌘K
                    </kbd>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Search (⌘K)</TooltipContent>}
          </Tooltip>
        </div>

        <ScrollArea className="flex-1 px-3">
          {visibleNavigation.map((group, index) => (
            <div key={group.title} className="mb-4">
              {!collapsed && index > 0 && <Separator className="mb-4" />}
              {!collapsed && !group.hideTitle && (
                <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarNavItem
                    key={`${item.expandableKey ?? item.href}-${item.title}`}
                    item={item}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          ))}

          {!collapsed && (
            <>
              <Separator className="my-4" />
              <div className="mb-4">
                <p className="mb-2 flex items-center gap-1 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Star className="h-3 w-3" /> Favorites
                </p>
                {favoritePages.map((page) => (
                  <Link
                    key={page.href}
                    href={page.href}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                    {page.title}
                  </Link>
                ))}
              </div>
              <div className="mb-4">
                <p className="mb-2 flex items-center gap-1 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3 w-3" /> Recent
                </p>
                {recentPages.map((page) => (
                  <Link
                    key={page.href}
                    href={page.href}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {page.title}
                  </Link>
                ))}
              </div>
            </>
          )}
        </ScrollArea>

        {/* User Profile · Mode · Collapse */}
        <div className="space-y-2 border-t border-sidebar-border p-3">
          <UserProfile collapsed={collapsed} />

          {!collapsed ? (
            <div
              className="flex rounded-lg border border-sidebar-border bg-sidebar-accent/20 p-0.5"
              role="group"
              aria-label="Navigation mode"
            >
              {SIDEBAR_NAV_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setNavMode(mode as SidebarNavMode)}
                  className={cn(
                    "flex-1 rounded-md px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                    navMode === mode
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:text-sidebar-foreground",
                  )}
                >
                  {SIDEBAR_NAV_MODE_LABEL[mode]}
                </button>
              ))}
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center px-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                  onClick={() => {
                    const idx = SIDEBAR_NAV_MODES.indexOf(navMode);
                    const next = SIDEBAR_NAV_MODES[(idx + 1) % SIDEBAR_NAV_MODES.length];
                    setNavMode(next);
                  }}
                  aria-label={`Navigation mode: ${SIDEBAR_NAV_MODE_LABEL[navMode]}. Click to cycle.`}
                >
                  {navMode === "auto" ? "A" : navMode === "expanded" ? "E" : "C"}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Mode: {SIDEBAR_NAV_MODE_LABEL[navMode]} (click to cycle)
              </TooltipContent>
            </Tooltip>
          )}

          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full", collapsed ? "justify-center px-0" : "justify-start")}
            onClick={toggle}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
            {!collapsed && <span className="ml-2">{collapsed ? "Expand" : "Collapse"}</span>}
          </Button>
        </div>
      </motion.aside>
    </>
  );
}
