"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface GlobalChanakyaContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  openAssistant: () => void;
  closeAssistant: () => void;
}

const GlobalChanakyaContext = createContext<GlobalChanakyaContextValue | null>(null);

export function GlobalChanakyaProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openAssistant = useCallback(() => setOpen(true), []);
  const closeAssistant = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, setOpen, openAssistant, closeAssistant }),
    [open, openAssistant, closeAssistant],
  );

  return (
    <GlobalChanakyaContext.Provider value={value}>{children}</GlobalChanakyaContext.Provider>
  );
}

export function useGlobalChanakya(): GlobalChanakyaContextValue {
  const ctx = useContext(GlobalChanakyaContext);
  if (!ctx) {
    throw new Error("useGlobalChanakya must be used within GlobalChanakyaProvider");
  }
  return ctx;
}

/** Safe for chrome that may render outside provider (falls back to no-op). */
export function useOptionalGlobalChanakya(): GlobalChanakyaContextValue | null {
  return useContext(GlobalChanakyaContext);
}
