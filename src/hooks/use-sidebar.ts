"use client";

import { useCallback, useEffect, useState } from "react";
import { ANIMATION, STORAGE_KEYS } from "@/constants/animations";

function readCollapsedState(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === "true";
}

export function useSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsedState());
    setHydrated(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(next));
      return next;
    });
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return {
    collapsed: hydrated ? collapsed : false,
    mobileOpen,
    toggle,
    setCollapsed,
    openMobile,
    closeMobile,
    sidebarWidth: collapsed ? ANIMATION.sidebar.collapsed.width : ANIMATION.sidebar.expanded.width,
  };
}
