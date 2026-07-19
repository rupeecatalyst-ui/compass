"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { ContextNavigationPanel } from "@/components/layout/context-navigation-panel";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { pageVariants } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Three-column Enterprise Context Navigation:
 * Column 1 Primary · Column 2 Context Panel · Column 3 Workspace
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { open, setOpen } = useCommandPalette();
  const pathname = usePathname();
  const isFullWidth =
    pathname.startsWith("/loan-files") ||
    pathname.startsWith("/admin/credit-risk-engine") ||
    pathname.startsWith("/admin/architecture") ||
    pathname.startsWith("/admin/workflow-engine") ||
    pathname.startsWith("/admin/product-library") ||
    pathname.startsWith("/admin/enterprise-assets") ||
    pathname === "/dashboard" ||
    pathname === "/chanakya-radar" ||
    pathname === "/my-deals" ||
    pathname === "/pipeline" ||
    pathname === "/customers";

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar onSearchClick={() => setOpen(true)} />
        <ContextNavigationPanel />
        <MobileNav />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <AppTopbar onSearchClick={() => setOpen(true)} />
          <main
            className={cn(
              "min-h-0 flex-1 overflow-y-auto scrollbar-thin",
              pathname.startsWith("/loan-files") && "overflow-hidden",
              pathname === "/my-deals" && "overflow-hidden",
              pathname.startsWith("/admin/credit-risk-engine") && "overflow-hidden",
            )}
          >
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className={cn(
                "container mx-auto p-4 md:p-6 lg:p-8",
                !isFullWidth && "max-w-7xl",
                isFullWidth &&
                  pathname.startsWith("/loan-files") &&
                  "max-w-none h-full p-0 md:p-0 lg:p-0",
                isFullWidth &&
                  pathname.startsWith("/admin/credit-risk-engine") &&
                  "max-w-none h-full p-0 md:p-0 lg:p-0",
                isFullWidth &&
                  (pathname === "/dashboard" ||
                    pathname === "/chanakya-radar" ||
                    pathname === "/my-deals" ||
                    pathname === "/pipeline" ||
                    pathname === "/customers") &&
                  "max-w-none",
              )}
            >
              {children}
            </motion.div>
          </main>
        </div>
        <CommandPalette open={open} onOpenChange={setOpen} />
      </div>
    </AuthGuard>
  );
}
