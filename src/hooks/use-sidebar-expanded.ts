"use client";

import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/constants/animations";

function readExpanded(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SIDEBAR_EXPANDED);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function useSidebarExpanded() {
  const [expanded, setExpanded] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setExpanded(readExpanded());
    setHydrated(true);
  }, []);

  const isExpanded = useCallback(
    (key: string) => (hydrated ? expanded.includes(key) : false),
    [expanded, hydrated],
  );

  const toggle = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_EXPANDED, JSON.stringify(next));
      return next;
    });
  }, []);

  return { isExpanded, toggle };
}
