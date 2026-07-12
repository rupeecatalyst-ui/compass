"use client";

import { X } from "lucide-react";
import { allNavigationGroups } from "@/config/navigation";
import { filterNavigationByRole } from "@/lib/navigation-utils";
import { useAuthContext } from "@/components/providers/auth-provider";
import { CatalystBranding } from "@/components/catalyst-one/catalyst-branding";
import { SidebarNavItem } from "@/components/layout/sidebar-nav-item";
import { useSidebar } from "@/hooks/use-sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { UserProfile } from "@/components/layout/user-profile";

export function MobileNav() {
  const { mobileOpen, closeMobile } = useSidebar();
  const { user } = useAuthContext();
  const visibleNavigation = filterNavigationByRole(allNavigationGroups, user?.role);

  return (
    <Sheet open={mobileOpen} onOpenChange={(open) => !open && closeMobile()}>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar">
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
                <p className="mb-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <div key={item.href + item.title} onClick={closeMobile}>
                      <SidebarNavItem item={item} collapsed={false} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>
        <div className="border-t border-sidebar-border p-4">
          <UserProfile />
        </div>
      </SheetContent>
    </Sheet>
  );
}
