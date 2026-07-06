"use client";

import { useSidebarContext } from "@/components/providers/sidebar-provider";

/** Global sidebar nav-group expansion — shared via SidebarProvider (UX-02). */
export function useSidebarExpanded() {
  const { isGroupExpanded, toggleGroup } = useSidebarContext();

  return {
    isExpanded: isGroupExpanded,
    toggle: toggleGroup,
  };
}
