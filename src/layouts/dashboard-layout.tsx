"use client";

import { motion } from "framer-motion";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { pageVariants } from "@/lib/animations";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { open, setOpen } = useCommandPalette();

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar onSearchClick={() => setOpen(true)} />
        <MobileNav />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppTopbar onSearchClick={() => setOpen(true)} />
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl"
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
