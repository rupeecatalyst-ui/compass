"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, X } from "lucide-react";
import { mainNavigation } from "@/config/navigation";
import { useSidebar } from "@/hooks/use-sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserProfile } from "@/components/layout/user-profile";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const { mobileOpen, closeMobile } = useSidebar();

  return (
    <Sheet open={mobileOpen} onOpenChange={(open) => !open && closeMobile()}>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar">
        <SheetHeader className="flex flex-row items-center justify-between border-b border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Compass className="h-4 w-4 text-primary-foreground" />
            </div>
            <SheetTitle>COMPASS</SheetTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={closeMobile}>
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>
        <nav className="flex-1 p-4 space-y-1">
          {mainNavigation.flatMap((group) =>
            group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === item.href
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
