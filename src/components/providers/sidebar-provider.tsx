"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { ANIMATION, STORAGE_KEYS } from "@/constants/animations";
import { resolveContextKeyForPath } from "@/config/navigation";
import {
  isSidebarCollapseBlocked,
  isSidebarNavMode,
  SIDEBAR_AUTO_COLLAPSE_MS,
  SIDEBAR_PEEK_LEAVE_MS,
  type SidebarNavMode,
} from "@/constants/sidebar-navigation";

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

function readNavMode(): SidebarNavMode {
  if (typeof window === "undefined") return "auto";
  const raw = localStorage.getItem(STORAGE_KEYS.SIDEBAR_NAV_MODE);
  if (isSidebarNavMode(raw)) return raw;
  // Migrate legacy boolean preference once
  if (readBool(STORAGE_KEYS.SIDEBAR_COLLAPSED)) return "collapsed";
  return "auto";
}

function deriveCollapsed(
  mode: SidebarNavMode,
  autoIdleCollapsed: boolean,
  peekOpen: boolean,
  collapsedManualExpanded: boolean,
): boolean {
  if (mode === "expanded") return false;
  if (mode === "collapsed") return !collapsedManualExpanded;
  // auto
  if (peekOpen) return false;
  return autoIdleCollapsed;
}

interface SidebarContextValue {
  collapsed: boolean;
  mobileOpen: boolean;
  sidebarWidth: number;
  hydrated: boolean;
  /** Preferred navigation mode (persisted). */
  navMode: SidebarNavMode;
  setNavMode: (mode: SidebarNavMode) => void;
  /** Record interaction with the primary nav (resets Auto idle timer). */
  noteNavInteraction: () => void;
  /** Temporary expand while hovering edge / nav in Auto (or click peek). */
  setPeekOpen: (open: boolean) => void;
  peekOpen: boolean;
  /** Schedule collapse after leaving nav (Auto peek leave delay). */
  schedulePeekLeave: () => void;
  cancelPeekLeave: () => void;
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
  const [navMode, setNavModeState] = useState<SidebarNavMode>("auto");
  const [autoIdleCollapsed, setAutoIdleCollapsed] = useState(false);
  const [peekOpen, setPeekOpenState] = useState(false);
  const [collapsedManualExpanded, setCollapsedManualExpanded] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [activeContextKey, setActiveContextKeyState] = useState<string | null>(null);
  const [contextPanelCollapsed, setContextPanelCollapsedState] = useState(false);
  const [contextPanelPinned, setContextPanelPinnedState] = useState(false);
  const [manualContextClear, setManualContextClear] = useState(false);

  const lastNavInteractionRef = useRef(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navModeRef = useRef(navMode);
  navModeRef.current = navMode;

  const collapsed = deriveCollapsed(
    navMode,
    autoIdleCollapsed,
    peekOpen,
    collapsedManualExpanded,
  );

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const clearPeekLeave = useCallback(() => {
    if (peekLeaveTimerRef.current) {
      clearTimeout(peekLeaveTimerRef.current);
      peekLeaveTimerRef.current = null;
    }
  }, []);

  const clearBusyRetry = useCallback(() => {
    if (busyRetryRef.current) {
      clearTimeout(busyRetryRef.current);
      busyRetryRef.current = null;
    }
  }, []);

  const tryAutoCollapse = useCallback(() => {
    if (navModeRef.current !== "auto") return;
    if (isSidebarCollapseBlocked()) {
      clearBusyRetry();
      busyRetryRef.current = setTimeout(() => {
        tryAutoCollapse();
      }, 1500);
      return;
    }
    setPeekOpenState(false);
    setAutoIdleCollapsed(true);
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, "true");
  }, [clearBusyRetry]);

  const armIdleTimer = useCallback(() => {
    clearIdleTimer();
    if (navModeRef.current !== "auto") return;
    idleTimerRef.current = setTimeout(() => {
      tryAutoCollapse();
    }, SIDEBAR_AUTO_COLLAPSE_MS);
  }, [clearIdleTimer, tryAutoCollapse]);

