"use client";

import { useSidebarContext } from "@/components/providers/sidebar-provider";

/** Global sidebar collapse state — shared via SidebarProvider (UX-02 / CO-UX Auto-Collapse). */
export function useSidebar() {
  const {
    collapsed,
    mobileOpen,
    sidebarWidth,
    toggle,
    setCollapsed,
    openMobile,
    closeMobile,
    navMode,
    setNavMode,
    noteNavInteraction,
    setPeekOpen,
    peekOpen,
    schedulePeekLeave,
    cancelPeekLeave,
  } = useSidebarContext();

  return {
    collapsed,
    mobileOpen,
    toggle,
    setCollapsed,
    openMobile,
    closeMobile,
    sidebarWidth,
    navMode,
    setNavMode,
    noteNavInteraction,
    setPeekOpen,
    peekOpen,
    schedulePeekLeave,
    cancelPeekLeave,
  };
}
