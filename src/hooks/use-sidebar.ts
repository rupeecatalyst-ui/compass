"use client";

import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/constants/animations";

export function useSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
    if (stored !== null) {
      setCollapsed(stored === "true");
    }
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
    collapsed,
    mobileOpen,
    toggle,
    setCollapsed,
    openMobile,
    closeMobile,
  };
}
