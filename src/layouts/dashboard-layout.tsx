"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { pageVariants } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { open, setOpen } = useCommandPalette();
  const pathname = usePathname();
  const isFullWidth = pathname.startsWith("/loan-files");

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar onSearchClick={() => setOpen(true)} />
        <MobileNav />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppTopbar onSearchClick={() => setOpen(true)} />
          <main className={cn("flex-1 overflow-y-auto scrollbar-thin", isFullWidth && "overflow-hidden")}>
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className={cn(
                "container mx-auto p-4 md:p-6 lg:p-8",
                !isFullWidth && "max-w-7xl",
                isFullWidth && "max-w-none h-full p-0 md:p-0 lg:p-0",
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
