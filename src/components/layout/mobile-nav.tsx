"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { allNavigationGroups } from "@/config/navigation";
import { filterNavigationByRole } from "@/lib/navigation-utils";
import { useAuthContext } from "@/components/providers/auth-provider";
import { CatalystBranding } from "@/components/catalyst-one/catalyst-branding";
import { useSidebar } from "@/hooks/use-sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { UserProfile } from "@/components/layout/user-profile";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
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
        <nav className="flex-1 p-4 space-y-1">
          {visibleNavigation.flatMap((group) =>
            group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      item.href !== "/organization" &&
                      pathname.startsWith(item.href))
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            )),
          )}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <UserProfile />
        </div>
      </SheetContent>
    </Sheet>
  );
}
