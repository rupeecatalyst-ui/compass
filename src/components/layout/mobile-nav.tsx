"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import {
  allNavigationGroups,
  getContextDomainByKey,
  isNavHrefActive,
} from "@/config/navigation";
import { filterNavigationByRole } from "@/lib/navigation-utils";
import { useAuthContext } from "@/components/providers/auth-provider";
import { CatalystBranding } from "@/components/catalyst-one/catalyst-branding";
import { SidebarNavItem } from "@/components/layout/sidebar-nav-item";
import { useSidebar } from "@/hooks/use-sidebar";
import { useSidebarContext } from "@/components/providers/sidebar-provider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { UserProfile } from "@/components/layout/user-profile";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const { mobileOpen, closeMobile } = useSidebar();
  const { activeContextKey } = useSidebarContext();
  const { user } = useAuthContext();
  const visibleNavigation = filterNavigationByRole(allNavigationGroups, user?.role);
  const contextDomain = activeContextKey
    ? getContextDomainByKey(activeContextKey)
    : undefined;

  return (
    <Sheet open={mobileOpen} onOpenChange={(open) => !open && closeMobile()}>
      <SheetContent side="left" className="w-[min(100vw,20rem)] p-0 bg-sidebar">
        <SheetHeader className="flex flex-row items-center justify-between border-b border-sidebar-border px-4 py-4">
          <CatalystBranding variant="sidebar" />
          <Button variant="ghost" size="icon" onClick={closeMobile}>
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>
        <ScrollArea className="flex-1 p-4">
          <nav className="space-y-4">
            {visibleNavigation.map((group) => (
              <div key={group.title}>
                {!group.hideTitle && (
                  <p className="mb-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {group.title}
                  </p>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <SidebarNavItem
                      key={`${item.expandableKey ?? item.href}-${item.title}`}
                      item={item}
                      collapsed={false}
                      onNavigate={closeMobile}
                    />
                  ))}
                </div>
              </div>
            ))}

            {contextDomain ? (
              <div className="rounded-lg border border-sidebar-border/80 bg-sidebar-accent/20 p-2">
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {contextDomain.title} · Context
                </p>
                <div className="space-y-0.5">
                  {(contextDomain.children?.length ?? 0) === 0 ? (
                    <p className="px-2 py-2 text-[11px] text-muted-foreground">
                      Modules coming soon.
                    </p>
                  ) : (
                    contextDomain.children?.map((child) => (
                      <div key={child.href + child.title}>
                        {child.separatorBefore ? (
                          <div className="my-1.5 border-t border-sidebar-border/70" />
                        ) : null}
                        <Link
                          href={child.href}
                          onClick={closeMobile}
                          className={cn(
                            "block rounded-md px-2 py-1.5 text-[12px] font-medium",
                            isNavHrefActive(pathname, child.href)
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                          )}
                        >
                          {child.title}
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </nav>
        </ScrollArea>
        <div className="border-t border-sidebar-border p-4">
          <UserProfile />
        </div>
      </SheetContent>
    </Sheet>
  );
}
