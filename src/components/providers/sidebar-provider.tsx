"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ANIMATION, STORAGE_KEYS } from "@/constants/animations";

function readCollapsedState(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === "true";
}

function readExpandedGroups(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SIDEBAR_EXPANDED);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

interface SidebarContextValue {
  collapsed: boolean;
  mobileOpen: boolean;
  sidebarWidth: number;
  hydrated: boolean;
  toggle: () => void;
  setCollapsed: (value: boolean) => void;
  openMobile: () => void;
  closeMobile: () => void;
  isGroupExpanded: (key: string) => boolean;
  toggleGroup: (key: string) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

/** UX-02 — Global sidebar state (collapse + nav groups) shared across all modules. */
export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsedState(readCollapsedState());
    setExpandedGroups(readExpandedGroups());
    setHydrated(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.SIDEBAR_COLLAPSED) {
        setCollapsedState(event.newValue === "true");
      }
      if (event.key === STORAGE_KEYS.SIDEBAR_EXPANDED) {
        try {
          setExpandedGroups(event.newValue ? (JSON.parse(event.newValue) as string[]) : []);
        } catch {
          setExpandedGroups([]);
        }
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(value));
  }, []);

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(next));
      return next;
    });
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const isGroupExpanded = useCallback(
    (key: string) => (hydrated ? expandedGroups.includes(key) : false),
    [expandedGroups, hydrated],
  );

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_EXPANDED, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      collapsed: hydrated ? collapsed : false,
      mobileOpen,
      sidebarWidth: collapsed
        ? ANIMATION.sidebar.collapsed.width
        : ANIMATION.sidebar.expanded.width,
      hydrated,
      toggle,
      setCollapsed,
      openMobile,
      closeMobile,
      isGroupExpanded,
      toggleGroup,
    }),
    [
      collapsed,
      mobileOpen,
      hydrated,
      toggle,
      setCollapsed,
      openMobile,
      closeMobile,
      isGroupExpanded,
      toggleGroup,
    ],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebarContext(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebarContext must be used within SidebarProvider");
  }
  return ctx;
}
