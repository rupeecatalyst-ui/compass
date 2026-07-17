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
import { usePathname } from "next/navigation";
import { ANIMATION, STORAGE_KEYS } from "@/constants/animations";
import { resolveContextKeyForPath } from "@/config/navigation";

function readBool(key: string, fallback = false): boolean {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "true";
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
  /** @deprecated Inline expand removed — retained for compatibility */
  isGroupExpanded: (key: string) => boolean;
  toggleGroup: (key: string) => void;
  ensureGroupExpanded: (key: string) => void;
  /** Enterprise Context Navigation — Column 2 */
  activeContextKey: string | null;
  setActiveContextKey: (key: string | null) => void;
  openContextDomain: (key: string) => void;
  clearContextDomain: () => void;
  contextPanelCollapsed: boolean;
  setContextPanelCollapsed: (value: boolean) => void;
  toggleContextPanel: () => void;
  contextPanelPinned: boolean;
  toggleContextPanelPin: () => void;
  contextPanelVisible: boolean;
  contextPanelWidth: number;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

/** UX — Global sidebar + Enterprise Context Navigation state. */
export function SidebarProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsedState] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [activeContextKey, setActiveContextKeyState] = useState<string | null>(null);
  const [contextPanelCollapsed, setContextPanelCollapsedState] = useState(false);
  const [contextPanelPinned, setContextPanelPinnedState] = useState(false);
  const [manualContextClear, setManualContextClear] = useState(false);

  useEffect(() => {
    setCollapsedState(readBool(STORAGE_KEYS.SIDEBAR_COLLAPSED));
    setExpandedGroups(readExpandedGroups());
    setContextPanelCollapsedState(readBool(STORAGE_KEYS.CONTEXT_PANEL_COLLAPSED));
    setContextPanelPinnedState(readBool(STORAGE_KEYS.CONTEXT_PANEL_PINNED));
    const storedActive = localStorage.getItem(STORAGE_KEYS.CONTEXT_PANEL_ACTIVE);
    if (storedActive) setActiveContextKeyState(storedActive);
    setHydrated(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.SIDEBAR_COLLAPSED) {
        setCollapsedState(event.newValue === "true");
      }
      if (event.key === STORAGE_KEYS.CONTEXT_PANEL_COLLAPSED) {
        setContextPanelCollapsedState(event.newValue === "true");
      }
      if (event.key === STORAGE_KEYS.CONTEXT_PANEL_PINNED) {
        setContextPanelPinnedState(event.newValue === "true");
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Sync context domain from route — one panel at a time
  useEffect(() => {
    if (!hydrated) return;
    const fromRoute = resolveContextKeyForPath(pathname);
    if (fromRoute) {
      setManualContextClear(false);
      setActiveContextKeyState(fromRoute);
      localStorage.setItem(STORAGE_KEYS.CONTEXT_PANEL_ACTIVE, fromRoute);
      return;
    }
    if (!manualContextClear && !contextPanelPinned) {
      setActiveContextKeyState(null);
      localStorage.removeItem(STORAGE_KEYS.CONTEXT_PANEL_ACTIVE);
    }
  }, [pathname, hydrated, manualContextClear, contextPanelPinned]);

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

  const ensureGroupExpanded = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_EXPANDED, JSON.stringify(next));
      return next;
    });
  }, []);

  const setActiveContextKey = useCallback((key: string | null) => {
    setActiveContextKeyState(key);
    if (key) {
      setManualContextClear(false);
      localStorage.setItem(STORAGE_KEYS.CONTEXT_PANEL_ACTIVE, key);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CONTEXT_PANEL_ACTIVE);
    }
  }, []);

  const openContextDomain = useCallback((key: string) => {
    setManualContextClear(false);
    setActiveContextKeyState(key);
    localStorage.setItem(STORAGE_KEYS.CONTEXT_PANEL_ACTIVE, key);
    // Opening a domain expands the panel unless user has it collapsed preference
    // but always show the panel for the selected domain
  }, []);

  const clearContextDomain = useCallback(() => {
    setManualContextClear(true);
    setActiveContextKeyState(null);
    localStorage.removeItem(STORAGE_KEYS.CONTEXT_PANEL_ACTIVE);
  }, []);

  const setContextPanelCollapsed = useCallback((value: boolean) => {
    setContextPanelCollapsedState(value);
    localStorage.setItem(STORAGE_KEYS.CONTEXT_PANEL_COLLAPSED, String(value));
  }, []);

  const toggleContextPanel = useCallback(() => {
    setContextPanelCollapsedState((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEYS.CONTEXT_PANEL_COLLAPSED, String(next));
      return next;
    });
  }, []);

  const toggleContextPanelPin = useCallback(() => {
    setContextPanelPinnedState((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEYS.CONTEXT_PANEL_PINNED, String(next));
      return next;
    });
  }, []);

  const contextPanelVisible = Boolean(activeContextKey);
  const contextPanelWidth = !contextPanelVisible
    ? 0
    : contextPanelCollapsed
      ? ANIMATION.contextPanel.collapsed.width
      : ANIMATION.contextPanel.expanded.width;

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
      ensureGroupExpanded,
      activeContextKey,
      setActiveContextKey,
      openContextDomain,
      clearContextDomain,
      contextPanelCollapsed: hydrated ? contextPanelCollapsed : false,
      setContextPanelCollapsed,
      toggleContextPanel,
      contextPanelPinned: hydrated ? contextPanelPinned : false,
      toggleContextPanelPin,
      contextPanelVisible,
      contextPanelWidth,
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
      ensureGroupExpanded,
      activeContextKey,
      setActiveContextKey,
      openContextDomain,
      clearContextDomain,
      contextPanelCollapsed,
      setContextPanelCollapsed,
      toggleContextPanel,
      contextPanelPinned,
      toggleContextPanelPin,
      contextPanelVisible,
      contextPanelWidth,
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