  const noteNavInteraction = useCallback(() => {
    lastNavInteractionRef.current = Date.now();
    clearBusyRetry();
    if (navModeRef.current === "auto") {
      setAutoIdleCollapsed(false);
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, "false");
      armIdleTimer();
    }
  }, [armIdleTimer, clearBusyRetry]);

  const setPeekOpen = useCallback(
    (open: boolean) => {
      clearPeekLeave();
      setPeekOpenState(open);
      if (open) {
        noteNavInteraction();
      }
    },
    [clearPeekLeave, noteNavInteraction],
  );

  const schedulePeekLeaveRef = useRef<() => void>(() => {});

  const schedulePeekLeave = useCallback(() => {
    clearPeekLeave();
    if (navModeRef.current !== "auto") return;
    peekLeaveTimerRef.current = setTimeout(() => {
      if (isSidebarCollapseBlocked()) {
        clearPeekLeave();
        peekLeaveTimerRef.current = setTimeout(() => {
          schedulePeekLeaveRef.current();
        }, 1000);
        return;
      }
      setPeekOpenState(false);
    }, SIDEBAR_PEEK_LEAVE_MS);
  }, [clearPeekLeave]);

  schedulePeekLeaveRef.current = schedulePeekLeave;
  const cancelPeekLeave = useCallback(() => {
    clearPeekLeave();
  }, [clearPeekLeave]);

  useEffect(() => {
    const mode = readNavMode();
    setNavModeState(mode);
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_NAV_MODE, mode);
    if (mode === "collapsed") {
      setAutoIdleCollapsed(false);
      setCollapsedManualExpanded(false);
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, "true");
    } else if (mode === "expanded") {
      setAutoIdleCollapsed(false);
      setCollapsedManualExpanded(false);
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, "false");
    } else {
      // Auto starts expanded
      setAutoIdleCollapsed(false);
      setCollapsedManualExpanded(false);
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, "false");
    }
    setExpandedGroups(readExpandedGroups());
    setContextPanelCollapsedState(readBool(STORAGE_KEYS.CONTEXT_PANEL_COLLAPSED));
    setContextPanelPinnedState(readBool(STORAGE_KEYS.CONTEXT_PANEL_PINNED));
    const storedActive = localStorage.getItem(STORAGE_KEYS.CONTEXT_PANEL_ACTIVE);
    if (storedActive) setActiveContextKeyState(storedActive);
    setHydrated(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.SIDEBAR_NAV_MODE && isSidebarNavMode(event.newValue)) {
        setNavModeState(event.newValue);
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

  // Arm Auto idle timer after hydrate / mode changes
  useEffect(() => {
    if (!hydrated) return;
    if (navMode === "auto" && !autoIdleCollapsed) {
      armIdleTimer();
    } else {
      clearIdleTimer();
    }
    return () => clearIdleTimer();
  }, [hydrated, navMode, autoIdleCollapsed, armIdleTimer, clearIdleTimer]);

  useEffect(() => {
    return () => {
      clearIdleTimer();
      clearPeekLeave();
      clearBusyRetry();
    };
  }, [clearBusyRetry, clearIdleTimer, clearPeekLeave]);

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

  const setNavMode = useCallback(
    (mode: SidebarNavMode) => {
      setNavModeState(mode);
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_NAV_MODE, mode);
      setPeekOpenState(false);
      setCollapsedManualExpanded(false);
      clearPeekLeave();
      if (mode === "expanded") {
        setAutoIdleCollapsed(false);
        localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, "false");
      } else if (mode === "collapsed") {
        setAutoIdleCollapsed(false);
        localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, "true");
      } else {
        // Auto — start expanded, arm idle
        setAutoIdleCollapsed(false);
        localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, "false");
        lastNavInteractionRef.current = Date.now();
      }
    },
    [clearPeekLeave],
  );

  /** Legacy API — maps to mode / peek behaviour without changing callers. */
  const setCollapsed = useCallback(
    (value: boolean) => {
      if (navModeRef.current === "auto") {
        if (value) {
          setPeekOpenState(false);
          setAutoIdleCollapsed(true);
          localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, "true");
        } else {
          setAutoIdleCollapsed(false);
          setPeekOpenState(true);
          noteNavInteraction();
          localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, "false");
        }
        return;
      }
      if (navModeRef.current === "collapsed") {
        setCollapsedManualExpanded(!value);
        localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(value));
        return;
      }
      // expanded mode — requesting collapse switches preference to collapsed
      if (value) setNavMode("collapsed");
    },
    [noteNavInteraction, setNavMode],
  );

  const toggle = useCallback(() => {
    if (navModeRef.current === "expanded") {
      setNavMode("collapsed");
      return;
    }
    if (navModeRef.current === "collapsed") {
      setCollapsedManualExpanded((prev) => {
        const nextExpanded = !prev;
        localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(!nextExpanded));
        return nextExpanded;
      });
      return;
    }
    // auto
    if (deriveCollapsed(navModeRef.current, autoIdleCollapsed, peekOpen, false)) {
      setPeekOpen(true);
    } else {
      setPeekOpenState(false);
      setAutoIdleCollapsed(true);
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, "true");
    }
  }, [autoIdleCollapsed, peekOpen, setNavMode, setPeekOpen]);

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
      sidebarWidth: (hydrated ? collapsed : false)
        ? ANIMATION.sidebar.collapsed.width
        : ANIMATION.sidebar.expanded.width,
      hydrated,
      navMode: hydrated ? navMode : "auto",
      setNavMode,
      noteNavInteraction,
      setPeekOpen,
      peekOpen,
      schedulePeekLeave,
      cancelPeekLeave,
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
      navMode,
      setNavMode,
      noteNavInteraction,
      setPeekOpen,
      peekOpen,
      schedulePeekLeave,
      cancelPeekLeave,
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
