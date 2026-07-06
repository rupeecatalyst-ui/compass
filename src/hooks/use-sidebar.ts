"use client";

import { useSidebarContext } from "@/components/providers/sidebar-provider";

/** Global sidebar collapse state — shared via SidebarProvider (UX-02). */
export function useSidebar() {
  const {
    collapsed,
    mobileOpen,
    sidebarWidth,
    toggle,
    setCollapsed,
    openMobile,
    closeMobile,
  } = useSidebarContext();

  return {
    collapsed,
    mobileOpen,
    toggle,
    setCollapsed,
    openMobile,
    closeMobile,
    sidebarWidth,
  };
}
