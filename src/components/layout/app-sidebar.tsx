"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { allNavigationGroups, recentPages, favoritePages, pinnedPages } from "@/config/navigation";
import { filterNavigationByRole } from "@/lib/navigation-utils";
import { useAuthContext } from "@/components/providers/auth-provider";
import { CatalystBranding } from "@/components/catalyst-one/catalyst-branding";
import { useSidebar } from "@/hooks/use-sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserProfile } from "@/components/layout/user-profile";
import { Separator } from "@/components/ui/separator";

interface AppSidebarProps {
  onSearchClick?: () => void;
}

export function AppSidebar({ onSearchClick }: AppSidebarProps) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const { user } = useAuthContext();
  const visibleNavigation = filterNavigationByRole(allNavigationGroups, user?.role);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="hidden md:flex h-screen flex-col border-r border-sidebar-border bg-sidebar shrink-0"
    >
      {/* Branding */}
      <div className="flex h-16 items-center px-4 border-b border-sidebar-border">
        {collapsed ? (
          <div className="flex h-9 w-9 mx-auto items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <span className="text-xs font-bold text-white">C1</span>
          </div>
        ) : (
          <CatalystBranding variant="sidebar" />
        )}
      </div>

      {/* Search */}
      <div className="p-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start gap-2 text-muted-foreground bg-sidebar-accent/30 border-sidebar-border",
                collapsed && "px-0 justify-center",
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
        {/* Pinned */}
        {!collapsed && pinnedPages.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Pinned
            </p>
            {pinnedPages.map((page) => (
              <NavLink key={page.href} href={page.href} icon={page.icon} label={page.title} active={pathname === page.href} collapsed={collapsed} />
            ))}
          </div>
        )}

        {/* Main Navigation */}
        {visibleNavigation.map((group) => (
          <div key={group.title} className="mb-4">
            {!collapsed && (
              <p className="mb-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {group.title}
              </p>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.title}
                badge={item.badge}
                active={
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    item.href !== "/organization" &&
                    pathname.startsWith(item.href))
                }
                collapsed={collapsed}
              />
            ))}
          </div>
        ))}

        {!collapsed && (
          <>
            <Separator className="my-4" />
            <div className="mb-4">
              <p className="mb-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Star className="h-3 w-3" /> Favorites
              </p>
              {favoritePages.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                  {page.title}
                </Link>
              ))}
            </div>
            <div className="mb-4">
              <p className="mb-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-3 w-3" /> Recent
              </p>
              {recentPages.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {page.title}
                </Link>
              ))}
            </div>
          </>
        )}
      </ScrollArea>

      {/* User Profile & Collapse */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <UserProfile collapsed={collapsed} />
        <Button
          variant="ghost"
          size="sm"
          className={cn("w-full", collapsed ? "px-0 justify-center" : "justify-start")}
          onClick={toggle}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span className="ml-2">Collapse</span>}
        </Button>
      </div>
    </motion.aside>
  );
}

interface NavLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  active: boolean;
  collapsed: boolean;
}

function NavLink({ href, icon: Icon, label, badge, active, collapsed }: NavLinkProps) {
  const content = (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-all",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          {badge && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{badge}</span>
          )}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
