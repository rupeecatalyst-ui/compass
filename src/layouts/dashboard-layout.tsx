"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { DevelopmentOnlyDemoBanner } from "@/components/catalyst-one/shared/development-only-demo-banner";
import { CommandPalette } from "@/components/layout/command-palette";
import { ContextNavigationPanel } from "@/components/layout/context-navigation-panel";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { pageVariants } from "@/lib/animations";
import { purgeClientDemoBusinessDataIfNeeded } from "@/lib/demo-seed";
import { ensureEnterpriseRegistryHydrated } from "@/lib/enterprise-registry/hydrate";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { isEnterpriseRegistryDocumentScrollPath, isEnterpriseRegistryFullWidthPath } from "@/constants/enterprise-registry-workspace";
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

  useEffect(() => {
    purgeClientDemoBusinessDataIfNeeded();
  }, []);

  // CO-HOTFIX-006 — warm Enterprise Registry session cache from PostgreSQL for all workspaces.
  useEffect(() => {
    if (isEnterprisePersistencePrisma()) {
      void ensureEnterpriseRegistryHydrated();
    }
  }, []);

  // CO-PERF-002 — Tier-0 master warm (products + lenders) without blocking paint.
  useEffect(() => {
    void import("@/lib/enterprise-tier0-cache").then((m) => m.warmTier0EnterpriseCache());
  }, []);

  const isRegistryFullWidth = isEnterpriseRegistryFullWidthPath(pathname);
  const isRegistryDocumentScroll = isEnterpriseRegistryDocumentScrollPath(pathname);

  const isFullWidth =
    isRegistryFullWidth ||
    pathname.startsWith("/loan-files") ||
    pathname.startsWith("/deals") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/console") ||
    pathname.startsWith("/admin/credit-risk-engine") ||
    pathname.startsWith("/admin/architecture") ||
    pathname.startsWith("/admin/workflow-engine") ||
    pathname.startsWith("/admin/enterprise-assets") ||
    pathname === "/dashboard" ||
    pathname === "/chanakya-radar";

  const isLockedFillDesk =
    (isRegistryFullWidth && !isRegistryDocumentScroll) ||
    pathname.startsWith("/loan-files") ||
    pathname.startsWith("/deals") ||
    pathname.startsWith("/admin/credit-risk-engine");

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar onSearchClick={() => setOpen(true)} />
        <ContextNavigationPanel />
        <MobileNav />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AppTopbar onSearchClick={() => setOpen(true)} />
          <DevelopmentOnlyDemoBanner />
          <main
            className={cn(
              "min-h-0 flex-1 scrollbar-thin",
              isLockedFillDesk ? "overflow-hidden" : "overflow-y-auto",
            )}
          >
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className={cn(
                !isFullWidth && "container mx-auto max-w-7xl p-4 md:p-6 lg:p-8",
                isFullWidth &&
                  !isRegistryFullWidth &&
                  !pathname.startsWith("/loan-files") &&
                  !pathname.startsWith("/deals") &&
                  !pathname.startsWith("/admin/credit-risk-engine") &&
                  "mx-auto w-full max-w-none p-4 md:p-6 lg:p-8",
                isFullWidth &&
                  (pathname.startsWith("/loan-files") ||
                    pathname.startsWith("/deals") ||
                    pathname.startsWith("/admin/credit-risk-engine")) &&
                  "h-full max-w-none p-0 md:p-0 lg:p-0",
                /* CO-UX-DATAGRID-001 — registries: full width; shell owns 16–24px margins */
                /* CO-DOCS-BAT-001 / CO-ECM-NETWORK-UI-002 — document-scroll: content height, never h-full clip. */
                isRegistryFullWidth &&
                  cn(
                    "w-full max-w-none p-0 md:p-0 lg:p-0",
                    isRegistryDocumentScroll
                      ? "min-h-min overflow-visible"
                      : "h-full",
                  ),
                (pathname === "/dashboard" || pathname === "/chanakya-radar") &&
                  !isRegistryFullWidth &&
                  "mx-auto w-full max-w-none p-4 md:p-6 lg:p-8",
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
