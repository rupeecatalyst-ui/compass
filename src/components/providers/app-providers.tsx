"use client";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SidebarProvider } from "@/components/providers/sidebar-provider";
import { GlobalChanakyaProvider } from "@/components/layout/global-chanakya-provider";
import { GlobalChanakyaDrawer } from "@/components/layout/global-chanakya-assistant";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <SidebarProvider>
            <GlobalChanakyaProvider>
              <TooltipProvider delayDuration={0}>
                {children}
                <GlobalChanakyaDrawer />
                <Toaster richColors closeButton position="top-right" />
              </TooltipProvider>
            </GlobalChanakyaProvider>
          </SidebarProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
