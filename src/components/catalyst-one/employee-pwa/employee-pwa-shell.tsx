"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Briefcase,
  Plus,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { EmployeePwaRegisterSw } from "@/components/catalyst-one/employee-pwa/employee-pwa-register-sw";
import { cn } from "@/lib/utils";
import { EMPLOYEE_PWA_OFFLINE_MUTATION_BLOCKED } from "@/constants/employee-pwa";

const TABS = [
  { id: "home", href: "/pwa", label: "Home", icon: Home, exact: true, center: false },
  { id: "work", href: "/pwa/work", label: "Work", icon: Briefcase, exact: false, center: false },
  { id: "create", href: "/pwa/create", label: "Create", icon: Plus, exact: false, center: true },
  { id: "chanakya", href: "/pwa/chanakya", label: "CHANAKYA", icon: Sparkles, exact: false, center: false },
  { id: "more", href: "/pwa/more", label: "More", icon: MoreHorizontal, exact: false, center: false },
] as const;

export function EmployeePwaShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/pwa";
  const [online, setOnline] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add("employee-pwa-active");
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      document.documentElement.classList.remove("employee-pwa-active");
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <AuthGuard>
      <EmployeePwaRegisterSw />
      <div
        data-employee-pwa-shell="true"
        className="employee-pwa-shell mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background text-foreground"
      >
        {!online ? (
          <div
            role="status"
            data-employee-pwa-offline-banner="true"
            className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs text-amber-950 dark:text-amber-50"
          >
            {EMPLOYEE_PWA_OFFLINE_MUTATION_BLOCKED}
          </div>
        ) : null}
        <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
        <nav
          aria-label="Catalyst One PWA"
          data-employee-pwa-bottom-nav="true"
          className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        >
          <ul className="grid grid-cols-5 items-end px-1 py-1">
            {TABS.map((tab) => {
              const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              const Icon = tab.icon;
              return (
                <li key={tab.id} className="flex justify-center">
                  <Link
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      tab.center
                        ? "-mt-5 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow"
                        : active
                          ? "text-primary"
                          : "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </AuthGuard>
  );
}
