"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ARCHITECTURE_NAV } from "@/config/architecture-navigation";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

function isArchitectureNavActive(pathname: string, href: string): boolean {
  if (href === ROUTES.ADMIN_ARCHITECTURE) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ArchitectureSideNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Architecture navigation"
      className={cn(
        "flex h-full w-full flex-col border-r border-border/60 bg-muted/10",
        className,
      )}
    >
      <div className="shrink-0 border-b border-border/60 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          CARB · Architecture
        </p>
      </div>
      <ScrollArea className="flex-1">
        <ul className="space-y-0.5 p-2">
          {ARCHITECTURE_NAV.map((item) => {
            const active = isArchitectureNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </nav>
  );
}
